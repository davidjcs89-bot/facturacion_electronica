import { registrarUsoVoz } from '../usoVoz';
import 'server-only';
import { sql } from '../db';
import { ID_CONSUMIDOR_FINAL } from '../constantes';

/**
 * Facturación por voz: convierte lo dictado en un borrador de factura con ayuda de Claude.
 * Claude solo elige entre clientes, productos y formas de pago de la propia empresa (candidatos que
 * busca la base); no inventa datos. Nada se guarda ni se envía al SRI aquí.
 */

export type OpcionProducto = { id: number; codigo: string; nombre: string; pvp: number; stock: number | null };
export type OpcionCliente = { id: number; nombre: string; identificacion: string; correo: string | null };

export type LineaVoz = {
  dicho: string;
  producto_id: number | null;
  cantidad: number;
  /** precio unitario CON IVA si se dictó un precio distinto al de lista; null = precio de lista */
  precio_con_iva: number | null;
  descuento_pct: number;
  opciones: OpcionProducto[];
};

export type ClienteVoz = {
  dicho: string;
  id: number | null;
  /** cliente nuevo dictado (se crea al emitir) */
  nuevo: { nombre: string; identificacion: string; correo: string | null } | null;
  opciones: OpcionCliente[];
};

export type BorradorVoz = {
  cliente: ClienteVoz;
  lineas: LineaVoz[];
  forma_pago_id: number | null;
  pregunta: string | null;
  /** todo lo que se ha dictado, en orden */
  dictados: string[];
};

const MODELO = 'claude-haiku-5-5';

/** Palabras útiles para buscar en la base (sin las muy comunes) */
function palabras(texto: string): string[] {
  const comunes = new Set(['factura', 'facturar', 'para', 'pago', 'con', 'una', 'uno', 'unos', 'unas', 'dos', 'tres', 'cuatro', 'cinco',
    'seis', 'siete', 'ocho', 'nueve', 'diez', 'del', 'los', 'las', 'que', 'por', 'sin', 'cliente', 'tarjeta', 'efectivo',
    'transferencia', 'credito', 'debito', 'dolares', 'precio', 'descuento', 'consumidor', 'final', 'cedula', 'ruc', 'correo']);
  return [...new Set(texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) ?? [])]
    .filter((w) => !comunes.has(w))
    .slice(0, 25);
}

