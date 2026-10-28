import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, dec, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante, DatosAutorizacion } from './tipos';
import type { ModeloRide } from '../sri/ride';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide, clienteXml } from './comun';
import { NO_OBJETO_IVA, EXENTO_IVA } from './calculos';
import { money, money3 } from '../formato';

type LiquidacionBD = {
  id: number; id_emisor: number; id_cliente: number; numero: string; clave_de_acceso: string; fecha_emision: Date;
  guia_de_remision: string | null; subtotal_sin_impuestos: number; subtotal_iva: number; subtotal_iva_cero: number;
  subtotal_no_objeto_iva: number; subtotal_excento_iva: number; total_descuento: number; valor_iva: number;
  valor_ice: number; valor_irbpnr: number; propina: number; total: number; estado: number; dir_establecimiento: string;
  id_punto_emison: number; fecha_autorizacion: Date | null;
};

type DetalleBD = {
  id: number; id_producto: number; codigo: string; nombre: string; adicional: string | null; cantidad: number;
  precio_unitario: number; descuento: number; decuento_porcentaje: number; sub_total: number; valor_iva: number;
  valor_ice: number; valor_irbpnr: number; total: number; iva_codigo: string; iva_pct: number; ice_codigo: string;
  ice_pct: number; irbpnr_codigo: string; irbpnr_pct: number;
};

export async function cargarLiquidacion(id: number) {
  const [l] = await sql<LiquidacionBD[]>`
    select l.*, p.direccion dir_establecimiento
    from liquidacion_compra l join puntos_emisior p on p.id = l.id_punto_emison
    where l.id = ${id}`;
  if (!l) throw new Error('Liquidación de compra no encontrada');
  const detalles = await sql<DetalleBD[]>`
    select d.id, d.id_producto, p.codigo, p.nombre, d.adicional, d.cantidad, d.precio_unitario, d.descuento, d.decuento_porcentaje,
           d.sub_total, d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total,
           iva.codigo iva_codigo, iva.porcentaje iva_pct, ice.codigo ice_codigo, ice.porcentaje ice_pct,
           irb.codigo irbpnr_codigo, irb.porcentaje irbpnr_pct
    from detalle_liquidacion d
    join producto p on p.id = d.id_producto
    join porcentaje_impuesto_producto iva on iva.id = p.codigo_iva
    join porcentaje_impuesto_producto ice on ice.id = p.codigo_ice
    join porcentaje_impuesto_producto irb on irb.id = p.codigo_irbpnr
    where d.id_liquidacion = ${id}
    order by d.id`;
  const pagos = await sql<{ id: number; codigo: string; descripcion: string; valor: number; plazo: number | null; timpo: string | null }[]>`
    select d.id, fp.codigo, fp.descripcion_form_pago descripcion, d.valor, d.plazo, d.timpo
    from detalle_pago_liquidacion d join formas_de_pago fp on fp.id = d.id_form_pago
    where d.id_liquidacion = ${id} order by d.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_liquidacion where id_liquidacion = ${id} order by id`;
  return { l, detalles, pagos, adicionales };
}

