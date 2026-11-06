import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { cargarRetencion } from '@/lib/comprobantes/retencion';
import { emisionPermitida } from '@/lib/comprobantes/procesar';
import { puntosEmision, textoPunto, proximosNumeros } from '@/lib/catalogos';
import { fechaInput, hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Estado, Alerta } from '@/components/ui';
import { ESTADO } from '@/lib/constantes';
import { CabeceraRetencion, ImpuestosRetencion, AdicionalesRetencion, BotonesRetencion } from './Editor';

export default async function EditarRetencion({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [ok] = await sql<{ estado: number }[]>`select estado from retencion where id = ${id} and id_emisor = ${s.emisorId}`;
  if (!ok) notFound();
  if (ok.estado !== ESTADO.PENDIENTE && ok.estado !== ESTADO.PAGADO) redirect(`/retenciones/${id}`);
  const [{ r, detalles, adicionales }, puntos, perm, numeracion] = await Promise.all([
    cargarRetencion(id), puntosEmision(s.emisorId), emisionPermitida(s.emisorId), proximosNumeros(s.emisorId, 6),
  ]);
  const [c] = r.id_cliente
    ? await sql<{ nombre_cliente: string; identificacion: string }[]>`select nombre_cliente, identificacion from clientes where id = ${r.id_cliente}`
    : [];
  const tiposDoc = await sql<{ id: number; descripcion_doc: string; codigo_doc: string }[]>`select id, descripcion_doc, codigo_doc from tipo_documento order by id`;
  const impuestos = await sql<{ id: number; descripcion: string; codigo: string }[]>`
    select i.id, i.descripcion, i.codigo from impuestos_retencion i
    where exists (select 1 from impuesto_porcentaje_retencion p where p.id_impuesto = i.id) order by i.id`;
  const porcentajes = await sql<{ id: number; id_impuesto: number; codigo: string; descripcion: string; porcentaje: number; porcentaje_fijo: boolean }[]>`
    select id, id_impuesto, codigo, descripcion, porcentaje, porcentaje_fijo from impuesto_porcentaje_retencion order by id_impuesto, codigo`;
  // Datos propuestos al importar la factura del proveedor (vienen en la direccion)
  const num = (sp.num ?? '').replace(/\D/g, '');
  const sugerido = num.length === 15 ? {
    idTipoDoc: tiposDoc.find((t) => t.codigo_doc === sp.doc)?.id,
    numero: `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? '') ? sp.fecha : undefined,
    renta: Number(sp.renta) || 0,
    iva: Number(sp.iva) || 0,
  } : undefined;
  return (
    <>
      <Cabecera titulo={`Retención · borrador #${r.id}`} sub={<Estado id={r.estado} />}>
        <Link className="btn" href="/retenciones">Volver</Link>
      </Cabecera>
      {sp.copiada && <Alerta tipo="ok">Se copiaron el sujeto retenido, los impuestos y los datos adicionales. Revise el número y la fecha del documento sustento antes de emitir.</Alerta>}
      {!perm.permitido && <Alerta tipo="aviso">{perm.motivo}</Alerta>}
      <CabeceraRetencion id={id} numeracion={numeracion} puntos={puntos.map((p) => ({ id: p.id, texto: textoPunto(p) }))}
        valores={{ id_punto_emision: r.id_punto_emision, fecha: fechaInput(r.fecha_emision), sujeto: c && r.id_cliente ? { id: r.id_cliente, nombre: c.nombre_cliente, identificacion: c.identificacion } : null }} />
      <ImpuestosRetencion id={id} hoy={hoyEcuadorISO()} sugerido={sugerido}
        tiposDoc={tiposDoc.map((t) => ({ id: t.id, texto: `${t.codigo_doc} · ${t.descripcion_doc}` }))}
        impuestos={impuestos.map((i) => ({ id: i.id, texto: i.descripcion }))}
        porcentajes={porcentajes.map((p) => ({ id: p.id, id_impuesto: p.id_impuesto, texto: `${p.codigo} · ${p.descripcion}`, porcentaje: Number(p.porcentaje), fijo: p.porcentaje_fijo }))}
        detalles={detalles.map((d) => ({
          id: d.id, doc: d.doc_sustento, numero: d.numero_documento_ret, fecha: fechaInput(d.fecha_emision), impuesto: d.impuesto,
          codigo: d.codigo_retencion, base: Number(d.base_imponible), porcentaje: Number(d.porcentaje_retencion), valor: Number(d.valor_retenido),
        }))} />
      <div className="grid c2">
        <AdicionalesRetencion id={id} adicionales={adicionales} />
        <BotonesRetencion id={id} permitido={perm.permitido} total={detalles.reduce((a, d) => a + Number(d.valor_retenido), 0)} />
      </div>
    </>
  );
}