async function candidatosProductos(emisorId: number, texto: string): Promise<OpcionProducto[]> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int n from producto where id_emisor = ${emisorId}`;
  const base = sql`
    select p.id, p.codigo, p.nombre, round(p.precio * (1 + iva.porcentaje / 100), 2)::float pvp,
      (select sum(stock) from productos_x_bodega x where x.id_producto = p.id)::float stock
    from producto p join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where p.id_emisor = ${emisorId}`;
  if (n <= 400) return sql<OpcionProducto[]>`${base} order by p.nombre`;
  const ws = palabras(texto);
  if (!ws.length) return [];
  const filtros = ws.map((w) => sql`(unaccent(p.nombre) ilike ${'%' + w + '%'} or p.codigo ilike ${w + '%'})`);
  const donde = filtros.reduce((a, b) => sql`${a} or ${b}`);
  return sql<OpcionProducto[]>`${base} and (${donde}) order by p.nombre limit 150`.catch(async () => {
    // sin extension unaccent
    const f2 = ws.map((w) => sql`(p.nombre ilike ${'%' + w + '%'} or p.codigo ilike ${w + '%'})`).reduce((a, b) => sql`${a} or ${b}`);
    return sql<OpcionProducto[]>`${base} and (${f2}) order by p.nombre limit 150`;
  });
}

async function candidatosClientes(emisorId: number, texto: string): Promise<OpcionCliente[]> {
  const ws = palabras(texto).filter((w) => !/^\d+$/.test(w) || w.length >= 6);
  const numeros = texto.replace(/\s+/g, '').match(/\d{10,13}/g) ?? [];
  if (!ws.length && !numeros.length) return [];
  const filtros = [
    ...ws.map((w) => sql`c.nombre_cliente ilike ${'%' + w + '%'}`),
    ...numeros.map((d) => sql`c.identificacion = ${d}`),
  ].reduce((a, b) => sql`${a} or ${b}`);
  return sql<OpcionCliente[]>`
    select c.id, c.nombre_cliente nombre, c.identificacion, c.correo
    from clientes c
    where c.id_emisor = ${emisorId} and c.id <> ${ID_CONSUMIDOR_FINAL} and c.tipo_cliente = 1 and (${filtros})
    order by c.nombre_cliente limit 25`;
}

async function formasDePago() {
  return sql<{ id: number; descripcion_form_pago: string }[]>`select id, descripcion_form_pago from formas_de_pago order by id`;
}

const ESQUEMA = {
  type: 'object',
  properties: {
    cliente: {
      type: 'object',
      properties: {
        dicho: { type: 'string', description: 'Cómo nombró la persona al cliente (vacío si no lo nombró)' },
        id: { type: ['integer', 'null'], description: 'id del cliente elegido de la lista, 1 = Consumidor Final, null si no está claro' },
        opciones: { type: 'array', items: { type: 'integer' }, description: 'ids posibles si hay varios parecidos' },
        nuevo: {
          type: ['object', 'null'],
          properties: { nombre: { type: 'string' }, identificacion: { type: 'string' }, correo: { type: ['string', 'null'] } },
          description: 'Solo si dictó un cliente que NO está en la lista y dio su cédula/RUC',
        },
      },
      required: ['dicho', 'id', 'opciones', 'nuevo'],
    },
    lineas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dicho: { type: 'string', description: 'Cómo nombró el producto' },
          producto_id: { type: ['integer', 'null'], description: 'id del producto de la lista; null si hay varios posibles o ninguno' },
          opciones: { type: 'array', items: { type: 'integer' }, description: 'ids posibles cuando hay varios parecidos (máx. 6)' },
          cantidad: { type: 'number' },
          precio_con_iva: { type: ['number', 'null'], description: 'Solo si dictó un precio unitario distinto; con IVA' },
          descuento_pct: { type: 'number', description: '0 si no dictó descuento' },
        },
        required: ['dicho', 'producto_id', 'opciones', 'cantidad', 'precio_con_iva', 'descuento_pct'],
      },
    },
    forma_pago_id: { type: ['integer', 'null'] },
    pregunta: { type: ['string', 'null'], description: 'Una sola pregunta corta, en español, sobre lo que falte o no esté claro; null si todo está claro' },
  },
  required: ['cliente', 'lineas', 'forma_pago_id', 'pregunta'],
};

type Salida = {
  cliente: { dicho: string; id: number | null; opciones: number[]; nuevo: ClienteVoz['nuevo'] };
  lineas: { dicho: string; producto_id: number | null; opciones: number[]; cantidad: number; precio_con_iva: number | null; descuento_pct: number }[];
  forma_pago_id: number | null;
  pregunta: string | null;
};

/** Interpreta un dictado nuevo (o una respuesta/corrección sobre un borrador previo) */
export async function interpretarDictado(emisorId: number, dictado: string, previo: BorradorVoz | null): Promise<BorradorVoz> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) throw new Error('La facturación por voz no está configurada (falta la clave de Claude)');
  const todo = [...(previo?.dictados ?? []), dictado].join(' . ');
  const [productos, clientesCand, formas] = await Promise.all([
    candidatosProductos(emisorId, todo),
    candidatosClientes(emisorId, todo),
    formasDePago(),
  ]);
  // los productos y clientes ya elegidos en el borrador previo siempre van en la lista
  const idsPrevios = new Set((previo?.lineas ?? []).flatMap((l) => [l.producto_id, ...l.opciones.map((o) => o.id)]).filter(Boolean) as number[]);
  const faltan = [...idsPrevios].filter((id) => !productos.some((p) => p.id === id));
  if (faltan.length) {
    const extra = await sql<OpcionProducto[]>`
      select p.id, p.codigo, p.nombre, round(p.precio * (1 + iva.porcentaje / 100), 2)::float pvp,
        (select sum(stock) from productos_x_bodega x where x.id_producto = p.id)::float stock
      from producto p join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
      where p.id_emisor = ${emisorId} and p.id in ${sql(faltan)}`;
    productos.push(...extra);
  }
  const clientes = [...clientesCand];
  for (const o of previo?.cliente.opciones ?? []) if (!clientes.some((c) => c.id === o.id)) clientes.push(o);

  const sistema = `Eres el asistente de facturación electrónica (Ecuador, SRI) de una tienda. Conviertes lo que dicta el vendedor
