import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, dec, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante, DatosAutorizacion } from './tipos';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide, clienteXml } from './comun';
import { r2, NO_OBJETO_IVA, EXENTO_IVA } from './calculos';
import { money } from '../formato';

export type NotaCreditoBD = {
  id: number; id_emisor: number; id_cliente: number; numero: string; clave_acceso: string; fecha_emision: Date;
  fecha_emision_fc_mod: Date; numero_fc_mod: string; motivo: string; sumtota_sin_impuesto: number; subtotal_iva: number;
  subtotal_iva_cero: number; subtotal_no_objeto_iva: number; subtotal_excento_iva: number; total_descuento: number;
  valor_iva: number; valor_ice: number; valor_irbpnr: number; total: number; estado: number; id_punto_emision: number;
  id_factura_devolver: number; fecha_autorizacion: Date | null; dir_establecimiento: string;
};

export type DetalleNCBD = {
  id: number; id_producto: number; id_detalle_factura: number | null; codigo: string; nombre: string; cantidad: number;
  precio: number; descuento: number; subtotal: number; valor_iva: number; valor_ice: number; valor_irbpnr: number; total: number;
  iva_id: number; iva_codigo: string; iva_pct: number; ice_codigo: string; ice_pct: number; irbpnr_codigo: string; irbpnr_pct: number;
};

export async function cargarNotaCredito(id: number) {
  const [n] = await sql<NotaCreditoBD[]>`
    select n.*, p.direccion dir_establecimiento
    from nota_credito n join puntos_emisior p on p.id = n.id_punto_emision
    where n.id = ${id}`;
  if (!n) throw new Error('Nota de crédito no encontrada');
  // El IVA de la linea es el guardado al crearla; si no existe (datos antiguos) se usa el del producto
  const detalles = await sql<DetalleNCBD[]>`
    select d.id, d.id_producto, d.id_detalle_factura, p.codigo, coalesce(nullif(d.descripcion, ''), p.nombre) nombre, d.cantidad, d.precio, d.descuento, d.subtotal, d.valor_iva, d.valor_ice,
           d.valor_irbpnr, d.total, iva.id iva_id, iva.codigo iva_codigo, iva.porcentaje iva_pct,
           ice.codigo ice_codigo, ice.porcentaje ice_pct, irb.codigo irbpnr_codigo, irb.porcentaje irbpnr_pct
    from detalle_nota_credito d
    join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = coalesce(d.id_porcentaje_iva, p.codigo_iva)
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where d.id_nota_credito = ${id}
    order by d.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_nota_credito where id_nota_credito = ${id} order by id`;
  return { n, detalles, adicionales };
}

/** Recalcula los totales de la nota de credito a partir de sus lineas */
export async function recalcularNotaCredito(id: number) {
  await sql`
    with t as (
      select
        coalesce(sum(d.subtotal), 0) sub,
        coalesce(sum(d.subtotal) filter (where d.valor_iva > 0), 0) sub_iva,
        coalesce(sum(d.subtotal) filter (where d.valor_iva = 0 and coalesce(d.id_porcentaje_iva, p.codigo_iva) not in (${NO_OBJETO_IVA}, ${EXENTO_IVA})), 0) sub_cero,
        coalesce(sum(d.subtotal) filter (where d.valor_iva = 0 and coalesce(d.id_porcentaje_iva, p.codigo_iva) = ${NO_OBJETO_IVA}), 0) sub_no_obj,
        coalesce(sum(d.subtotal) filter (where d.valor_iva = 0 and coalesce(d.id_porcentaje_iva, p.codigo_iva) = ${EXENTO_IVA}), 0) sub_exento,
        coalesce(sum(d.subtotal) filter (where d.valor_ice > 0), 0) sub_ice,
        coalesce(sum(d.subtotal) filter (where d.valor_irbpnr > 0), 0) sub_irbpnr,
        coalesce(sum(d.valor_iva), 0) iva, coalesce(sum(d.valor_ice), 0) ice, coalesce(sum(d.valor_irbpnr), 0) irbpnr,
        coalesce(sum(d.descuento), 0) descuento, coalesce(sum(d.total), 0) total
      from detalle_nota_credito d join producto p on p.id = d.id_producto
      where d.id_nota_credito = ${id}
    )
    update nota_credito n set
      sumtota_sin_impuesto = t.sub, subtotal_iva = t.sub_iva, subtotal_iva_cero = t.sub_cero,
      subtotal_no_objeto_iva = t.sub_no_obj, subtotal_excento_iva = t.sub_exento, subtotal_ice = t.sub_ice,
      subtotal_irbpnr = t.sub_irbpnr, valor_iva = t.iva, valor_ice = t.ice, valor_irbpnr = t.irbpnr,
      total_descuento = t.descuento, total = t.total,
      fecha_modificacion = now() at time zone 'America/Guayaquil'
    from t where n.id = ${id}`;
}

