'use client';
import { useActionState, useEffect, useState } from 'react';
import {
  actualizarCabecera, agregarDestinatario, eliminarDestinatario, agregarProducto, eliminarProducto,
  agregarAdicional, eliminarAdicional, eliminarBorrador, emitirGuia, type Estado,
} from '../../actions';
import { CamposCabecera } from '../../CamposCabecera';
import { SelectorCliente } from '@/components/comprobante/SelectorCliente';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import type { ProductoBusqueda } from '@/app/(app)/comprobantes/busquedas';

type Opcion = { id: number; texto: string };

function Msg({ e }: { e: Estado }) {
  if (!e.mensaje) return null;
  return <div className={`alerta ${e.ok ? 'ok' : 'error'}`}>{e.mensaje}</div>;
}

export function CabeceraGuia({ id, puntos, transportistas, valores }: {
  id: number; puntos: Opcion[]; transportistas: { id: number; texto: string; placa: string }[];
  valores: { id_punto_emision: number; id_transportista: number; inicio: string; fin: string; partida: string; placa: string };
}) {
  const [e, accion, pend] = useActionState<Estado, FormData>(actualizarCabecera, {});
  return (
    <form action={accion} className="card">
      <h2>Transporte</h2>
      <Msg e={e} />
      <input type="hidden" name="id" value={id} />
      <CamposCabecera puntos={puntos} transportistas={transportistas} valores={valores} />
      <div className="acciones" style={{ marginTop: 12 }}><button className="btn" disabled={pend}>{pend ? 'Guardando…' : 'Guardar datos de transporte'}</button></div>
    </form>
  );
}

type Producto = { id: number; codigo: string; nombre: string; cantidad: number };
type Destinatario = {
  id: number; nombre: string; identificacion: string; destino: string; motivo: string; factura: string; fechaFactura: string; ruta: string;
  productos: Producto[];
};

