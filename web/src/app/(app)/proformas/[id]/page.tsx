import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { puntosEmision } from '@/lib/catalogos';
import { fechaInput } from '@/lib/formato';
import { Cabecera } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { PROFORMA, lineasDoc } from '../_comun/lineas';
import { EditorLineas, FormConvertir, FormCorreo } from '../_comun/EditorLineas';
import { FormCabecera } from '../FormCabecera';
import { actualizarProforma, agregarLineaProforma, actualizarLineaProforma, eliminarLineaProforma, eliminarProforma, convertirProforma, enviarProforma } from '../actions';

export default async function VerProforma({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [p] = await sql`select x.*, c.nombre_cliente, c.identificacion, c.correo from proforma x join clientes c on c.id = x.id_cliente
    where x.id = ${id} and x.id_emisor = ${s.emisorId}`;
  if (!p) notFound();
  const [lineas, puntos] = await Promise.all([lineasDoc(PROFORMA, id), puntosEmision(s.emisorId)]);
  return (
    <>
      <Cabecera titulo={`Proforma N.º ${p.numero}`} sub={p.nombre_cliente}>
        <a className="btn" href={`/proformas/${id}/pdf`} target="_blank" rel="noreferrer">Ver PDF</a>
        <Link className="btn" href="/proformas">Volver</Link>
      </Cabecera>
      <FormCabecera id={id} accion={actualizarProforma} boton="Guardar datos"
        valores={{ fecha: fechaInput(p.fecha_emision), observaciones: String(p.observaiones ?? '').trim(), cliente: { id: p.id_cliente, nombre: p.nombre_cliente, identificacion: p.identificacion } }} />
      <EditorLineas id={id} editable agregar={agregarLineaProforma} actualizar={actualizarLineaProforma} eliminar={eliminarLineaProforma}
        lineas={lineas.map((l) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre, adicional: l.adicional, cantidad: Number(l.cantidad),
          pvp: Math.round(Number(l.precio_unitario) * (1 + Number(l.iva_pct) / 100) * 100) / 100, descuento_pct: Number(l.descuento_pct),
          sub_total: Number(l.sub_total), valor_iva: Number(l.valor_iva), total: Number(l.total) }))} />
      <div className="grid c2">
        <div>
          <FormConvertir id={id} accion={convertirProforma} puntos={puntos.map((x) => ({ id: x.id, texto: `${x.numero_establecimiento}-${x.numero_emision} · ${x.direccion}` }))} />
          <FormCorreo id={id} correo={p.correo} accion={enviarProforma} />
          <form action={eliminarProforma}>
            <input type="hidden" name="id" value={id} />
            <button className="btn peligro">Eliminar proforma</button>
          </form>
        </div>
        <Totales f={{ subtotal_iva: p.subtotal_iva, subtotal_iva_cero: p.subtotal_iva_cero, subtotal_no_objeto_iva: p.subtotal_no_objeto_iva, subtotal_excento_iva: p.subtotal_excento_iva, subtotal_sin_impuestos: p.subtotal_sin_impuesto, total_descuento: p.total_descuento, valor_iva: p.valor_iva, valor_ice: p.valor_ice, valor_irbpnr: p.valor_irbpnr, total: p.total }} />
      </div>
    </>
  );
}
