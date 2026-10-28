import 'server-only';
import { sql } from '../db';
import { el, t, limpiar, escTexto } from '../sri/xml';
import type { ModeloRide } from '../sri/ride';

export type EmisorXml = {
  id: number; ruc: string; razon_social: string; nombre_comercial: string; direccion_matriz: string;
  obligado_conta: boolean; cintirbuyente_especial: boolean; numero_con_especial: string | null;
  codigo_ambiente: string; id_impuesto_iva_actual: number; logo: Uint8Array | null; logo_mime: string | null;
};

export async function datosEmisor(id: number): Promise<EmisorXml> {
  const [e] = await sql<EmisorXml[]>`
    select e.id, e.ruc, e.razon_social, e.nombre_comercial, e.direccion_matriz, e.obligado_conta,
           e.cintirbuyente_especial, e.numero_con_especial, a.codigo_ambiente, e.id_impuesto_iva_actual,
           l.contenido logo, l.tipo_mime logo_mime
    from emisor e
    join tipo_ambientes a on a.id = e.tipo_ambiente
    left join logo_emisor l on l.id_emisor = e.id
    where e.id = ${id}`;
  if (!e) throw new Error('Emisor no encontrado');
  return e;
}

export function infoTributaria(e: EmisorXml, claveAcceso: string, codDoc: string, numero: string) {
  const [estab, ptoEmi, secuencial] = numero.split('-');
  return el(
    'infoTributaria',
    null,
    t('ambiente', e.codigo_ambiente),
    t('tipoEmision', '1'),
    t('razonSocial', limpiar(e.razon_social)),
    t('nombreComercial', limpiar(e.nombre_comercial)),
    t('ruc', e.ruc),
    t('claveAcceso', claveAcceso),
    t('codDoc', codDoc),
    t('estab', estab),
    t('ptoEmi', ptoEmi),
    t('secuencial', secuencial),
    t('dirMatriz', limpiar(e.direccion_matriz)),
  );
}

/** Bloque infoAdicional (se omite si no hay campos) */
export function infoAdicional(campos: { nombre: string; descripcion: string }[]) {
  const validos = campos.filter((c) => c.nombre && c.descripcion);
  if (!validos.length) return '';
  return el('infoAdicional', null, validos.map((c) => el('campoAdicional', { nombre: limpiar(c.nombre) }, escTexto(limpiar(c.descripcion)))));
}

export function nombreAmbiente(codigo: string) {
  return codigo === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
}

export function emisorRide(e: EmisorXml, dirEstablecimiento: string | null): ModeloRide['emisor'] {
  return {
    ruc: e.ruc,
    razonSocial: e.razon_social,
    nombreComercial: e.nombre_comercial,
    dirMatriz: e.direccion_matriz,
    dirEstablecimiento,
    contribuyenteEspecial: e.cintirbuyente_especial ? e.numero_con_especial : null,
    obligadoContabilidad: e.obligado_conta,
    logo: e.logo && e.logo_mime ? { bytes: e.logo, mime: e.logo_mime } : null,
  };
}

/** Codigo SRI del tipo de identificacion del cliente (04 RUC, 05 cedula, 06 pasaporte, 07 consumidor final, 08 exterior) */
export async function clienteXml(idCliente: number) {
  const [c] = await sql<{ nombre_cliente: string; identificacion: string; direccion: string | null; correo: string | null; telefono_movil: string | null; telefono_fijo: string | null; codigo_tipo: string; tipo_identificacion: number }[]>`
    select c.nombre_cliente, c.identificacion, c.direccion, c.correo, c.telefono_movil, c.telefono_fijo,
           t.codigo codigo_tipo, c.tipo_identificacion
    from clientes c join tipo_identificacion t on t.id = c.tipo_identificacion
    where c.id = ${idCliente}`;
  if (!c) throw new Error('Cliente no encontrado');
  return c;
}

export function money2(n: number | null | undefined) {
  return Number(n ?? 0).toFixed(2);
}
