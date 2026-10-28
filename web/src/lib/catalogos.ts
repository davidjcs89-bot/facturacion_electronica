import 'server-only';
import { sql } from './db';

export async function tiposIdentificacion() {
  return sql<{ id: number; descripcion: string; codigo: string }[]>`select id, descripcion, codigo from tipo_identificacion order by id`;
}
export async function tiposCliente() {
  return sql<{ id: number; descripcion: string; codigo: string }[]>`select id, descripcion, codigo from tipo_cliente order by id`;
}
export async function formasPago() {
  return sql<{ id: number; codigo: string; descripcion_form_pago: string }[]>`select id, codigo, descripcion_form_pago from formas_de_pago order by id`;
}
export async function puntosEmision(emisorId: number) {
  return sql<{ id: number; numero_establecimiento: string; numero_emision: string; direccion: string; id_bodega: number }[]>`
    select id, numero_establecimiento, numero_emision, direccion, id_bodega from puntos_emisior where id_emisor = ${emisorId} order by numero_establecimiento, numero_emision`;
}
export async function bodegas(emisorId: number) {
  return sql<{ id: number; codigo: string; nombre: string; activa: boolean }[]>`
    select id, codigo, nombre, activa from bodegas where id_emisor = ${emisorId} order by nombre`;
}