en un borrador de factura usando SOLO los clientes, productos y formas de pago de las listas. Reglas:
- Elige el cliente por nombre o cédula/RUC. Si dice "consumidor final", usa id 1 (Consumidor Final). Si no nombra cliente, deja id = null
  (o conserva el del borrador previo); la app se lo preguntará.
- Si dicta una cédula o RUC, búscalo primero en la lista de clientes por identificación. Un RUC son 10 dígitos + "001"
  (el dictado puede venir partido: "0195133816, 001" = RUC 0195133816001).
- Si nombra un cliente que no está en la lista: cliente.id = null y, si dictó su cédula (10 dígitos) o RUC (13 dígitos), llena "nuevo".
  NUNCA inventes el nombre: si no lo dijo, nuevo.nombre = "" y pregunta el nombre;
  si no dio la identificación, pregunta por ella.
- Para cada producto dictado busca el más parecido (el vendedor habla rápido y el reconocimiento de voz se equivoca en letras).
  Si hay varios igual de probables (colores, tallas, variantes), producto_id = null y pon hasta 6 ids en "opciones".
  Si solo un producto encaja con lo dicho, elígelo directamente (no preguntes por él). Un cliente nuevo con su identificación no necesita confirmación.
- "dos blusas" = cantidad 2. Si dicta un precio ("a diez dólares") va en precio_con_iva. Un descuento ("10 por ciento") en descuento_pct.
- Forma de pago: elige la más parecida ("tarjeta" de débito o crédito según lo dicho; "efectivo" = SIN UTILIZACION DEL SISTEMA FINANCIERO;
  "transferencia" = OTROS CON UTILIZACION DEL SISTEMA FINANCIERO). Si no la dijo, null.
- Si recibes un BORRADOR PREVIO, su "pregunta" es lo que la app acaba de preguntar y el último dictado es la respuesta o una corrección
  (p. ej. pregunta "¿Cómo paga?" y responde "tarjeta" → forma de pago; pregunta "¿Qué productos lleva?" y responde "dos blusas" → líneas): conserva lo que ya estaba resuelto y cambia solo lo que corrige
  ("la negra" elige entre las opciones; "quita los aretes" elimina esa línea; "agrega..." suma líneas).
