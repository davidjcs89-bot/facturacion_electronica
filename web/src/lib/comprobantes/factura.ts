import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, dec, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante } from './tipos';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide, clienteXml } from './comun';
import { IVA_CERO, NO_OBJETO_IVA, EXENTO_IVA } from './calculos';
import { money } from '../formato';

type FacturaBD = {
  id: number; id_emisor: number; id_cliente: number; numero: string; clave_de_acceso: string; fecha_emision: Date;
  guia_de_remision: string | null; subtotal_sin_impuestos: number; subtotal_iva: number; subtotal_iva_cero: number;
  subtotal_no_objeto_iva: number; subtotal_excento_iva: number; total_descuento: number; valor_iva: number;
  valor_ice: number; valor_irbpnr: number; propina: number; total: number; estado: number; dir_establecimiento: string;
  id_punto_emison: number; es_mayorista: boolean; fecha_autorizacion: Date | null;
};

type DetalleBD = {
  id: number; codigo: string; codigo_auxiliar: string | null; nombre: string; adicional: string | null; cantidad: number;
  precio_unitario: number; descuento: number; sub_total: number; valor_iva: number; valor_ice: number; valor_irbpnr: number;
  total: number; decuento_porcentaje: number; iva_id: number; iva_codigo: string; iva_pct: number; ice_codigo: string; ice_pct: number;
  irbpnr_codigo: string; irbpnr_pct: number;
};

export async function cargarFactura(id: number) {
  const [f] = await sql<FacturaBD[]>`
    select f.*, p.direccion dir_establecimiento
    from factura f join puntos_emisior p on p.id = f.id_punto_emison
    where f.id = ${id}`;
  if (!f) throw new Error('Factura no encontrada');
  const detalles = await sql<DetalleBD[]>`
    select d.id, p.codigo, p.codigo_auxiliar, p.nombre, d.adicional, d.cantidad, d.precio_unitario, d.descuento, d.sub_total, d.decuento_porcentaje,
           d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total,
           iva.id iva_id, iva.codigo iva_codigo, iva.porcentaje iva_pct,
           ice.codigo ice_codigo, ice.porcentaje ice_pct, irb.codigo irbpnr_codigo, irb.porcentaje irbpnr_pct
    from detalle_factura d
    join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where d.id_factura = ${id}
    order by d.id`;
  const pagos = await sql<{ id: number; codigo: string; descripcion: string; valor: number; plazo: number | null; timpo: string | null }[]>`
    select d.id, fp.codigo, fp.descripcion_form_pago descripcion, d.valor, d.plazo, d.timpo
    from detalle_pago_factura d join formas_de_pago fp on fp.id = d.id_form_pago
    where d.id_factura = ${id} order by d.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_factura where id_factura = ${id} order by id`;
  return { f, detalles, pagos, adicionales };
}

/** Descripcion de la linea: si el producto se llama REFERENCIA se usa el texto adicional (igual que la app anterior) */
function descripcionLinea(d: DetalleBD) {
  return d.nombre.trim().toUpperCase() === 'REFERENCIA' && d.adicional ? d.adicional : d.nombre;
}

/** Recalcula los totales de la factura a partir de sus lineas (y ajusta el pago unico si existe) */
export async function recalcularFactura(id: number) {
  await sql`
    with t as (
      select
        coalesce(sum(d.sub_total), 0) sub,
        coalesce(sum(d.sub_total) filter (where d.valor_iva > 0), 0) sub_iva,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva not in (${NO_OBJETO_IVA}, ${EXENTO_IVA})), 0) sub_cero,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva = ${NO_OBJETO_IVA}), 0) sub_no_obj,
        coalesce(sum(d.sub_total) filter (where d.valor_iva = 0 and p.codigo_iva = ${EXENTO_IVA}), 0) sub_exento,
        coalesce(sum(d.sub_total) filter (where d.valor_ice > 0), 0) sub_ice,
        coalesce(sum(d.sub_total) filter (where d.valor_irbpnr > 0), 0) sub_irbpnr,
        coalesce(sum(d.valor_iva), 0) iva, coalesce(sum(d.valor_ice), 0) ice, coalesce(sum(d.valor_irbpnr), 0) irbpnr,
        coalesce(sum(d.descuento), 0) descuento, coalesce(sum(d.total), 0) total
      from detalle_factura d join producto p on p.id = d.id_producto
      where d.id_factura = ${id}
    )
    update factura f set
      subtotal_sin_impuestos = t.sub, subtotal_iva = t.sub_iva, subtotal_iva_cero = t.sub_cero,
      subtotal_no_objeto_iva = t.sub_no_obj, subtotal_excento_iva = t.sub_exento, subtotal_ice = t.sub_ice,
      subtotal_irbpnr = t.sub_irbpnr, valor_iva = t.iva, valor_ice = t.ice, valor_irbpnr = t.irbpnr,
      total_descuento = t.descuento, total = t.total + f.propina,
      fecha_modificacion = now() at time zone 'America/Guayaquil'
    from t where f.id = ${id}`;
  // Si hay un solo pago, se ajusta al nuevo total
  await sql`
    update detalle_pago_factura d set valor = f.total
    from factura f
    where d.id_factura = f.id and f.id = ${id}
      and (select count(*) from detalle_pago_factura where id_factura = ${id}) = 1`;
}

