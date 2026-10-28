import 'server-only';
import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

function crear() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable DATABASE_URL');
  return postgres(url, {
    prepare: false, // requerido por el pooler de Supabase en modo transaccion
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: url.includes('127.0.0.1') || url.includes('localhost') ? false : 'require',
    types: {
      // numeric -> number (montos con 2 a 6 decimales caben sin perdida en double)
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      // bigint (count) -> number
      bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
    },
  });
}

export const sql = globalThis.__sql ?? (globalThis.__sql = crear());
export type Sql = typeof sql;
