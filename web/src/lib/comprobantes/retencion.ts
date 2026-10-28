import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, dec, fechaSRI } from '../sri/xml';
import type { ManejadorComprobante, DatosAutorizacion } from './tipos';
import type { ModeloRide } from '../sri/ride';
import { datosEmisor, infoTributaria, infoAdicional, nombreAmbiente, emisorRide, clienteXml } from './comun';
import { money } from '../formato';

type RetencionBD = {
  id: number; id_emisor: number; id_cliente: number | null; numero: string; clave_acceso: string; fecha_emision: Date;
  estado: number; id_punto_emision: number; fecha_autorizacion: Date | null; dir_establecimiento: string;
};

export type DetalleRetencionBD = {
  id: number; id_tipo_documento: number; doc_sustento: string; cod_doc_sustento: string; numero_documento_ret: string;
  fecha_emision: Date; id_impuesto: number; impuesto: string; codigo_impuesto: string; id_porcentajes_retenccion: number;
  codigo_retencion: string; descripcion_retencion: string; base_imponible: number; porcentaje_retencion: number;
  valor_retenido: number; periodo_fiscal: string;
};

export async function cargarRetencion(id: number) {
  const [r] = await sql<RetencionBD[]>`
    select r.id, r.id_emisor, r.id_cliente, r.numero, r.clave_acceso, r.fecha_emision, r.estado, r.id_punto_emision,
           r.fecha_autorizacion, p.direccion dir_establecimiento
    from retencion r join puntos_emisior p on p.id = r.id_punto_emision
    where r.id = ${id}`;
  if (!r) throw new Error('Retención no encontrada');
  const detalles = await sql<DetalleRetencionBD[]>`
    select d.id, d.id_tipo_documento, td.descripcion_doc doc_sustento, td.codigo_doc cod_doc_sustento, d.numero_documento_ret,
           d.fecha_emision, d.id_impuesto, i.descripcion impuesto, i.codigo codigo_impuesto, d.id_porcentajes_retenccion,
           pr.codigo codigo_retencion, pr.descripcion descripcion_retencion, d.base_imponible, d.porcentaje_retencion,
           d.valor_retenido, d.periodo_fiscal
    from detalle_retencion d
    join tipo_documento td on td.id = d.id_tipo_documento
    join impuestos_retencion i on i.id = d.id_impuesto
    join impuesto_porcentaje_retencion pr on pr.id = d.id_porcentajes_retenccion
    where d.id_retencion = ${id}
    order by d.id`;
  const adicionales = await sql<{ id: number; nombre: string; descripcion: string }[]>`
    select id, nombre, descripcion from datos_adicionales_retencion where id_retencion = ${id} order by id`;
  return { r, detalles, adicionales };
}