async function construirXml(id: number): Promise<string> {
  const { f, detalles, pagos, adicionales } = await cargarFactura(id);
  const e = await datosEmisor(f.id_emisor);
  const c = await clienteXml(f.id_cliente);

  // Totales por impuesto agrupados por codigo de porcentaje
  const grupos = new Map<string, { codigo: string; codigoPorcentaje: string; base: number; valor: number }>();
  const sumar = (codigo: string, codPct: string, base: number, valor: number) => {
    const k = `${codigo}-${codPct}`;
    const g = grupos.get(k) ?? { codigo, codigoPorcentaje: codPct, base: 0, valor: 0 };
    g.base += base;
    g.valor += valor;
    grupos.set(k, g);
  };
  for (const d of detalles) {
    sumar('2', d.iva_codigo, Number(d.sub_total) + Number(d.valor_ice), Number(d.valor_iva));
    if (Number(d.valor_ice) > 0) sumar('3', d.ice_codigo, Number(d.sub_total), Number(d.valor_ice));
    if (Number(d.valor_irbpnr) > 0) sumar('5', d.irbpnr_codigo, Number(d.sub_total), Number(d.valor_irbpnr));
  }

  const guia = f.guia_de_remision && /^\d{3}-\d{3}-\d{9}$/.test(f.guia_de_remision) ? f.guia_de_remision : null;
  const xml = el(
    'factura',
    { id: 'comprobante', version: '1.1.0' },
    infoTributaria(e, f.clave_de_acceso, '01', f.numero),
    el(
      'infoFactura',
      null,
      t('fechaEmision', fechaSRI(f.fecha_emision)),
      t('dirEstablecimiento', limpiar(f.dir_establecimiento)),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      t('tipoIdentificacionComprador', c.codigo_tipo),
      guia ? t('guiaRemision', guia) : '',
      t('razonSocialComprador', limpiar(c.nombre_cliente)),
      t('identificacionComprador', c.identificacion),
      t('direccionComprador', limpiar(c.direccion) || 'SIN DIRECCION'),
      t('totalSinImpuestos', dec(f.subtotal_sin_impuestos)),
      t('totalDescuento', dec(f.total_descuento)),
      el(
        'totalConImpuestos',
        null,
        [...grupos.values()].map((g) =>
          el('totalImpuesto', null, t('codigo', g.codigo), t('codigoPorcentaje', g.codigoPorcentaje), t('baseImponible', dec(g.base)), t('valor', dec(g.valor))),
        ),
      ),
      t('propina', dec(f.propina)),
      t('importeTotal', dec(f.total)),
      t('moneda', 'USD'),
      pagos.length
        ? el('pagos', null, pagos.map((p) => el('pago', null, t('formaPago', p.codigo), t('total', dec(p.valor)))))
        : '',
    ),
    el(
      'detalles',
      null,
      detalles.map((d) =>
        el(
          'detalle',
          null,
          t('codigoPrincipal', limpiar(d.codigo)),
          t('descripcion', limpiar(descripcionLinea(d))),
          t('cantidad', Number.isInteger(Number(d.cantidad)) ? String(Number(d.cantidad)) : dec(d.cantidad, 2)),
          t('precioUnitario', dec(d.precio_unitario, 3)),
          t('descuento', dec(d.descuento)),
          t('precioTotalSinImpuesto', dec(d.sub_total)),
          d.adicional && d.adicional.trim()
            ? el('detallesAdicionales', null, el('detAdicional', { nombre: 'adicional', valor: limpiar(d.adicional) }))
            : '',
          el(
            'impuestos',
            null,
            el('impuesto', null, t('codigo', '2'), t('codigoPorcentaje', d.iva_codigo), t('tarifa', dec(d.iva_pct)), t('baseImponible', dec(Number(d.sub_total) + Number(d.valor_ice))), t('valor', dec(d.valor_iva))),
            Number(d.valor_ice) > 0
              ? el('impuesto', null, t('codigo', '3'), t('codigoPorcentaje', d.ice_codigo), t('tarifa', dec(d.ice_pct)), t('baseImponible', dec(d.sub_total)), t('valor', dec(d.valor_ice)))
              : '',
            Number(d.valor_irbpnr) > 0
              ? el('impuesto', null, t('codigo', '5'), t('codigoPorcentaje', d.irbpnr_codigo), t('tarifa', dec(d.irbpnr_pct)), t('baseImponible', dec(d.sub_total)), t('valor', dec(d.valor_irbpnr)))
              : '',
          ),
        ),
      ),
    ),
    infoAdicional(adicionales),
  );
  return xml;
}

