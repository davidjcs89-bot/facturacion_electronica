import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, dec, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante, DatosAutorizacion } from './tipos';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide, clienteXml } from './comun';
import { r2, IVA_CERO, NO_OBJETO_IVA, EXENTO_IVA } from './calculos';
import { money } from '../formato';

export type NotaDebitoBD = {
  id: number; id_emisior: number; id_cliente: number; numero: string; clave_acceso: string; fecha_emision: Date;
  numero_factura_modifica: string; fecha_factura_modifica: Date; id_factura_modifica: number; id_punto_emision: number;
  estado: number; subtotal_sin_impuestos: number; subtotal_iva: number; subtotal_iva_cero: number;
  subtotal_no_objeto_iva: number; subtotal_excento_iva: number; valor_iva: number; valor_ice: number; total: number;
  id_porcentaje_iva: number; fecha_autorizacion: Date | null; dir_establecimiento: string;
  iva_codigo: string; iva_pct: number; iva_descripcion: string;
};

export async function cargarNotaDebito(id: number) {
  const [n] = await sql<NotaDebitoBD[]>`
    select n.*, p.direccion dir_establecimiento, iva.codigo iva_codigo, iva.porcentaje iva_pct, iva.descripcion iva_descripcion
    from nota_debito n
    join puntos_emisior p on p.id = n.id_punto_emision
    join porcentaje_impuesto_producto iva on iva.id = n.id_porcentaje_iva
    where n.id = ${id}`;
  if (!n) throw new Error('Nota de débito no encontrada');
  const motivos = await sql<{ id: number; razon_modificacion: string; valor_modificacion: number }[]>`
    select id, razon_modificacion, valor_modificacion from detalle_nota_debito where id_nota_debito = ${id} order by id`;
  const pagos = await sql<{ id: number; codigo: string; descripcion: string; valor: number; plazo: number | null; timpo: string | null }[]>`
    select d.id, fp.codigo, fp.descripcion_form_pago descripcion, d.valor, d.plazo, d.timpo
    from detalle_pago_nota_debito d join formas_de_pago fp on fp.id = d.id_forma_pago
    where d.id_nota_debito = ${id} order by d.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_nota_debito where id_nota_debito = ${id} order by id`;
  return { n, motivos, pagos, adicionales };
}

/** Recalcula subtotales e IVA de la nota de debito segun sus motivos y el IVA elegido */
export async function recalcularNotaDebito(id: number) {
  const [n] = await sql<{ id_porcentaje_iva: number; pct: number }[]>`
    select n.id_porcentaje_iva, iva.porcentaje pct from nota_debito n
    join porcentaje_impuesto_producto iva on iva.id = n.id_porcentaje_iva where n.id = ${id}`;
  const [s] = await sql<{ sub: number }[]>`
    select coalesce(sum(valor_modificacion), 0) sub from detalle_nota_debito where id_nota_debito = ${id}`;
  const sub = Number(s.sub);
  const pct = Number(n.pct);
  const t = {
    subtotal_sin_impuestos: sub,
    subtotal_iva: pct > 0 ? sub : 0,
    subtotal_iva_cero: pct === 0 && n.id_porcentaje_iva !== NO_OBJETO_IVA && n.id_porcentaje_iva !== EXENTO_IVA ? sub : 0,
    subtotal_no_objeto_iva: n.id_porcentaje_iva === NO_OBJETO_IVA ? sub : 0,
    subtotal_excento_iva: n.id_porcentaje_iva === EXENTO_IVA ? sub : 0,
    valor_iva: pct > 0 ? r2(sub * pct / 100) : 0,
    total: 0,
  };
  t.total = r2(sub + t.valor_iva);
  await sql`update nota_debito set ${sql(t)}, fecha_modificacion = now() at time zone 'America/Guayaquil' where id = ${id}`;
  // Si hay un solo pago, se ajusta al nuevo total
  await sql`
    update detalle_pago_nota_debito set valor = ${t.total}
    where id_nota_debito = ${id} and (select count(*) from detalle_pago_nota_debito where id_nota_debito = ${id}) = 1`;
}