export function DestinatariosGuia({ id, destinatarios }: { id: number; destinatarios: Destinatario[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarDestinatario, {});
  const [abierto, setAbierto] = useState(destinatarios.length === 0);
  const [clave, setClave] = useState(0);
  useEffect(() => {
    if (e.ok) {
      setAbierto(false);
      setClave((k) => k + 1);
    }
  }, [e]);
  return (
    <div className="card">
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Destinatarios</h2>
        {!abierto && <button type="button" className="btn" onClick={() => setAbierto(true)}>+ Agregar destinatario</button>}
      </div>
      <Msg e={e} />
      {abierto && (
        <form action={accion} key={clave} style={{ marginTop: 12, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <input type="hidden" name="id" value={id} />
          <div className="form-grid">
            <SelectorCliente inicial={null} tipo={3} etiqueta="Destinatario" />
            <div className="campo"><label>Motivo del traslado *</label><input name="motivo_traslado" defaultValue="VENTA" maxLength={80} required /></div>
            <div className="campo ancho"><label>Dirección de destino (vacío = dirección del destinatario)</label><input name="direccion_destino" maxLength={80} /></div>
            <div className="campo"><label>Factura (001-001-000000001)</label><input name="numero_factura" placeholder="Opcional" /></div>
            <div className="campo"><label>N.º autorización de la factura</label><input name="numero_autorizacion_fac" placeholder="Se completa si la factura es del sistema" /></div>
            <div className="campo"><label>Fecha de la factura</label><input type="date" name="fecha_emision_factura" /></div>
            <div className="campo check" style={{ alignSelf: 'end' }}><input type="checkbox" id={`cp${clave}`} name="copiar_productos" defaultChecked /><label htmlFor={`cp${clave}`}>Copiar productos de la factura del sistema</label></div>
            <div className="campo"><label>Cód. establecimiento destino</label><input name="codigo_estable_destino" maxLength={3} placeholder="001" /></div>
            <div className="campo"><label>Documento aduanero</label><input name="documento_aduanero" maxLength={50} /></div>
            <div className="campo ancho"><label>Ruta</label><input name="ruta" maxLength={300} /></div>
          </div>
          <div className="acciones" style={{ marginTop: 12 }}>
            <button className="btn primario" disabled={pend}>{pend ? 'Agregando…' : 'Agregar destinatario'}</button>
            {destinatarios.length > 0 && <button type="button" className="btn" onClick={() => setAbierto(false)}>Cancelar</button>}
          </div>
        </form>
      )}
      {destinatarios.map((d, i) => <BloqueDestinatario key={d.id} id={id} d={d} n={i + 1} />)}
      {destinatarios.length === 0 && !abierto && <p className="muted">Aún no hay destinatarios.</p>}
    </div>
  );
}

function BloqueDestinatario({ id, d, n }: { id: number; d: Destinatario; n: number }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarProducto, {});
  const [prod, setProd] = useState<ProductoBusqueda | null>(null);
  useEffect(() => {
    if (e.ok) setProd(null);
  }, [e]);
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <div>
          <strong>{n}. {d.nombre}</strong> · {d.identificacion}
          <div className="muted" style={{ fontSize: '0.88rem' }}>
            Destino: {d.destino || '—'} · Motivo: {d.motivo}{d.factura ? ` · Factura ${d.factura} (${d.fechaFactura})` : ''}{d.ruta ? ` · Ruta: ${d.ruta}` : ''}
          </div>
        </div>
        <form action={eliminarDestinatario}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="id_destinatario" value={d.id} />
          <button className="btn chico peligro" onClick={(ev) => { if (!confirm('¿Quitar este destinatario y sus productos?')) ev.preventDefault(); }}>Quitar destinatario</button>
        </form>
      </div>
      <Msg e={e} />
      <form action={accion} className="filtros" style={{ marginTop: 8 }} key={prod?.id ?? 'nuevo'}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="id_destinatario" value={d.id} />
        <input type="hidden" name="id_producto" value={prod?.id ?? ''} />
        <div className="campo busqueda">
          <label>Producto</label>
          {prod ? (
            <div className="acciones" style={{ justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
              <span><strong>{prod.codigo}</strong> · {prod.nombre}</span>
              <button type="button" className="btn chico" onClick={() => setProd(null)}>Cambiar</button>
            </div>
          ) : <BuscadorProducto onElegir={setProd} />}
        </div>
        <div className="campo" style={{ minWidth: 90, maxWidth: 110 }}><label>Cantidad</label><input name="cantidad" type="number" min="1" step="1" defaultValue={1} /></div>
        <button className="btn" disabled={pend || !prod}>{pend ? 'Agregando…' : 'Agregar'}</button>
      </form>
      {d.productos.length > 0 ? (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cantidad</th><th></th></tr></thead>
            <tbody>
              {d.productos.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap">{p.codigo}</td><td>{p.nombre}</td><td className="num">{p.cantidad}</td>
                  <td>
                    <form action={eliminarProducto}>
                      <input type="hidden" name="id" value={id} /><input type="hidden" name="id_detalle" value={p.id} />
                      <button className="btn chico peligro">Quitar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">Sin productos: agregue al menos uno.</p>}
    </div>
  );
}

export function AdicionalesGuia({ id, adicionales }: { id: number; adicionales: { id: number; nombre: string; descripcion: string }[] }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(agregarAdicional, {});
  return (
    <div className="card">
      <h2>Información adicional</h2>
      <Msg e={e} />
      {adicionales.map((a) => (
        <div key={a.id} className="acciones" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span><strong>{a.nombre}:</strong> {a.descripcion}</span>
          <form action={eliminarAdicional}><input type="hidden" name="id" value={id} /><input type="hidden" name="id_adicional" value={a.id} /><button className="btn chico peligro">Quitar</button></form>
        </div>
      ))}
      <form action={accion} className="filtros" style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={id} />
        <div className="campo" style={{ minWidth: 120 }}><label>Nombre</label><input name="nombre" maxLength={50} /></div>
        <div className="campo busqueda"><label>Descripción</label><input name="descripcion" maxLength={300} /></div>
        <button className="btn" disabled={pend}>Agregar</button>
      </form>
    </div>
  );
}

export function BotonesGuia({ id, permitido }: { id: number; permitido: boolean }) {
  const [e, accion, pend] = useActionState<Estado, FormData>(emitirGuia, {});
  return (
    <div className="card">
      <Msg e={e} />
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <form action={eliminarBorrador}>
          <input type="hidden" name="id" value={id} />
          <button className="btn peligro" onClick={(ev) => { if (!confirm('¿Eliminar este borrador?')) ev.preventDefault(); }}>Eliminar borrador</button>
        </form>
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <button className="btn primario" disabled={pend || !permitido}
            onClick={(ev) => { if (!confirm('Se asignará el número, se firmará y se enviará al SRI. ¿Continuar?')) ev.preventDefault(); }}>
            {pend ? 'Emitiendo…' : 'Emitir guía'}
          </button>
        </form>
      </div>
    </div>
  );
}
