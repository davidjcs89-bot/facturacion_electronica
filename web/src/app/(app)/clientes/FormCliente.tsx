'use client';
import { useActionState } from 'react';
import { guardarCliente, type EstadoForm } from './actions';

type Cliente = {
  id?: number; nombre_cliente?: string; tipo_identificacion?: number; tipo_cliente?: number; identificacion?: string;
  telefono_fijo?: string | null; telefono_movil?: string | null; direccion?: string | null; correo?: string | null; codigo?: string | null;
};
type Opcion = { id: number; descripcion: string };

export function FormCliente({ cliente, tiposId, tiposCli, volver }: { cliente: Cliente; tiposId: Opcion[]; tiposCli: Opcion[]; volver?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarCliente, {});
  return (
    <form action={accion} className="card">
      {estado.error && <div className="alerta error">{estado.error}</div>}
      {cliente.id && <input type="hidden" name="id" value={cliente.id} />}
      {volver && <input type="hidden" name="volver" value={volver} />}
      <div className="form-grid">
        <div className="campo ancho"><label>Nombre o razón social *</label><input name="nombre_cliente" defaultValue={cliente.nombre_cliente} required maxLength={200} /></div>
        <div className="campo"><label>Tipo de identificación *</label>
          <select name="tipo_identificacion" defaultValue={cliente.tipo_identificacion ?? 2}>
            {tiposId.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
          </select>
        </div>
        <div className="campo"><label>Identificación *</label><input name="identificacion" defaultValue={cliente.identificacion} required maxLength={13} /></div>
        <div className="campo"><label>Tipo de cliente *</label>
          <select name="tipo_cliente" defaultValue={cliente.tipo_cliente ?? 1}>
            {tiposCli.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
          </select>
        </div>
        <div className="campo"><label>Código</label><input name="codigo" defaultValue={cliente.codigo ?? ''} maxLength={500} /></div>
        <div className="campo"><label>Correo(s)</label><input name="correo" defaultValue={cliente.correo?.toLowerCase() ?? ''} maxLength={100} placeholder="separe varios con ;" /></div>
        <div className="campo"><label>Celular</label><input name="telefono_movil" defaultValue={cliente.telefono_movil ?? ''} maxLength={15} /></div>
        <div className="campo"><label>Teléfono fijo</label><input name="telefono_fijo" defaultValue={cliente.telefono_fijo ?? ''} maxLength={15} /></div>
        <div className="campo ancho"><label>Dirección</label><input name="direccion" defaultValue={cliente.direccion ?? ''} maxLength={200} /></div>
      </div>
      <div className="acciones" style={{ marginTop: 16 }}>
        <button className="btn primario" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}
