import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante, DatosAutorizacion } from './tipos';
import type { ModeloRide } from '../sri/ride';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide } from './comun';

type GuiaBD = {
  id: number; id_emisor: number; numero_comprobante: string; clave_acceso: string; id_transportista: number;
  fecha_inicio_transporte: Date; fecha_fin_transporte: Date; direccion_partida: string; placa: string; estado: number;
  id_punto_emision: number; fecha_creacion: Date; fecha_autorizacion: Date | null; dir_establecimiento: string;
  transportista: string; ident_transportista: string; codigo_tipo_transportista: string; placa_transportista: string;
  correo_transportista: string | null;
};

export type DestinatarioBD = {
  id: number; id_cliente: number; nombre_cliente: string; identificacion: string; direccion_cliente: string | null;
  correo: string | null; codigo_estable_destino: string; documento_aduanero: string; fecha_emision_factura: Date;
  numero_factura: string; numero_autorizacion_fac: string; direccion_destino: string; motivo_traslado: string; ruta: string;
};

export type DetalleGuiaBD = { id: number; id_destinatario: number; id_producto: number; codigo: string; nombre: string; cantidad: number };

export async function cargarGuia(id: number) {
  const [g] = await sql<GuiaBD[]>`
    select g.*, p.direccion dir_establecimiento, tr.nombre transportista, tr.numero_identificacion ident_transportista,
           ti.codigo codigo_tipo_transportista, tr.placa placa_transportista, tr.correo correo_transportista
    from guia_remision g
    join puntos_emisior p on p.id = g.id_punto_emision
    join transportistas tr on tr.id = g.id_transportista
    join tipo_identificacion ti on ti.id = tr.tipo_identificacion
    where g.id = ${id}`;
  if (!g) throw new Error('Guía de remisión no encontrada');
  const destinatarios = await sql<DestinatarioBD[]>`
    select d.id, d.id_cliente, c.nombre_cliente, c.identificacion, c.direccion direccion_cliente, c.correo,
           d.codigo_estable_destino, d.documento_aduanero, d.fecha_emision_factura, d.numero_factura,
           d.numero_autorizacion_fac, d.direccion_destino, d.motivo_traslado, d.ruta
    from guia_remision_destinatario d join clientes c on c.id = d.id_cliente
    where d.id_guia = ${id} order by d.id`;
  const detalles = await sql<DetalleGuiaBD[]>`
    select x.id, x.id_destinatario, x.id_producto, p.codigo, p.nombre, x.cantidad
    from detalles_guia_remision x
    join guia_remision_destinatario d on d.id = x.id_destinatario
    join producto p on p.id = x.id_producto
    where d.id_guia = ${id} order by x.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_guia_remision where id_guia = ${id} order by id`;
  return { g, destinatarios, detalles, adicionales };
}

/** El documento sustento solo se informa si tiene numero estab-pto-secuencial valido */
function tieneSustento(d: DestinatarioBD) {
  return /^\d{3}-\d{3}-\d{9}$/.test(d.numero_factura);
}

async function construirXml(id: number): Promise<string> {
  const { g, destinatarios, detalles, adicionales } = await cargarGuia(id);
  if (!destinatarios.length) throw new Error('La guía no tiene destinatarios');
  const e = await datosEmisor(g.id_emisor);
  return el(
    'guiaRemision',
    { id: 'comprobante', version: '1.1.0' },
    infoTributaria(e, g.clave_acceso, '06', g.numero_comprobante),
    el(
      'infoGuiaRemision',
      null,
      t('dirEstablecimiento', limpiar(g.dir_establecimiento)),
      t('dirPartida', limpiar(g.direccion_partida)),
      t('razonSocialTransportista', limpiar(g.transportista)),
      t('tipoIdentificacionTransportista', g.codigo_tipo_transportista),
      t('rucTransportista', g.ident_transportista),
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('fechaIniTransporte', fechaSRI(g.fecha_inicio_transporte)),
      t('fechaFinTransporte', fechaSRI(g.fecha_fin_transporte)),
      t('placa', limpiar(g.placa || g.placa_transportista)),
    ),
    el(
      'destinatarios',
      null,
      destinatarios.map((d) => {
        const lineas = detalles.filter((x) => x.id_destinatario === d.id);
        if (!lineas.length) throw new Error(`El destinatario ${d.nombre_cliente} no tiene productos`);
        const sus = tieneSustento(d);
        return el(
          'destinatario',
          null,
          t('identificacionDestinatario', d.identificacion),
          t('razonSocialDestinatario', limpiar(d.nombre_cliente)),
          t('dirDestinatario', limpiar(d.direccion_destino || d.direccion_cliente) || 'SIN DIRECCION'),
          t('motivoTraslado', limpiar(d.motivo_traslado)),
          d.documento_aduanero ? t('docAduaneroUnico', limpiar(d.documento_aduanero)) : '',
          /^\d{3}$/.test(d.codigo_estable_destino) ? t('codEstabDestino', d.codigo_estable_destino) : '',
          d.ruta ? t('ruta', limpiar(d.ruta)) : '',
          sus ? t('codDocSustento', '01') : '',
          sus ? t('numDocSustento', d.numero_factura) : '',
          sus && /^\d{10,49}$/.test(d.numero_autorizacion_fac) ? t('numAutDocSustento', d.numero_autorizacion_fac) : '',
          sus ? t('fechaEmisionDocSustento', fechaSRI(d.fecha_emision_factura)) : '',
          el(
            'detalles',
            null,
            lineas.map((x) =>
              el('detalle', null, t('codigoInterno', limpiar(x.codigo)), t('descripcion', limpiar(x.nombre)), t('cantidad', String(Number(x.cantidad)))),
            ),
          ),
        );
      }),
    ),
    infoAdicional(adicionales),
  );
}

