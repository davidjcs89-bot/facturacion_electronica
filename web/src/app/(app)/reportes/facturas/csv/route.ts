import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/session';
import { reporteFacturas, rangoPorDefecto, type FilaReporte } from '../datos';

export const dynamic = 'force-dynamic';

const COLUMNAS: [keyof FilaReporte, string, boolean][] = [
  ['Fecha_emision', 'Fecha emisión', false], ['Numero', 'Número', false], ['Clave_de_Acceso', 'Clave de acceso', false],
  ['autorizacion', 'Autorización', false], ['fecha_autorizacion', 'Fecha autorización', false],
  ['nid_cliente', 'Identificación', false], ['cliente', 'Cliente', false],
  ['Subtotal_iva', 'Subtotal IVA', true], ['Subtotal_iva_cero', 'Subtotal 0%', true], ['Subtotal_no_objeto_iva', 'No objeto IVA', true],
  ['Subtotal_excento_iva', 'Exento IVA', true], ['Valor_iva', 'IVA', true], ['Total', 'Total', true],
  ['forma_pago', 'Forma de pago', false], ['estado', 'Estado', false], ['info_adicional', 'Información adicional', false], ['ruc_emisor', 'RUC emisor', false],
];

function celda(v: unknown, numero: boolean) {
  if (v == null) return '';
  if (numero) return Number(v).toFixed(2).replace('.', ',');
  const s = String(v);
  // texto: comillas y prefijo para que Excel no convierta claves largas en notacion cientifica
  const t = /^\d{11,}$/.test(s) ? `="${s}"` : s;
  return `"${t.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const s = await sesionActual();
  if (!s?.emisorId) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  const u = new URL(req.url);
  const { desde, hasta } = rangoPorDefecto({ desde: u.searchParams.get('desde') ?? undefined, hasta: u.searchParams.get('hasta') ?? undefined });
  const filas = await reporteFacturas(s.emisorId, desde, hasta);
  const lineas = [COLUMNAS.map((c) => `"${c[1]}"`).join(';'), ...filas.map((f) => COLUMNAS.map(([k, , n]) => celda(f[k], n)).join(';'))];
  return new NextResponse('﻿' + lineas.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="facturas-autorizadas-${desde}-a-${hasta}.csv"` },
  });
}