/**
 * Linea de la factura original con el porcentaje de IVA que realmente se aplico.
 * El IVA se deduce del valor cobrado (valor_iva / base) y se busca la tarifa vigente mas cercana.
 */
export type LineaFacturaOrigen = {
  id: number; id_producto: number; codigo: string; nombre: string; adicional: string | null; cantidad: number;
  precio_unitario: number; descuento: number; sub_total: number; valor_iva: number; valor_ice: number;
  valor_irbpnr: number; total: number; id_porcentaje_iva: number; iva_pct: number; acreditado: number;
};

export async function lineasFacturaOrigen(idFactura: number, excluirNota?: number): Promise<LineaFacturaOrigen[]> {
  const filas = await sql<(Omit<LineaFacturaOrigen, 'id_porcentaje_iva' | 'iva_pct'> & { prod_iva: number; prod_iva_pct: number })[]>`
    select d.id, d.id_producto, p.codigo, p.nombre, d.adicional, d.cantidad, d.precio_unitario, d.descuento, d.sub_total,
           d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total, p.codigo_iva prod_iva, iva.porcentaje prod_iva_pct,
           coalesce((
             select sum(dn.cantidad) from detalle_nota_credito dn join nota_credito n on n.id = dn.id_nota_credito
             where n.id_factura_devolver = d.id_factura and n.estado not in (7, 8)
               ${excluirNota ? sql`and n.id <> ${excluirNota}` : sql``}
               and (dn.id_detalle_factura = d.id
                    -- notas antiguas sin enlace: se asignan por producto si la factura no lo repite
                    or (dn.id_detalle_factura is null and dn.id_producto = d.id_producto
                        and (select count(*) from detalle_factura x where x.id_factura = d.id_factura and x.id_producto = d.id_producto) = 1))
           ), 0) acreditado
    from detalle_factura d join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    where d.id_factura = ${idFactura}
    order by d.id`;
  const tarifas = await sql<{ id: number; porcentaje: number }[]>`
    select id, porcentaje from porcentaje_impuesto_producto where id_impuesto in (1, 4) and porcentaje > 0`;
  return filas.map((f) => {
    let idIva = f.prod_iva;
    let pct = Number(f.prod_iva_pct);
    const base = Number(f.sub_total) + Number(f.valor_ice);
    if (Number(f.valor_iva) > 0 && base > 0) {
      const real = (Number(f.valor_iva) / base) * 100;
      // si la tarifa del producto explica el valor cobrado, se mantiene; si no, la tarifa mas cercana
      if (!(pct > 0 && Math.abs(r2(base * pct / 100) - Number(f.valor_iva)) <= 0.011)) {
        const mejor = tarifas.reduce((a, b) => (Math.abs(Number(b.porcentaje) - real) < Math.abs(Number(a.porcentaje) - real) ? b : a));
        idIva = mejor.id;
        pct = Number(mejor.porcentaje);
      }
    } else if (pct > 0) {
      // linea sin IVA cobrado pero el producto hoy grava IVA: se trata como 0%
      idIva = 1;
      pct = 0;
    }
    return { ...f, id_porcentaje_iva: idIva, iva_pct: pct };
  });
}