async function modeloRide(id: number, aut: { numeroAutorizacion?: string | null; fechaAutorizacion?: string | null }) {
  const { f, detalles, pagos, adicionales } = await cargarFactura(id);
  const e = await datosEmisor(f.id_emisor);
  const c = await clienteXml(f.id_cliente);
  const pctIva = detalles.find((d) => Number(d.valor_iva) > 0)?.iva_pct ?? 15;
  const ad: [string, string][] = adicionales.map((a) => [a.nombre, a.descripcion]);
  if (c.correo && !ad.some(([n]) => /mail|correo/i.test(n))) ad.push(['Email', c.correo.toLowerCase()]);
  const tel = c.telefono_movil || c.telefono_fijo;
  if (tel && !ad.some(([n]) => /tel|cel/i.test(n))) ad.push(['Teléfono', tel]);
  return {
    titulo: 'FACTURA',
    numero: f.numero,
    claveAcceso: f.clave_de_acceso,
    numeroAutorizacion: aut.numeroAutorizacion ?? f.clave_de_acceso,
    fechaAutorizacion: aut.fechaAutorizacion,
    ambiente: nombreAmbiente(f.clave_de_acceso.charAt(23) || e.codigo_ambiente),
    emisor: emisorRide(e, f.dir_establecimiento),
    receptor: [
      ['Razón Social / Nombres y Apellidos', c.nombre_cliente],
      ['Identificación', c.identificacion],
      ['Fecha Emisión', fechaSRI(f.fecha_emision)],
      ['Dirección', c.direccion || ''],
      ...(f.guia_de_remision ? ([['Guía de Remisión', f.guia_de_remision]] as [string, string][]) : []),
    ] as [string, string][],
    tablas: [
      {
        columnas: [
          { titulo: 'Cod. Principal', ancho: 11 },
          { titulo: 'Cant.', ancho: 6, alin: 'der' as const },
          { titulo: 'Descripción', ancho: 33 },
          { titulo: 'Detalle Adicional', ancho: 18 },
          { titulo: 'Precio Unitario', ancho: 10, alin: 'der' as const },
          { titulo: 'Descuento', ancho: 9, alin: 'der' as const },
          { titulo: 'Precio Total', ancho: 10, alin: 'der' as const },
        ],
        filas: detalles.map((d) => [
          d.codigo,
          String(Number(d.cantidad)),
          descripcionLinea(d),
          d.adicional && d.adicional !== descripcionLinea(d) ? d.adicional : '',
          dec(d.precio_unitario, 3),
          money(d.descuento),
          money(d.sub_total),
        ]),
      },
    ],
    adicionales: ad,
    pagos: pagos.map((p) => [p.descripcion, money(p.valor)] as [string, string]),
    totales: [
      [`SUBTOTAL ${Number(pctIva)}%`, money(f.subtotal_iva)],
      ['SUBTOTAL 0%', money(f.subtotal_iva_cero)],
      ['SUBTOTAL NO OBJETO DE IVA', money(f.subtotal_no_objeto_iva)],
      ['SUBTOTAL EXENTO DE IVA', money(f.subtotal_excento_iva)],
      ['SUBTOTAL SIN IMPUESTOS', money(f.subtotal_sin_impuestos)],
      ['TOTAL DESCUENTO', money(f.total_descuento)],
      ['ICE', money(f.valor_ice)],
      [`IVA ${Number(pctIva)}%`, money(f.valor_iva)],
      ['IRBPNR', money(f.valor_irbpnr)],
      ['PROPINA', money(f.propina)],
      ['VALOR TOTAL', money(f.total)],
    ] as [string, string][],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string; total: number }[]>`
    select c.correo, c.nombre_cliente receptor, f.numero, f.total
    from factura f join clientes c on c.id = f.id_cliente where f.id = ${id}`;
  return r;
}

export const factura: ManejadorComprobante = {
  tipoDoc: 1,
  codDoc: '01',
  nombre: 'Factura',
  tabla: 'factura',
  colClave: 'clave_de_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emison',
  colFecha: 'fecha_emision',
  ruta: '/facturas',
  construirXml,
  modeloRide,
  datosCorreo,
};

// IVA_CERO se exporta para quien lo necesite junto con este modulo
export { IVA_CERO };
