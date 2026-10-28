'use server';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { texto } from '@/lib/params';
import type { EstadoForm } from '../admin/_comun/Msg';

async function clienteDelEmisor(idCliente: number) {
  const s = await requerirEmisor();
  const [c] = await sql`select 1 from clientes where id = ${idCliente} and id_emisor = ${s.emisorId}`;
  if (!c) throw new Error('Cliente no encontrado');
  return s;
}

/** Guarda los valores de la ficha (un valor por atributo; vacio = se borra) */
export async function guardarFicha(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const idCliente = Number(form.get('id_cliente'));
    const s = await clienteDelEmisor(idCliente);
    const atributos = await sql<{ id: number }[]>`select id from atributos_fichas_clientes where id_emisor = ${s.emisorId}`;
    await sql.begin(async (tx) => {
      for (const a of atributos) {
        const valor = texto(form.get(`attr_${a.id}`));
        await tx`delete from fichas_clientes where id_cliente = ${idCliente} and id_atributo = ${a.id}`;
        if (valor) await tx`insert into fichas_clientes (id_cliente, id_atributo, valor) values (${idCliente}, ${a.id}, ${valor})`;
      }
    });
    revalidatePath(`/clientes/${idCliente}`);
    return { ok: true, mensaje: 'Ficha guardada' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function agregarNota(_p: EstadoForm, form: FormData): Promise<EstadoForm> {
  try {
    const idCliente = Number(form.get('id_cliente'));
    const s = await clienteDelEmisor(idCliente);
    const nota = texto(form.get('nota'));
    if (!nota) return { mensaje: 'Escriba la nota' };
    await sql`insert into datos_adicionales_cliente (id_cliente, nota, fecha_creacion, id_usuario)
      values (${idCliente}, ${nota}, now() at time zone 'America/Guayaquil', ${s.uid})`;
    revalidatePath(`/clientes/${idCliente}`);
    return { ok: true, mensaje: 'Nota agregada' };
  } catch (e) {
    return { mensaje: (e as Error).message };
  }
}

export async function eliminarNota(form: FormData) {
  const idCliente = Number(form.get('id_cliente'));
  await clienteDelEmisor(idCliente);
  await sql`delete from datos_adicionales_cliente where id = ${Number(form.get('id_nota'))} and id_cliente = ${idCliente}`;
  revalidatePath(`/clientes/${idCliente}`);
}