/** Calcula una linea de nota de credito para cierta cantidad devuelta de una linea de factura */
export function calcularLineaNC(o: LineaFacturaOrigen, cantidad: number) {
  const q = Number(o.cantidad) || 1;
  const precio = Number(o.precio_unitario);
  const descuento = r2((Number(o.descuento) / q) * cantidad);
  const subtotal = r2(precio * cantidad - descuento);
  const ice = r2((Number(o.valor_ice) / q) * cantidad);
  const irbpnr = r2((Number(o.valor_irbpnr) / q) * cantidad);
  const iva = r2((subtotal + ice) * (o.iva_pct / 100));
  // descripcion: si el producto es generico (REFERENCIA) se usa el texto adicional de la factura
  const descripcion = o.nombre.trim().toUpperCase() === 'REFERENCIA' && o.adicional ? o.adicional : o.nombre;
  return {
    id_producto: o.id_producto,
    id_detalle_factura: o.id,
    descripcion: descripcion.slice(0, 300),
    cantidad,
    precio,
    descuento,
    subtotal,
    valor_iva: iva,
    valor_ice: ice,
    valor_irbpnr: irbpnr,
    total: r2(subtotal + iva + ice + irbpnr),
    id_porcentaje_iva: o.id_porcentaje_iva,
  };
}

async function construirXml(id: number): Promise<string> {
  const { n, detalles, adicionales } = await cargarNotaCredito(id);
  const e = await datosEmisor(n.id_emisor);
  const c = await clienteXml(n.id_cliente);

  const grupos = new Map<string, { codigo: string; codigoPorcentaje: string; base: number; valor: number }>();
  const sumar = (codigo: string, codPct: string, base: number, valor: number) => {
    const k = `${codigo}-${codPct}`;
    const g = grupos.get(k) ?? { codigo, codigoPorcentaje: codPct, base: 0, valor: 0 };
    g.base += base;
    g.valor += valor;
    grupos.set(k, g);
  };
  for (const d of detalles) {
    sumar('2', d.iva_codigo, Number(d.subtotal) + Number(d.valor_ice), Number(d.valor_iva));
    if (Number(d.valor_ice) > 0) sumar('3', d.ice_codigo, Number(d.subtotal), Number(d.valor_ice));
    if (Number(d.valor_irbpnr) > 0) sumar('5', d.irbpnr_codigo, Number(d.subtotal), Number(d.valor_irbpnr));
  }

  return el(
    'notaCredito',
    { id: 'comprobante', version: '1.1.0' },
    infoTributaria(e, n.clave_acceso, '04', n.numero),
    el(
      'infoNotaCredito',
      null,
      t('fechaEmision', fechaSRI(n.fecha_emision)),
      t('dirEstablecimiento', limpiar(n.dir_establecimiento)),
      t('tipoIdentificacionComprador', c.codigo_tipo),
      t('razonSocialComprador', limpiar(c.nombre_cliente)),
      t('identificacionComprador', c.identificacion),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      t('codDocModificado', '01'),
      t('numDocModificado', n.numero_fc_mod),
      t('fechaEmisionDocSustento', fechaSRI(n.fecha_emision_fc_mod)),
      t('totalSinImpuestos', dec(n.sumtota_sin_impuesto)),
      t('valorModificacion', dec(n.total)),
      t('moneda', 'USD'),
      el(
        'totalConImpuestos',
        null,
        [...grupos.values()].map((g) =>
          el('totalImpuesto', null, t('codigo', g.codigo), t('codigoPorcentaje', g.codigoPorcentaje), t('baseImponible', dec(g.base)), t('valor', dec(g.valor))),
        ),
      ),
      t('motivo', limpiar(n.motivo)),
    ),
    el(
      'detalles',
      null,
      detalles.map((d) =>
        el(
          'detalle',
          null,
          t('codigoInterno', limpiar(d.codigo)),
          t('descripcion', limpiar(d.nombre)),
          t('cantidad', String(Number(d.cantidad))),
          t('precioUnitario', dec(d.precio, 3)),
          t('descuento', dec(d.descuento)),
          t('precioTotalSinImpuesto', dec(d.subtotal)),
          el(
            'impuestos',
            null,
            el('impuesto', null, t('codigo', '2'), t('codigoPorcentaje', d.iva_codigo), t('tarifa', dec(d.iva_pct)), t('baseImponible', dec(Number(d.subtotal) + Number(d.valor_ice))), t('valor', dec(d.valor_iva))),
            Number(d.valor_ice) > 0
              ? el('impuesto', null, t('codigo', '3'), t('codigoPorcentaje', d.ice_codigo), t('tarifa', dec(d.ice_pct)), t('baseImponible', dec(d.subtotal)), t('valor', dec(d.valor_ice)))
              : '',
            Number(d.valor_irbpnr) > 0
              ? el('impuesto', null, t('codigo', '5'), t('codigoPorcentaje', d.irbpnr_codigo), t('tarifa', dec(d.irbpnr_pct)), t('baseImponible', dec(d.subtotal)), t('valor', dec(d.valor_irbpnr)))
              : '',
          ),
        ),
      ),
    ),
    infoAdicional(adicionales),
  );
}