async function construirXml(id: number): Promise<string> {
  const { n, motivos, pagos, adicionales } = await cargarNotaDebito(id);
  const e = await datosEmisor(n.id_emisior);
  const c = await clienteXml(n.id_cliente);
  const base =
    Number(n.subtotal_iva) || Number(n.subtotal_iva_cero) || Number(n.subtotal_no_objeto_iva) || Number(n.subtotal_excento_iva);
  return el(
    'notaDebito',
    { id: 'comprobante', version: '1.0.0' },
    infoTributaria(e, n.clave_acceso, '05', n.numero),
    el(
      'infoNotaDebito',
      null,
      t('fechaEmision', fechaSRI(n.fecha_emision)),
      t('dirEstablecimiento', limpiar(n.dir_establecimiento)),
      t('tipoIdentificacionComprador', c.codigo_tipo),
      t('razonSocialComprador', limpiar(c.nombre_cliente)),
      t('identificacionComprador', c.identificacion),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      t('codDocModificado', '01'),
      t('numDocModificado', n.numero_factura_modifica),
      t('fechaEmisionDocSustento', fechaSRI(n.fecha_factura_modifica)),
      t('totalSinImpuestos', dec(n.subtotal_sin_impuestos)),
      el(
        'impuestos',
        null,
        el(
          'impuesto',
          null,
          t('codigo', '2'),
          t('codigoPorcentaje', n.iva_codigo),
          t('tarifa', dec(n.iva_pct)),
          t('baseImponible', dec(base)),
          t('valor', dec(n.valor_iva)),
        ),
      ),
      t('valorTotal', dec(n.total)),
      pagos.length ? el('pagos', null, pagos.map((p) => el('pago', null, t('formaPago', p.codigo), t('total', dec(p.valor))))) : '',
    ),
    el(
      'motivos',
      null,
      motivos.map((m) => el('motivo', null, t('razon', limpiar(m.razon_modificacion)), t('valor', dec(m.valor_modificacion)))),
    ),
    infoAdicional(adicionales),
  );
}

async function modeloRide(id: number, aut: DatosAutorizacion) {
  const { n, motivos, pagos, adicionales } = await cargarNotaDebito(id);
  const e = await datosEmisor(n.id_emisior);
  const c = await clienteXml(n.id_cliente);
  const pct = Number(n.iva_pct);
  const ad: [string, string][] = adicionales.map((a) => [a.nombre, a.descripcion]);
  if (c.correo && !ad.some(([x]) => /mail|correo/i.test(x))) ad.push(['Email', c.correo.toLowerCase()]);
  return {
    titulo: 'NOTA DE DÉBITO',
    numero: n.numero,
    claveAcceso: n.clave_acceso,
    numeroAutorizacion: aut.numeroAutorizacion ?? n.clave_acceso,
    fechaAutorizacion: aut.fechaAutorizacion,
    ambiente: nombreAmbiente(n.clave_acceso.charAt(23) || e.codigo_ambiente),
    emisor: emisorRide(e, n.dir_establecimiento),
    receptor: [
      ['Razón Social / Nombres y Apellidos', c.nombre_cliente],
      ['Identificación', c.identificacion],
      ['Fecha Emisión', fechaSRI(n.fecha_emision)],
      ['Comprobante que se modifica', `FACTURA ${n.numero_factura_modifica}`],
      ['Fecha emisión (comprobante a modificar)', fechaSRI(n.fecha_factura_modifica)],
    ] as [string, string][],
    tablas: [
      {
        columnas: [
          { titulo: 'Razón de la modificación', ancho: 80 },
          { titulo: 'Valor de la modificación', ancho: 20, alin: 'der' as const },
        ],
        filas: motivos.map((m) => [m.razon_modificacion, money(m.valor_modificacion)]),
      },
    ],
    adicionales: ad,
    pagos: pagos.map((p) => [p.descripcion, money(p.valor)] as [string, string]),
    totales: [
      [pct > 0 ? `SUBTOTAL ${pct}%` : 'SUBTOTAL CON IVA', money(n.subtotal_iva)],
      ['SUBTOTAL 0%', money(n.subtotal_iva_cero)],
      ['SUBTOTAL NO OBJETO DE IVA', money(n.subtotal_no_objeto_iva)],
      ['SUBTOTAL EXENTO DE IVA', money(n.subtotal_excento_iva)],
      ['SUBTOTAL SIN IMPUESTOS', money(n.subtotal_sin_impuestos)],
      [pct > 0 ? `IVA ${pct}%` : 'IVA', money(n.valor_iva)],
      ['VALOR TOTAL', money(n.total)],
    ] as [string, string][],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string; total: number }[]>`
    select c.correo, c.nombre_cliente receptor, n.numero, n.total
    from nota_debito n join clientes c on c.id = n.id_cliente where n.id = ${id}`;
  return r;
}

export const notaDebito: ManejadorComprobante = {
  tipoDoc: 4,
  codDoc: '05',
  nombre: 'Nota de débito',
  tabla: 'nota_debito',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisior',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/notas-debito',
  construirXml,
  modeloRide,
  datosCorreo,
};

export { IVA_CERO };