/** Recalcula totales desde las lineas y ajusta el pago unico si existe */
export async function recalcularLiquidacion(id: number) {
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
      from detalle_liquidacion d join producto p on p.id = d.id_producto
      where d.id_liquidacion = ${id}
    )
    update liquidacion_compra l set
      subtotal_sin_impuestos = t.sub, subtotal_iva = t.sub_iva, subtotal_iva_cero = t.sub_cero,
      subtotal_no_objeto_iva = t.sub_no_obj, subtotal_excento_iva = t.sub_exento, subtotal_ice = t.sub_ice,
      subtotal_irbpnr = t.sub_irbpnr, valor_iva = t.iva, valor_ice = t.ice, valor_irbpnr = t.irbpnr,
      total_descuento = t.descuento, total = t.total,
      fecha_modificacion = now() at time zone 'America/Guayaquil'
    from t where l.id = ${id}`;
  await sql`
    update detalle_pago_liquidacion d set valor = l.total
    from liquidacion_compra l
    where d.id_liquidacion = l.id and l.id = ${id}
      and (select count(*) from detalle_pago_liquidacion where id_liquidacion = ${id}) = 1`;
}

async function construirXml(id: number): Promise<string> {
  const { l, detalles, pagos, adicionales } = await cargarLiquidacion(id);
  if (!detalles.length) throw new Error('La liquidación no tiene productos');
  const e = await datosEmisor(l.id_emisor);
  const c = await clienteXml(l.id_cliente);

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

  return el(
    'liquidacionCompra',
    { id: 'comprobante', version: '1.1.0' },
    infoTributaria(e, l.clave_de_acceso, '03', l.numero),
    el(
      'infoLiquidacionCompra',
      null,
      t('fechaEmision', fechaSRI(l.fecha_emision)),
      t('dirEstablecimiento', limpiar(l.dir_establecimiento)),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      t('tipoIdentificacionProveedor', c.codigo_tipo),
      t('razonSocialProveedor', limpiar(c.nombre_cliente)),
      t('identificacionProveedor', c.identificacion),
      t('direccionProveedor', limpiar(c.direccion) || 'SIN DIRECCION'),
      t('totalSinImpuestos', dec(l.subtotal_sin_impuestos)),
      t('totalDescuento', dec(l.total_descuento)),
      el(
        'totalConImpuestos',
        null,
        [...grupos.values()].map((g) =>
          el('totalImpuesto', null, t('codigo', g.codigo), t('codigoPorcentaje', g.codigoPorcentaje), t('baseImponible', dec(g.base)), t('valor', dec(g.valor))),
        ),
      ),
      t('importeTotal', dec(l.total)),
      t('moneda', 'USD'),
      pagos.length ? el('pagos', null, pagos.map((p) => el('pago', null, t('formaPago', p.codigo), t('total', dec(p.valor))))) : '',
    ),
    el(
      'detalles',
      null,
      detalles.map((d) =>
        el(
          'detalle',
          null,
          t('codigoPrincipal', limpiar(d.codigo)),
          t('descripcion', limpiar(d.nombre)),
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
}

async function modeloRide(id: number, aut: DatosAutorizacion): Promise<ModeloRide> {
  const { l, detalles, pagos, adicionales } = await cargarLiquidacion(id);
  const e = await datosEmisor(l.id_emisor);
  const c = await clienteXml(l.id_cliente);
  const pctIva = detalles.find((d) => Number(d.valor_iva) > 0)?.iva_pct ?? 15;
  const ad: [string, string][] = adicionales.map((a) => [a.nombre, a.descripcion]);
  if (c.correo && !ad.some(([n]) => /mail|correo/i.test(n))) ad.push(['Email', c.correo.toLowerCase()]);
  return {
    titulo: 'LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS',
    numero: l.numero || `BORRADOR ${l.id}`,
    claveAcceso: l.clave_de_acceso || '0'.repeat(49),
    numeroAutorizacion: aut.numeroAutorizacion ?? l.clave_de_acceso,
    fechaAutorizacion: aut.fechaAutorizacion,
    ambiente: nombreAmbiente(l.clave_de_acceso?.charAt(23) || e.codigo_ambiente),
    emisor: emisorRide(e, l.dir_establecimiento),
    receptor: [
      ['Razón Social / Nombres y Apellidos (Proveedor)', c.nombre_cliente],
      ['Identificación', c.identificacion],
      ['Fecha Emisión', fechaSRI(l.fecha_emision)],
      ['Dirección', c.direccion || ''],
    ],
    tablas: [
      {
        columnas: [
          { titulo: 'Cod. Principal', ancho: 12 },
          { titulo: 'Cant.', ancho: 7, alin: 'der' },
          { titulo: 'Descripción', ancho: 35 },
          { titulo: 'Detalle Adicional', ancho: 16 },
          { titulo: 'Precio Unitario', ancho: 10, alin: 'der' },
          { titulo: 'Descuento', ancho: 9, alin: 'der' },
          { titulo: 'Precio Total', ancho: 11, alin: 'der' },
        ],
        filas: detalles.map((d) => [d.codigo, String(Number(d.cantidad)), d.nombre, d.adicional ?? '', money3(d.precio_unitario), money(d.descuento), money(d.sub_total)]),
      },
    ],
    adicionales: ad,
    pagos: pagos.map((p) => [p.descripcion, money(p.valor)] as [string, string]),
    totales: [
      [`SUBTOTAL ${Number(pctIva)}%`, money(l.subtotal_iva)],
      ['SUBTOTAL 0%', money(l.subtotal_iva_cero)],
      ['SUBTOTAL NO OBJETO DE IVA', money(l.subtotal_no_objeto_iva)],
      ['SUBTOTAL EXENTO DE IVA', money(l.subtotal_excento_iva)],
      ['SUBTOTAL SIN IMPUESTOS', money(l.subtotal_sin_impuestos)],
      ['TOTAL DESCUENTO', money(l.total_descuento)],
      ['ICE', money(l.valor_ice)],
      [`IVA ${Number(pctIva)}%`, money(l.valor_iva)],
      ['IRBPNR', money(l.valor_irbpnr)],
      ['VALOR TOTAL', money(l.total)],
    ],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string; total: number }[]>`
    select c.correo, c.nombre_cliente receptor, l.numero, l.total
    from liquidacion_compra l join clientes c on c.id = l.id_cliente where l.id = ${id}`;
  return r ?? { correo: null, receptor: '', numero: '', total: null };
}

export const liquidacionCompra: ManejadorComprobante = {
  tipoDoc: 2,
  codDoc: '03',
  nombre: 'Liquidación de compra',
  tabla: 'liquidacion_compra',
  colClave: 'clave_de_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emison',
  colFecha: 'fecha_emision',
  ruta: '/liquidaciones',
  construirXml,
  modeloRide,
  datosCorreo,
};
