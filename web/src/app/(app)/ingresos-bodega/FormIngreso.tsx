'use client';
import { useActionState, useState } from 'react';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';
import { guardarIngreso, productosPorCodigo, type EstadoForm } from './actions';

type Linea = { id_producto: number; codigo: string; nombre: string; cantidad: number };

/** Lista de productos y cantidades armada en el navegador (tambien sirve para transferencias) */
export function ListaProductos({ lineas, setLineas }: { lineas: Linea[]; setLineas: (l: Linea[]) => void }) {
  const [cant, setCant] = useState(1);
  const [pegado, setPegado] = useState('');
  const [aviso, setAviso] = useState('');
  const agregar = (l: Linea) => {
    const i = lineas.findIndex((x) => x.id_producto === l.id_producto);
    if (i >= 0) setLineas(lineas.map((x, k) => (k === i ? { ...x, cantidad: x.cantidad + l.cantidad } : x)));
    else setLineas([...lineas, l]);
  };
  const procesarPegado = async () => {
    const filas = pegado.split(/\r?\n/).map((f) => f.split(/[\t;,]/).map((x) => x.trim())).filter((f) => f[0]);
    const prods = await productosPorCodigo(filas.map((f) => f[0]));
    const faltan: string[] = [];
    let nuevas = [...lineas];
    for (const [codigo, c] of filas) {
      const p = prods.find((x) => x.codigo.toUpperCase() === codigo.toUpperCase());
      const n = parseInt(c ?? '', 10);
      if (!p || !(n > 0)) { faltan.push(codigo); continue; }
      const i = nuevas.findIndex((x) => x.id_producto === p.id);
      nuevas = i >= 0 ? nuevas.map((x, k) => (k === i ? { ...x, cantidad: x.cantidad + n } : x)) : [...nuevas, { id_producto: p.id, codigo: p.codigo, nombre: p.nombre, cantidad: n }];
    }
    setLineas(nuevas);
    setPegado('');
    setAviso(faltan.length ? `No se cargaron (código inexistente o cantidad no válida): ${faltan.join(', ')}` : '');
  };
  return (
    <div className="card">
      <h2>Productos</h2>
      <div className="filtros">
        <div className="campo busqueda"><label>Agregar producto</label>
          <BuscadorProducto onElegir={(p) => agregar({ id_producto: p.id, codigo: p.codigo, nombre: p.nombre, cantidad: cant })} />
        </div>
        <div className="campo" style={{ maxWidth: 110 }}><label>Cantidad</label><input type="number" min={1} step={1} value={cant} onChange={(e) => setCant(Math.max(1, parseInt(e.target.value || '1', 10)))} /></div>
      </div>
      <details style={{ marginBottom: 10 }}>
        <summary className="muted">Pegar desde Excel (columnas: código y cantidad)</summary>
        <textarea rows={4} value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder={'PROD001\t10\nPROD002\t5'} style={{ marginTop: 6 }} />
        <button type="button" className="btn chico" style={{ marginTop: 6 }} onClick={procesarPegado}>Cargar</button>
      </details>
      {aviso && <div className="alerta aviso">{aviso}</div>}
      {lineas.length > 0 ? (
        <table className="tabla">
          <thead><tr><th>Código</th><th>Producto</th><th className="num">Cantidad</th><th></th></tr></thead>
          <tbody>{lineas.map((l, i) => (
            <tr key={l.id_producto}>
              <td>{l.codigo}</td><td>{l.nombre}</td>
              <td className="num"><input type="number" min={1} step={1} value={l.cantidad} style={{ width: 90 }}
                onChange={(e) => setLineas(lineas.map((x, k) => (k === i ? { ...x, cantidad: Math.max(1, parseInt(e.target.value || '1', 10)) } : x)))} /></td>
              <td><button type="button" className="btn chico peligro" onClick={() => setLineas(lineas.filter((_, k) => k !== i))}>Quitar</button></td>
            </tr>))}
          </tbody>
        </table>
      ) : <p className="muted">Aún no hay productos.</p>}
    </div>
  );
}

export function FormIngreso({ bodegas, hoy }: { bodegas: { id: number; nombre: string }[]; hoy: string }) {
  const [e, act, pend] = useActionState<EstadoForm, FormData>(guardarIngreso, {});
  const [lineas, setLineas] = useState<Linea[]>([]);
  return (
    <form action={act}>
      {e.mensaje && <div className="alerta error">{e.mensaje}</div>}
      <input type="hidden" name="lineas" value={JSON.stringify(lineas.map((l) => ({ id_producto: l.id_producto, cantidad: l.cantidad })))} />
      <div className="card">
        <div className="form-grid">
          <div className="campo"><label>Bodega *</label><select name="id_bodega">{bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
          <div className="campo"><label>Fecha *</label><input type="date" name="fecha" defaultValue={hoy} /></div>
        </div>
      </div>
      <ListaProductos lineas={lineas} setLineas={setLineas} />
      <button className="btn primario" disabled={pend || !lineas.length}>{pend ? 'Guardando…' : 'Registrar ingreso'}</button>
    </form>
  );
}
