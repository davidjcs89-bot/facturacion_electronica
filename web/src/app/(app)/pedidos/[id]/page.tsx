import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { puntosEmision } from '@/lib/catalogos';
import { fecha } from '@/lib/formato';
import { Cabecera, Estado } from '@/components/ui';
import { Totales } from '@/components/comprobante/Totales';
import { ESTADO } from '@/lib/constantes';
import { PEDIDO, lineasDoc } from '../../proformas/_comun/lineas';
import { EditorLineas, FormConvertir, FormCorreo } from '../../proformas/_comun/EditorLineas';
import { FormPedido, Abonos } from '../Formularios';
import { actualizarPedido, agregarLineaPedido, actualizarLineaPedido, eliminarLineaPedido, convertirPedido, enviarPedido, cambiarEstadoPedido, eliminarPedido } from '../actions';

export default async function VerPedido({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerirEmisor();
  const id = Number((await params).id) || 0;
  const [p] = await sql`select x.*, c.nombre_cliente, c.identificacion, c.correo from pedido x join clientes c on c.id = x.id_cliente
    where x.id = ${id} and x.id_emisor = ${s.emisorId}`;
  if (!p) notFound();
  const [lineas, puntos, abonos] = await Promise.all([
    lineasDoc(PEDIDO, id), puntosEmision(s.emisorId),
    sql<{ id: number; fecha: Date; valor: number; descripcion: string | null }[]>`select id, fecha, valor, descripcion from abonos_pedido where id_pedido = ${id} order by fecha`,
  ]);
  const pendiente = p.estado === ESTADO.PENDIENTE;
  const opcPuntos = puntos.map((x) => ({ id: x.id, texto: `${x.numero_establecimiento}-${x.numero_emision} · ${x.direccion}` }));
  const abonado = abonos.reduce((a, x) => a + Number(x.valor), 0);
  const estadoBtn = (estado: number, texto: string, clase = 'btn') => (
    <form action={cambiarEstadoPedido}><input type="hidden" name="id" value={id} /><input type="hidden" name="estado" value={estado} /><button className={clase}>{texto}</button></form>
  );
  return (
    <>
      <Cabecera titulo={`Pedido N.º ${p.numero}`} sub={<>{p.nombre_cliente} · {fecha(p.fecha_creacion)} · <Estado id={p.estado} /></>}>
        <a className="btn" href={`/pedidos/${id}/pdf`} target="_blank" rel="noreferrer">Ver PDF</a>
        {pendiente && estadoBtn(ESTADO.FINALIZADO, 'Finalizar')}
        {p.estado === ESTADO.FINALIZADO && estadoBtn(ESTADO.PENDIENTE, 'Reabrir')}
        {p.estado !== ESTADO.ANULADO && estadoBtn(ESTADO.ANULADO, 'Anular', 'btn peligro')}
        <Link className="btn" href="/pedidos">Volver</Link>
      </Cabecera>
      {pendiente && <FormPedido id={id} accion={actualizarPedido} boton="Guardar datos" puntos={opcPuntos}
        valores={{ punto: p.id_punto_emison, cliente: { id: p.id_cliente, nombre: p.nombre_cliente, identificacion: p.identificacion } }} />}
      <EditorLineas id={id} editable={pendiente} agregar={agregarLineaPedido} actualizar={actualizarLineaPedido} eliminar={eliminarLineaPedido}
        lineas={lineas.map((l) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre, adicional: l.adicional, cantidad: Number(l.cantidad),
          pvp: Math.round(Number(l.precio_unitario) * (1 + Number(l.iva_pct) / 100) * 100) / 100, descuento_pct: Number(l.descuento_pct),
          sub_total: Number(l.sub_total), valor_iva: Number(l.valor_iva), total: Number(l.total) }))} />
      <div className="grid c2">
        <div>
          <Abonos id={id} abonos={abonos} saldo={Number(p.total) - abonado} editable={p.estado !== ESTADO.ANULADO} />
          {p.estado !== ESTADO.ANULADO && <FormConvertir id={id} accion={convertirPedido} puntos={opcPuntos} />}
          <FormCorreo id={id} correo={p.correo} accion={enviarPedido} />
          {pendiente && <form action={eliminarPedido}><input type="hidden" name="id" value={id} /><button className="btn peligro">Eliminar pedido</button></form>}
        </div>
        <Totales f={{ subtotal_iva: p.subtotal_iva, subtotal_iva_cero: p.subtotal_iva_cero, subtotal_no_objeto_iva: p.subtotal_no_objeto_iva, subtotal_excento_iva: p.subtotal_excento_iva, subtotal_sin_impuestos: p.subtotal_sin_impuestos, total_descuento: p.total_descuento, valor_iva: p.valor_iva, valor_ice: p.valor_ice, valor_irbpnr: p.valor_irbpnr, total: p.total }} />
      </div>
    </>
  );
}