/** mm/aaaa */
function periodo(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Numero del documento sustento sin guiones (15 digitos) */
function numSustento(n: string) {
  return n.replace(/-/g, '');
}

function numSustentoLegible(n: string) {
  const s = numSustento(n);
  return /^\d{15}$/.test(s) ? `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}` : n;
}

async function construirXml(id: number): Promise<string> {
  const { r, detalles, adicionales } = await cargarRetencion(id);
  if (!r.id_cliente) throw new Error('La retención no tiene sujeto retenido');
  if (!detalles.length) throw new Error('La retención no tiene impuestos');
  const e = await datosEmisor(r.id_emisor);
  const c = await clienteXml(r.id_cliente);
  return el(
    'comprobanteRetencion',
    { id: 'comprobante', version: '1.0.0' },
    infoTributaria(e, r.clave_acceso, '07', r.numero),
    el(
      'infoCompRetencion',
      null,
      t('fechaEmision', fechaSRI(r.fecha_emision)),
      t('dirEstablecimiento', limpiar(r.dir_establecimiento)),
      e.cintirbuyente_especial && e.numero_con_especial ? t('contribuyenteEspecial', e.numero_con_especial) : '',
      t('obligadoContabilidad', e.obligado_conta ? 'SI' : 'NO'),
      t('tipoIdentificacionSujetoRetenido', c.codigo_tipo),
      t('razonSocialSujetoRetenido', limpiar(c.nombre_cliente)),
      t('identificacionSujetoRetenido', c.identificacion),
      t('periodoFiscal', periodo(r.fecha_emision)),
    ),
    el(
      'impuestos',
      null,
      detalles.map((d) =>
        el(
          'impuesto',
          null,
          t('codigo', limpiar(d.codigo_impuesto)),
          t('codigoRetencion', limpiar(d.codigo_retencion)),
          t('baseImponible', dec(d.base_imponible)),
          t('porcentajeRetener', dec(d.porcentaje_retencion)),
          t('valorRetenido', dec(d.valor_retenido)),
          t('codDocSustento', d.cod_doc_sustento || '01'),
          t('numDocSustento', numSustento(d.numero_documento_ret)),
          t('fechaEmisionDocSustento', fechaSRI(d.fecha_emision)),
        ),
      ),
    ),
    infoAdicional(adicionales),
  );
}

async function modeloRide(id: number, aut: DatosAutorizacion): Promise<ModeloRide> {
  const { r, detalles, adicionales } = await cargarRetencion(id);
  const e = await datosEmisor(r.id_emisor);
  const c = r.id_cliente ? await clienteXml(r.id_cliente) : null;
  const total = detalles.reduce((a, d) => a + Number(d.valor_retenido), 0);
  const ad: [string, string][] = adicionales.map((a) => [a.nombre, a.descripcion]);
  if (c?.correo && !ad.some(([n]) => /mail|correo/i.test(n))) ad.push(['Email', c.correo.toLowerCase()]);
  return {
    titulo: 'COMPROBANTE DE RETENCIÓN',
    numero: r.numero || `BORRADOR ${r.id}`,
    claveAcceso: r.clave_acceso || '0'.repeat(49),
    numeroAutorizacion: aut.numeroAutorizacion ?? r.clave_acceso,
    fechaAutorizacion: aut.fechaAutorizacion,
    ambiente: nombreAmbiente(r.clave_acceso?.charAt(23) || e.codigo_ambiente),
    emisor: emisorRide(e, r.dir_establecimiento),
    receptor: [
      ['Razón Social / Nombres y Apellidos', c?.nombre_cliente ?? ''],
      ['Identificación', c?.identificacion ?? ''],
      ['Fecha Emisión', fechaSRI(r.fecha_emision)],
      ['Periodo fiscal', periodo(r.fecha_emision)],
    ],
    tablas: [
      {
        columnas: [
          { titulo: 'Comprobante', ancho: 12 },
          { titulo: 'Número', ancho: 15 },
          { titulo: 'Fecha Emisión', ancho: 10 },
          { titulo: 'Ejercicio Fiscal', ancho: 9 },
          { titulo: 'Base Imponible para la Retención', ancho: 12, alin: 'der' },
          { titulo: 'Impuesto', ancho: 18 },
          { titulo: 'Porcentaje Retención', ancho: 10, alin: 'der' },
          { titulo: 'Valor Retenido', ancho: 10, alin: 'der' },
        ],
        filas: detalles.map((d) => [
          d.doc_sustento.toUpperCase(),
          numSustentoLegible(d.numero_documento_ret),
          fechaSRI(d.fecha_emision),
          periodo(d.fecha_emision),
          money(d.base_imponible),
          `${d.impuesto} (${d.codigo_retencion})`,
          `${money(d.porcentaje_retencion)}%`,
          money(d.valor_retenido),
        ]),
      },
    ],
    adicionales: ad,
    totales: [['TOTAL RETENIDO', money(total)]],
  };
}

async function datosCorreo(id: number) {
  const [r] = await sql<{ correo: string | null; receptor: string; numero: string; total: number }[]>`
    select c.correo, c.nombre_cliente receptor, r.numero,
           (select coalesce(sum(valor_retenido), 0) from detalle_retencion where id_retencion = r.id) total
    from retencion r join clientes c on c.id = r.id_cliente where r.id = ${id}`;
  if (!r) return { correo: null, receptor: '', numero: '', total: null };
  return r;
}

export const retencion: ManejadorComprobante = {
  tipoDoc: 6,
  codDoc: '07',
  nombre: 'Comprobante de retención',
  tabla: 'retencion',
  colClave: 'clave_acceso',
  colNumero: 'numero',
  colEmisor: 'id_emisor',
  colPunto: 'id_punto_emision',
  colFecha: 'fecha_emision',
  ruta: '/retenciones',
  construirXml,
  modeloRide,
  datosCorreo,
};