- "pregunta": una sola pregunta corta sobre lo más importante que falte (cliente, producto ambiguo, forma de pago). null si todo está claro.
Responde siempre con la herramienta "borrador".`;

  const contenido = [
    `CLIENTES POSIBLES (id | nombre | identificación):\n1 | CONSUMIDOR FINAL | 9999999999999\n${clientes.map((c) => `${c.id} | ${c.nombre} | ${c.identificacion}`).join('\n') || '(ninguno encontrado)'}`,
    `PRODUCTOS (id | código | nombre | precio con IVA | stock):\n${productos.map((p) => `${p.id} | ${p.codigo} | ${p.nombre} | ${p.pvp} | ${p.stock ?? ''}`).join('\n') || '(ninguno encontrado)'}`,
    `FORMAS DE PAGO (id | nombre):\n${formas.map((f) => `${f.id} | ${f.descripcion_form_pago}`).join('\n')}`,
    previo
      ? `BORRADOR PREVIO:\n${JSON.stringify({ cliente: { id: previo.cliente.id, nuevo: previo.cliente.nuevo, opciones: previo.cliente.opciones.map((o) => o.id) }, lineas: previo.lineas.map((l) => ({ dicho: l.dicho, producto_id: l.producto_id, opciones: l.opciones.map((o) => o.id), cantidad: l.cantidad, precio_con_iva: l.precio_con_iva, descuento_pct: l.descuento_pct })), forma_pago_id: previo.forma_pago_id, pregunta: previo.pregunta })}\n\nDICTADOS ANTERIORES: ${previo.dictados.join(' / ')}`
      : '',
    `DICTADO: ${dictado}`,
  ].filter(Boolean).join('\n\n');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1500,
      system: sistema,
      tools: [{ name: 'borrador', description: 'Borrador de la factura', input_schema: ESQUEMA }],
      tool_choice: { type: 'tool', name: 'borrador' },
      messages: [{ role: 'user', content: contenido }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const j = (await r.json().catch(() => ({}))) as { content?: { type: string; input?: Salida }[]; error?: { message: string }; usage?: { input_tokens?: number; output_tokens?: number } };
  if (r.ok) await registrarUsoVoz({ emisor: emisorId, tipo: 'claude', entrada: j.usage?.input_tokens, salida: j.usage?.output_tokens });
  if (!r.ok) throw new Error(`No se pudo interpretar el dictado (${j.error?.message ?? r.status})`);
  const s = j.content?.find((c) => c.type === 'tool_use')?.input;
  if (!s) throw new Error('No se pudo interpretar el dictado');

  // Solo se aceptan ids de las listas enviadas (nunca datos inventados)
  const prod = new Map(productos.map((p) => [p.id, p]));
  const cli = new Map(clientes.map((c) => [c.id, c]));
  const clienteId = s.cliente.id === ID_CONSUMIDOR_FINAL || (s.cliente.id && cli.has(s.cliente.id)) ? s.cliente.id : null;
  // Identificación: el reconocimiento de voz suele partir el RUC ("0195133816, 001"): si lo dictado continúa con 001, es RUC
  let ident = (s.cliente.nuevo?.identificacion ?? '').replace(/\D/g, '');
  const soloDigitos = [...(previo?.dictados ?? []), dictado].join(' ').replace(/[^\d]/g, '');
  if (ident.length === 10 && soloDigitos.includes(ident + '001')) ident += '001';
  // Nunca inventar el nombre: si no lo dijo, queda vacío y la app lo pide
  const nombreNuevo = (s.cliente.nuevo?.nombre ?? '').trim();
  const nombreValido = nombreNuevo.length >= 3 && !/unknown|desconocid|sin nombre|no especificad|n\/a|^<.*>$/i.test(nombreNuevo) ? nombreNuevo.toUpperCase() : '';
  const nuevo = !clienteId && (ident.length === 10 || ident.length === 13)
    ? { nombre: nombreValido, identificacion: ident, correo: s.cliente.nuevo?.correo || null }
    : null;
  return {
    cliente: {
      dicho: s.cliente.dicho ?? '',
      id: clienteId,
      nuevo,
      opciones: (s.cliente.opciones ?? []).map((id) => cli.get(id)).filter(Boolean).slice(0, 6) as OpcionCliente[],
    },
    lineas: (s.lineas ?? [])
      .map((l) => ({
        dicho: l.dicho ?? '',
        producto_id: l.producto_id && prod.has(l.producto_id) ? l.producto_id : null,
        cantidad: Math.max(1, Math.round(Number(l.cantidad) || 1)),
        precio_con_iva: l.precio_con_iva != null && Number(l.precio_con_iva) > 0 ? Number(l.precio_con_iva) : null,
        descuento_pct: Math.min(100, Math.max(0, Number(l.descuento_pct) || 0)),
        opciones: (l.opciones ?? []).map((id) => prod.get(id)).filter(Boolean).slice(0, 6) as OpcionProducto[],
      }))
      .map((l) => (!l.producto_id && l.opciones.length === 1 ? { ...l, producto_id: l.opciones[0].id } : l))
      .map((l) => ({ ...l, opciones: l.producto_id ? [prod.get(l.producto_id)!, ...l.opciones.filter((o) => o.id !== l.producto_id)].slice(0, 6) : l.opciones })),
    forma_pago_id: s.forma_pago_id && formas.some((f) => f.id === s.forma_pago_id) ? s.forma_pago_id : null,
    pregunta: s.pregunta || null,
    dictados: [...(previo?.dictados ?? []), dictado],
  };
}
