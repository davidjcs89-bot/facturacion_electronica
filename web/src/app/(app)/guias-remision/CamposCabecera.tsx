'use client';
import { useState } from 'react';

type Opcion = { id: number; texto: string };
type Transportista = { id: number; texto: string; placa: string };

/** Campos comunes de la cabecera de la guia (crear y editar) */
export function CamposCabecera({ puntos, transportistas, valores }: {
  puntos: Opcion[]; transportistas: Transportista[];
  valores: { id_punto_emision?: number; id_transportista?: number; inicio: string; fin: string; partida: string; placa: string };
}) {
  const [placa, setPlaca] = useState(valores.placa);
  return (
    <div className="form-grid">
      <div className="campo"><label>Punto de emisión *</label>
        <select name="id_punto_emision" defaultValue={valores.id_punto_emision ?? puntos[0]?.id}>{puntos.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}</select>
      </div>
      <div className="campo"><label>Transportista *</label>
        <select name="id_transportista" defaultValue={valores.id_transportista ?? ''} onChange={(e) => {
          const t = transportistas.find((x) => x.id === Number(e.target.value));
          if (t) setPlaca(t.placa);
        }}>
          <option value="">— Elija —</option>
          {transportistas.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
        </select>
      </div>
      <div className="campo"><label>Placa *</label><input name="placa" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={20} /></div>
      <div className="campo"><label>Fecha inicio transporte *</label><input type="date" name="fecha_inicio_transporte" defaultValue={valores.inicio} required /></div>
      <div className="campo"><label>Fecha fin transporte *</label><input type="date" name="fecha_fin_transporte" defaultValue={valores.fin} required /></div>
      <div className="campo ancho"><label>Dirección de partida *</label><input name="direccion_partida" defaultValue={valores.partida} maxLength={70} required /></div>
    </div>
  );
}
