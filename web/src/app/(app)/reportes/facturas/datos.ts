import 'server-only';
import { sql } from '@/lib/db';

export type FilaReporte = {
  Fecha_emision: string; Numero: string; Clave_de_Acceso: string; autorizacion: string; fecha_autorizacion?: string;
  Subtotal_iva: number; Subtotal_iva_cero: number; Subtotal_no_objeto_iva: number; Subtotal_excento_iva: number;
  Valor_iva: number; Total: number; nid_cliente: string; cliente: string; estado: string; info_adicional?: string;
  forma_pago?: string; ruc_emisor: string;
};

export function rangoPorDefecto(p: Record<string, string | undefined>) {
  const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(p.desde ?? '') ? p.desde! : hoy.slice(0, 8) + '01';
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(p.hasta ?? '') ? p.hasta! : hoy;
  return { desde, hasta };
}

/** Facturas autorizadas del emisor (funcion sp_reporte_facturas migrada de SQL Server) */
export async function reporteFacturas(emisorId: number, desde: string, hasta: string): Promise<FilaReporte[]> {
  const [r] = await sql<{ j: { data: FilaReporte[] } | null }[]>`select sp_reporte_facturas(${emisorId}, ${desde}, ${hasta + ' 23:59:59'}) j`;
  return r?.j?.data ?? [];
}
