import 'server-only';
import { sql } from '@/lib/db';

export async function opcionesUsuario() {
  const [emisores, roles, categorias] = await Promise.all([
    sql<{ id: number; texto: string }[]>`select id, ruc || ' · ' || razon_social texto from emisor where estado <> 3 order by razon_social`,
    sql<{ id: number; texto: string }[]>`select id, case id when 1 then 'Administrador del sistema' when 2 then 'Administrador de empresa' else nombre end texto from rol_usuario order by id`,
    sql<{ id: number; texto: string }[]>`select id, descripcion texto from categoria_usuarios order by id`,
  ]);
  return { emisores, roles, categorias };
}