async function modeloRide(id: number, aut: DatosAutorizacion): Promise<ModeloRide> {
  const { g, destinatarios, detalles, adicionales } = await cargarGuia(id);
  const e = await datosEmisor(g.id_emisor);
  return {
    titulo: 'GUÍA DE REMISIÓN',
    numero: g.numero_comprobante || `BORRADOR ${g.id}`,
    claveAcceso: g.clave_acceso || '0'.repeat(49),
    numeroAutorizacion: aut.numeroAutorizacion ?? g.clave_acceso,
    fechaAutorizacion: aut.fechaAutorizacion,
    ambiente: nombreAmbiente(g.clave_acceso?.charAt(23) || e.codigo_ambiente),
    emisor: emisorRide(e, g.dir_establecimiento),
    receptor: [
      ['Identificación (Transportista)', g.ident_transportista],
      ['Razón Social / Nombres y Apellidos', g.transportista],
      ['Placa', g.placa || g.placa_transportista],
      ['Punto de Partida', g.direccion_partida],
      ['Fecha inicio Transporte', fechaSRI(g.fecha_inicio_transporte)],
      ['Fecha fin Transporte', fechaSRI(g.fecha_fin_transporte)],
    ],
    tablas: destinatarios.flatMap((d, i) => [
      {
        titulo: `Destinatario ${i + 1}: ${d.nombre_cliente}`,
        columnas: [
          { titulo: 'Identificación', ancho: 14 },
          { titulo: 'Destino', ancho: 26 },
          { titulo: 'Motivo traslado', ancho: 18 },
          { titulo: 'Comprobante de venta', ancho: 22 },
          { titulo: 'Ruta', ancho: 20 },
        ],
        filas: [[
          d.identificacion,
          d.direccion_destino || d.direccion_cliente || '',
          d.motivo_traslado,
          tieneSustento(d) ? `FACTURA ${d.numero_factura} (${fechaSRI(d.fecha_emision_factura)})` : '',
          d.ruta,
        ]],
      },
      {
        columnas: [
          { titulo: 'Cantidad', ancho: 12, alin: 'der' as const },
          { titulo: 'Descripción', ancho: 60 },
          { titulo: 'Código Principal', ancho: 28 },
        ],
        filas: detalles.filter((x) => x.id_destinatario === d.id).map((x) => [String(Number(x.cantidad)), x.nombre, x.codigo]),
      },
    ]),
    adicionales: adicionales.map((a) => [a.nombre, a.descripcion] as [string, string]),
    totales: [],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string }[]>`
    select coalesce(
             (select string_agg(c.correo, ';') from guia_remision_destinatario d join clientes c on c.id = d.id_cliente
              where d.id_guia = g.id and c.correo is not null),
             tr.correo) correo,
           coalesce((select string_agg(c.nombre_cliente, ', ') from guia_remision_destinatario d join clientes c on c.id = d.id_cliente where d.id_guia = g.id), tr.nombre) receptor,
           g.numero_comprobante numero
    from guia_remision g join transportistas tr on tr.id = g.id_transportista where g.id = ${id}`;
  return { correo: r?.correo ?? null, receptor: r?.receptor ?? '', numero: r?.numero ?? '', total: null };
}

export const guiaRemision: ManejadorComprobante = {
  tipoDoc: 5,
  codDoc: '06',
  nombre: 'Guía de remisión',
  tabla: 'guia_remision',
  colClave: 'clave_acceso',
  colNumero: 'numero_comprobante',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_inicio_transporte',
  ruta: '/guias-remision',
  construirXml,
  modeloRide,
  datosCorreo,
};