async function modeloRide(id: number, aut: DatosAutorizacion) {
  const { n, detalles, adicionales } = await cargarNotaCredito(id);
  const e = await datosEmisor(n.id_emisor);
  const c = await clienteXml(n.id_cliente);
  const pctIva = detalles.find((d) => Number(d.valor_iva) > 0)?.iva_pct ?? 15;
  const ad: [string, string][] = adicionales.map((a) => [a.nombre, a.descripcion]);
  if (c.correo && !ad.some(([x]) => /mail|correo/i.test(x))) ad.push(['Email', c.correo.toLowerCase()]);
  return {
    titulo: 'NOTA DE CRÉDITO',
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
      ['Comprobante que se modifica', `FACTURA ${n.numero_fc_mod}`],
      ['Fecha emisión (comprobante a modificar)', fechaSRI(n.fecha_emision_fc_mod)],
      ['Razón de modificación', n.motivo],
    ] as [string, string][],
    tablas: [
      {
        columnas: [
          { titulo: 'Cod. Principal', ancho: 13 },
          { titulo: 'Cant.', ancho: 7, alin: 'der' as const },
          { titulo: 'Descripción', ancho: 45 },
          { titulo: 'Precio Unitario', ancho: 12, alin: 'der' as const },
          { titulo: 'Descuento', ancho: 10, alin: 'der' as const },
          { titulo: 'Precio Total', ancho: 12, alin: 'der' as const },
        ],
        filas: detalles.map((d) => [d.codigo, String(Number(d.cantidad)), d.nombre, dec(d.precio, 3), money(d.descuento), money(d.subtotal)]),
      },
    ],
    adicionales: ad,
    totales: [
      [`SUBTOTAL ${Number(pctIva)}%`, money(n.subtotal_iva)],
      ['SUBTOTAL 0%', money(n.subtotal_iva_cero)],
      ['SUBTOTAL NO OBJETO DE IVA', money(n.subtotal_no_objeto_iva)],
      ['SUBTOTAL EXENTO DE IVA', money(n.subtotal_excento_iva)],
      ['SUBTOTAL SIN IMPUESTOS', money(n.sumtota_sin_impuesto)],
      ['TOTAL DESCUENTO', money(n.total_descuento)],
      ['ICE', money(n.valor_ice)],
      [`IVA ${Number(pctIva)}%`, money(n.valor_iva)],
      ['IRBPNR', money(n.valor_irbpnr)],
      ['VALOR TOTAL', money(n.total)],
    ] as [string, string][],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string; total: number }[]>`
    select c.correo, c.nombre_cliente receptor, n.numero, n.total
    from nota_credito n join clientes c on c.id = n.id_cliente where n.id = ${id}`;
  return r;
}

export const notaCredito: ManejadorComprobante = {
  tipoDoc: 3,
  codDoc: '04',
  nombre: 'Nota de crédito',
  tabla: 'nota_credito',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/notas-credito',
  construirXml,
  modeloRide,
  datosCorreo,
};
