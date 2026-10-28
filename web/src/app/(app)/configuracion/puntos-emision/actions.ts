'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { entero, texto } from '@/lib/params';
import type { EstadoForm } from '../../admin/_comun/Msg';

export async function guardarPunto(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const estab = texto(form.get('numero_establecimiento'));
  const pto = texto(form.get('numero_emision'));
  const direccion = texto(form.get('direccion')).toUpperCase();
  let bodega = entero(form.get('id_bodega'));
  if (!/^\d{3}$/.test(estab) || estab === '000') return { mensaje: 'El establecimiento debe tener 3 dígitos (ej. 001)' };
  if (!/^\d{3}$/.test(pto) || pto === '000') return { mensaje: 'El punto de emisión debe tener 3 dígitos (ej. 001)' };
  if (!direccion) return { mensaje: 'Ingrese la dirección del establecimiento' };
  if (direccion.length > 100) return { mensaje: 'Dirección: máximo 100 caracteres' };
  const tipos = await sql<{ id: number }[]>`select id from tipo_documento order by id`;
  const secuenciales = new Map<number, number>();
  for (const t of tipos) {
    const v = entero(form.get(`sec_${t.id}`)) ?? 1;
    if (v < 1 || v > 999999999) return { mensaje: 'Los secuenciales deben estar entre 1 y 999999999' };
    secuenciales.set(t.id, v);
  }
  const dup = await sql`select 1 from puntos_emisior where id_emisor = ${s.emisorId} and numero_establecimiento = ${estab}
    and numero_emision = ${pto} ${id ? sql`and id <> ${id}` : sql``}`;
  if (dup.length) return { mensaje: `Ya existe el punto ${estab}-${pto}` };
  if (bodega) {
    const [ok] = await sql`select 1 from bodegas where id = ${bodega} and id_emisor = ${s.emisorId}`;
    if (!ok) return { mensaje: 'Bodega no válida' };
  }

  let nuevo = id;
  await sql.begin(async (tx) => {
    if (!bodega) {
      // Sin bodegas: se crea la bodega principal del emisor
      const [b] = await tx<{ id: number }[]>`
        insert into bodegas (id_emisor, codigo, nombre, activa) values (${s.emisorId}, '001', 'BODEGA PRINCIPAL', true) returning id`;
      bodega = b.id;
    }
    if (id) {
      const r = await tx`update puntos_emisior set numero_establecimiento = ${estab}, numero_emision = ${pto}, direccion = ${direccion},
        id_bodega = ${bodega}, fecha_modificacion = now() at time zone 'America/Guayaquil'
        where id = ${id} and id_emisor = ${s.emisorId} returning id`;
      if (!r.length) throw new Error('Punto no encontrado');
    } else {
      const [r] = await tx<{ id: number }[]>`insert into puntos_emisior (id_emisor, numero_establecimiento, numero_emision, direccion, id_bodega)
        values (${s.emisorId}, ${estab}, ${pto}, ${direccion}, ${bodega}) returning id`;
      nuevo = r.id;
    }
    for (const [tipo, v] of secuenciales) {
      const r = await tx`update secuencias set secuencial = ${v} where id_punto_emision = ${nuevo} and id_documentos = ${tipo} returning id`;
      if (!r.length) await tx`insert into secuencias (id_punto_emision, id_documentos, secuencial) values (${nuevo}, ${tipo}, ${v})`;
    }
  });
  revalidatePath('/configuracion/puntos-emision');
  redirect(`/configuracion/puntos-emision/${nuevo}?guardado=1`);
}

export async function eliminarPunto(form: FormData) {
  const s = await requerirEmisor();
  const id = Number(form.get('id'));
  const [uso] = await sql<{ n: number }[]>`
    select (select count(*) from factura where id_punto_emison = ${id})
      + (select count(*) from liquidacion_compra where id_punto_emison = ${id})
      + (select count(*) from nota_credito where id_punto_emision = ${id})
      + (select count(*) from nota_debito where id_punto_emision = ${id})
      + (select count(*) from guia_remision where id_punto_emision = ${id})
      + (select count(*) from retencion where id_punto_emision = ${id})
      + (select count(*) from pedido where id_punto_emison = ${id}) n`;
  if (uso.n > 0) redirect(`/configuracion/puntos-emision/${id}?error=uso`);
  await sql.begin(async (tx) => {
    const [p] = await tx`select 1 from puntos_emisior where id = ${id} and id_emisor = ${s.emisorId}`;
    if (!p) return;
    await tx`delete from secuencias where id_punto_emision = ${id}`;
    await tx`delete from puntos_emisior where id = ${id}`;
  });
  revalidatePath('/configuracion/puntos-emision');
  redirect('/configuracion/puntos-emision');
}
