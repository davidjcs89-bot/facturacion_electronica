import Link from 'next/link';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { puntosEmision } from '@/lib/catalogos';
import { hoyEcuadorISO } from '@/lib/formato';
import { Cabecera, Alerta } from '@/components/ui';
import { FormNuevaGuia } from './FormNuevaGuia';

export default async function NuevaGuia() {
  const s = await requerirEmisor();
  const puntos = await puntosEmision(s.emisorId);
  const transportistas = await sql<{ id: number; nombre: string; numero_identificacion: string; placa: string }[]>`
    select id, nombre, numero_identificacion, placa from transportistas where id_emisor = ${s.emisorId} order by nombre`;
  const hoy = hoyEcuadorISO();
  return (
    <>
      <Cabecera titulo="Nueva guía de remisión" sub="Paso 1: transporte. Luego agregará destinatarios y productos." />
      {puntos.length === 0 && <Alerta tipo="aviso">Primero configure un punto de emisión en Configuración → Puntos de emisión.</Alerta>}
      {transportistas.length === 0 && <Alerta tipo="aviso">Primero registre un transportista en <Link href="/transportistas">Catálogos → Transportistas</Link>.</Alerta>}
      {puntos.length > 0 && transportistas.length > 0 && (
        <FormNuevaGuia
          puntos={puntos.map((p) => ({ id: p.id, texto: `${p.numero_establecimiento}-${p.numero_emision} · ${p.direccion}` }))}
          transportistas={transportistas.map((t) => ({ id: t.id, texto: `${t.nombre} · ${t.numero_identificacion}`, placa: t.placa }))}
          hoy={hoy} partida={puntos[0]?.direccion ?? ''} />
      )}
    </>
  );
}
