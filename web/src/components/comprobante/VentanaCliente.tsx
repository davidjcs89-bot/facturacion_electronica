'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formularioCliente, datosCliente, type ClienteBusqueda, type ClienteEdicion, type OpcionCatalogo } from '@/app/(app)/comprobantes/busquedas';
import { guardarClienteVentana } from '@/app/(app)/clientes/actions';

/**
 * Ventana emergente para crear o editar un cliente sin salir del comprobante.
 * Se dibuja fuera del formulario del comprobante (portal) para no anidar formularios.
 */
export function VentanaCliente({ idCliente, tipoCliente = 1, textoInicial, onCerrar, onGuardado }: {
  idCliente?: number; tipoCliente?: number; textoInicial?: string;
  onCerrar: () => void; onGuardado: (c: ClienteBusqueda) => void;
}) {
  const [datos, setDatos] = useState<{ tiposId: OpcionCatalogo[]; tiposCli: OpcionCatalogo[]; cliente: ClienteEdicion | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const editar = !!idCliente;

  useEffect(() => {
    formularioCliente(idCliente).then(setDatos).catch((e) => setError((e as Error).message));
  }, [idCliente]);

  // Cerrar con Esc y bloquear el desplazamiento de la pagina de fondo
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onCerrar(); };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [onCerrar, guardando]);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!form.current) return;
    setGuardando(true);
    setError(null);
    const r = await guardarClienteVentana(new FormData(form.current));
    if (r.error || !r.id) {
      setError(r.error ?? 'No se pudo guardar');
      setGuardando(false);
      return;
    }
    const c = await datosCliente(r.id);
    setGuardando(false);
    if (c) onGuardado(c);
  }

  // Si lo escrito en la busqueda son numeros, se propone como identificacion; si no, como nombre
  const inicialEsNumero = !!textoInicial && /^\d+$/.test(textoInicial.trim());
  const c = datos?.cliente;

  const contenido = (
    <div role="dialog" aria-modal="true" aria-label={editar ? 'Editar cliente' : 'Nuevo cliente'}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15, 23, 42, .45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
      <div className="card" style={{ width: '100%', maxWidth: 640, margin: 0 }}>
        <div className="acciones" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{editar ? 'Editar datos del cliente' : 'Nuevo cliente'}</h2>
          <button type="button" className="btn chico" onClick={onCerrar} disabled={guardando} aria-label="Cerrar">✕</button>
        </div>
        {error && <div className="alerta error">{error}</div>}
        {!datos ? (
          !error && <p className="muted">Cargando…</p>
        ) : editar && !c ? (
          <div className="alerta error">No se encontró el cliente.</div>
        ) : (
          <form ref={form} onSubmit={guardar}>
            {c && <input type="hidden" name="id" value={c.id} />}
            <div className="form-grid">
              <div className="campo ancho" style={{ gridColumn: '1 / -1' }}><label>Nombre o razón social *</label>
                <input name="nombre_cliente" required maxLength={200} autoFocus
                  defaultValue={c?.nombre_cliente ?? (!inicialEsNumero ? textoInicial ?? '' : '')} /></div>
              <div className="campo"><label>Tipo de identificación *</label>
                <select name="tipo_identificacion" defaultValue={c?.tipo_identificacion ?? 2}>
                  {datos.tiposId.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
                </select>
              </div>
              <div className="campo"><label>Identificación *</label>
                <input name="identificacion" required maxLength={13} inputMode="numeric"
                  defaultValue={c?.identificacion ?? (inicialEsNumero ? textoInicial?.trim() : '')} /></div>
              <div className="campo ancho" style={{ gridColumn: '1 / -1' }}><label>Correo(s)</label>
                <input name="correo" type="text" inputMode="email" maxLength={100} placeholder="separe varios con ;"
                  defaultValue={c?.correo?.toLowerCase() ?? ''} />
                <span className="muted" style={{ fontSize: '0.8rem' }}>A este correo se envía la factura autorizada.</span></div>
              <div className="campo ancho" style={{ gridColumn: '1 / -1' }}><label>Dirección</label>
                <input name="direccion" maxLength={200} defaultValue={c?.direccion ?? ''} /></div>
              <div className="campo"><label>Celular</label><input name="telefono_movil" inputMode="tel" maxLength={15} defaultValue={c?.telefono_movil ?? ''} /></div>
              <div className="campo"><label>Teléfono fijo</label><input name="telefono_fijo" inputMode="tel" maxLength={15} defaultValue={c?.telefono_fijo ?? ''} /></div>
              <div className="campo"><label>Tipo de cliente</label>
                <select name="tipo_cliente" defaultValue={c?.tipo_cliente ?? tipoCliente}>
                  {datos.tiposCli.map((t) => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
                </select>
              </div>
              <div className="campo"><label>Código</label><input name="codigo" maxLength={500} defaultValue={c?.codigo ?? ''} /></div>
            </div>
            <div className="acciones" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={onCerrar} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn primario" disabled={guardando}>
                {guardando ? 'Guardando…' : editar ? 'Guardar cambios' : 'Crear y elegir'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
  return typeof document === 'undefined' ? null : createPortal(contenido, document.body);
}
