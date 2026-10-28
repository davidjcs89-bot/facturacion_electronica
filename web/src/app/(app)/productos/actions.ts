'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requerirEmisor } from '@/lib/auth';
import { sql } from '@/lib/db';
import { decimal, entero, texto } from '@/lib/params';
import type { EstadoForm } from '../admin/_comun/Msg';

const NO_APLICA_ICE = 99;
const NO_APLICA_IRBPNR = 100;

export async function guardarProducto(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const s = await requerirEmisor();
  const id = entero(form.get('id'));
  const fechaElab = texto(form.get('fecha_elavoracionproducto'));
  const fechaCad = texto(form.get('fecha_caducidadproducto'));
  const datos = {
    codigo: texto(form.get('codigo')),
    codigo_auxiliar: texto(form.get('codigo_auxiliar')) || null,
    nombre: texto(form.get('nombre')).toUpperCase(),
    tipo_producto: entero(form.get('tipo_producto')) ?? 1,
    precio: decimal(form.get('precio')),
    codigo_iva: entero(form.get('codigo_iva')),
    codigo_ice: entero(form.get('codigo_ice')) ?? NO_APLICA_ICE,
    codigo_irbpnr: entero(form.get('codigo_irbpnr')) ?? NO_APLICA_IRBPNR,
    costo_producto: decimal(form.get('costo_producto')) ?? 0,
    fecha_elavoracionproducto: /^\d{4}-\d{2}-\d{2}$/.test(fechaElab) ? fechaElab : null,
    fecha_caducidadproducto: /^\d{4}-\d{2}-\d{2}$/.test(fechaCad) ? fechaCad : null,
  };
  if (!datos.codigo) return { mensaje: 'Ingrese el código principal' };
  if (datos.codigo.length > 25) return { mensaje: 'El código principal no puede superar 25 caracteres (límite del SRI)' };
  if (datos.codigo_auxiliar && datos.codigo_auxiliar.length > 25) return { mensaje: 'El código auxiliar no puede superar 25 caracteres (límite del SRI)' };
  if (!datos.nombre) return { mensaje: 'Ingrese el nombre del producto' };
  if (datos.nombre.length > 300) return { mensaje: 'El nombre no puede superar 300 caracteres (límite del SRI)' };
  if (datos.precio == null || datos.precio < 0.01) return { mensaje: 'El precio debe ser mayor a cero' };
  if (!datos.codigo_iva) return { mensaje: 'Elija el porcentaje de IVA' };
  if (datos.costo_producto < 0) return { mensaje: 'El costo no puede ser negativo' };
  // Los impuestos deben ser del tipo correcto
  const imp = await sql<{ id: number; id_impuesto: number }[]>`
    select id, id_impuesto from porcentaje_impuesto_producto where id in ${sql([datos.codigo_iva, datos.codigo_ice, datos.codigo_irbpnr])}`;
  const tipoDe = (x: number) => imp.find((i) => i.id === x)?.id_impuesto;
  if (![1, 4].includes(tipoDe(datos.codigo_iva) ?? 0)) return { mensaje: 'IVA no válido' };
  if (tipoDe(datos.codigo_ice) !== 2) return { mensaje: 'ICE no válido' };
  if (tipoDe(datos.codigo_irbpnr) !== 3) return { mensaje: 'IRBPNR no válido' };

  const dup = await sql`
    select 1 from producto where id_emisor = ${s.emisorId} and upper(codigo) = upper(${datos.codigo}) ${id ? sql`and id <> ${id}` : sql``} limit 1`;
  if (dup.length) return { mensaje: 'Ya existe un producto con este código' };

  const atributos: { atributo: string; valor: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = texto(form.get(`atributo_${i}`)).slice(0, 20);
    const v = texto(form.get(`valor_${i}`)).slice(0, 20);
    if (a && v) atributos.push({ atributo: a, valor: v });
  }

  let nuevoId = id;
  await sql.begin(async (tx) => {
    if (id) {
      const r = await tx`
        update producto set ${tx(datos)}, fecha_modificacion = now() at time zone 'America/Guayaquil'
        where id = ${id} and id_emisor = ${s.emisorId} returning id`;
      if (!r.length) throw new Error('Producto no encontrado');
    } else {
      const [r] = await tx<{ id: number }[]>`insert into producto ${tx({ ...datos, id_emisor: s.emisorId })} returning id`;
      nuevoId = r.id;
    }
    await tx`delete from atributos_adicionales_producto where id_producto = ${nuevoId}`;
    for (const a of atributos) await tx`insert into atributos_adicionales_producto ${tx({ ...a, id_producto: nuevoId! })}`;
  });
  revalidatePath('/productos');
  redirect(`/productos/${nuevoId}?guardado=1`);
}

export async function eliminarProducto(form: FormData) {
  const s = await requerirEmisor();
  const id = Number(form.get('id'));
  const [uso] = await sql<{ n: number }[]>`
    select (select count(*) from detalle_factura where id_producto = ${id})
         + (select count(*) from detalle_proforma where id_producto = ${id})
         + (select count(*) from detalle_pedido where id_producto = ${id})
         + (select count(*) from detalle_nota_credito where id_producto = ${id})
         + (select count(*) from detalle_liquidacion where id_producto = ${id})
         + (select count(*) from detalles_guia_remision where id_producto = ${id})
         + (select count(*) from ingresos_bodega_detalle where id_producto = ${id})
         + (select count(*) from detalle_transferencia_inventario where id_producto = ${id}) n`;
  if (uso.n > 0) redirect(`/productos/${id}?error=uso`);
  await sql.begin(async (tx) => {
    await tx`delete from productos_x_bodega where id_producto = ${id} and exists (select 1 from producto where id = ${id} and id_emisor = ${s.emisorId})`;
    await tx`delete from producto where id = ${id} and id_emisor = ${s.emisorId}`;
  });
  revalidatePath('/productos');
  redirect('/productos');
}
