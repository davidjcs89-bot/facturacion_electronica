using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using Facturacion_Electronica;
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Transferencias;
using Facturacion_Electronica.Models.Usuario;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class TransferenciaInventarioController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private Productobusiness productobusiness = new Productobusiness();

        // GET: TransferenciaInventario
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var transferencia_Inventario = db.Transferencia_Inventario.Include(t => t.Bodegas).Include(t => t.Bodegas1).Include(t => t.Emisor);
            return View(transferencia_Inventario.Where(x=>x.id_emisor == idEmisor).OrderByDescending(x=>x.id).ToList());
        }

        // GET: TransferenciaInventario/Details/5
        public ActionResult Details(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transferencia_Inventario transferencia_Inventario = db.Transferencia_Inventario.Find(id);
            if (transferencia_Inventario == null)
            {
                return HttpNotFound();
            }
            return View(transferencia_Inventario);
        }

        // GET: TransferenciaInventario/Create
        public ActionResult Create()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.id_bodega_desde = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa).ToList(), "id", "nombre");
            ViewBag.id_bodega_hasta = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa).ToList(), "id", "nombre");
            return View();
        }

        // POST: TransferenciaInventario/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(Transferencia_Inventario transferencia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            ViewBag.id_bodega_desde = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa).ToList(), "id", "nombre", transferencia.id_bodega_desde);
            ViewBag.id_bodega_hasta = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa).ToList(), "id", "nombre", transferencia.id_bodega_hasta);

            if (ModelState.IsValid)
            {
                //Comprobar que las bodegas de origen y destino no sean las mismas
                if (transferencia.id_bodega_desde == transferencia.id_bodega_hasta)
                {
                    ModelState.AddModelError("id_bodega_desde", "La bodega de origen y destino no puede ser la misma");
                    return View(transferencia);
                }

                transferencia.id_emisor = idEmisor;
                transferencia.estado = (int)EstadoTransferencia.PENDIENTE;
                transferencia.fecha_creacion = DateTime.Now;

                db.Transferencia_Inventario.Add(transferencia);
                db.SaveChanges();
                return RedirectToAction("Edit", new { transferencia.id });
            }


            return View(transferencia);
        }

        // GET: TransferenciaInventario/Edit/5
        public ActionResult Edit(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var transferencia = db.Transferencia_Inventario.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);

            if (transferencia == null)
            {
                return RedirectToAction("Index");
            }

            if (transferencia.estado != (int)EstadoTransferencia.PENDIENTE)
            {
                return RedirectToAction("Details", new { id });
            }

            return View(transferencia);
        }

        // POST: TransferenciaInventario/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "id,id_emisor,fecha_creacion,fecha_finalizacion,id_bodega_desde,id_bodega_hasta,estado")] Transferencia_Inventario transferencia_Inventario)
        {
            if (ModelState.IsValid)
            {
                db.Entry(transferencia_Inventario).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            ViewBag.id_bodega_desde = new SelectList(db.Bodegas, "id", "codigo", transferencia_Inventario.id_bodega_desde);
            ViewBag.id_bodega_hasta = new SelectList(db.Bodegas, "id", "codigo", transferencia_Inventario.id_bodega_hasta);
            ViewBag.id_emisor = new SelectList(db.Emisor, "id", "Ruc", transferencia_Inventario.id_emisor);
            return View(transferencia_Inventario);
        }

        // GET: TransferenciaInventario/Delete/5
        /*public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transferencia_Inventario transferencia_Inventario = db.Transferencia_Inventario.Find(id);
            if (transferencia_Inventario == null)
            {
                return HttpNotFound();
            }
            return View(transferencia_Inventario);
        }

        // POST: TransferenciaInventario/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            Transferencia_Inventario transferencia_Inventario = db.Transferencia_Inventario.Find(id);
            db.Transferencia_Inventario.Remove(transferencia_Inventario);
            db.SaveChanges();
            return RedirectToAction("Index");
        }*/

        public ActionResult AgregarProducto(int idTransferencia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var emisor = db.Emisor.FirstOrDefault(x => x.id == idEmisor);

            return View(new ModeloBuscarProducto { IdFactura = idTransferencia, Productos = new List<Producto>() });

        }

        [HttpPost]
        public ActionResult AgregarProducto(ModeloBuscarProducto modelo)
        {
            var transferencia = db.Transferencia_Inventario.Find(modelo.IdFactura);

            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor, transferencia.id_bodega_desde);
            modelo.Productos = productos;
            return View(modelo);
        }

        [HttpPost]
        public ActionResult AgregarProductoTransferencia(int id, int idTransferencia, int cantidad)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var transferencia = db.Transferencia_Inventario.Find(idTransferencia);
            string mensaje = null;

            if (transferencia == null || transferencia.id_emisor != idEmisor)
            {
                mensaje = "Transferencia no encontrada";
                return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            if (transferencia.estado != (int)EstadoTransferencia.PENDIENTE)
            {
                mensaje = "Transferencia no se encuentra en estado PENDIENTE";
                return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            //Validar stock
            var controlInventario = db.Productos_x_bodega.FirstOrDefault(x=>x.id_producto == id && x.id_bodega == transferencia.id_bodega_desde);

            if (controlInventario == null)
            {
                mensaje = $"No existe stock en la bodega {transferencia.Bodegas.nombre} para este producto";
                return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            if (controlInventario.stock < cantidad)
            {
                mensaje = $"No existe el stock suficiente en este producto";
                return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            //Agregar detalle
            transferencia.Detalle_Transferencia_Inventario.Add(new Detalle_Transferencia_Inventario { 
                id_producto = id,
                cantidad = cantidad            
            });

            db.SaveChanges();
            return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idTransferencia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var transferencia = db.Transferencia_Inventario.Find(idTransferencia);

            if (transferencia == null || transferencia.id_emisor != idEmisor)
            {
                return RedirectToAction("Edit", new { id = idTransferencia });
            }

            var detalle = db.Detalle_Transferencia_Inventario.FirstOrDefault(x=>x.id == id && x.id_transferencia == idTransferencia);

            db.Detalle_Transferencia_Inventario.Remove(detalle);

            db.SaveChanges();

            return RedirectToAction("Edit", new { id = idTransferencia });

        }

        [HttpPost]
        public ActionResult Finalizar(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var transferencia = db.Transferencia_Inventario.Find(id);
            string mensaje = null;

            if (transferencia == null || transferencia.id_emisor != idEmisor)
            {
                mensaje = "Transferencia no encontrada";
                return Json(new { finalizado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            if (transferencia.estado != (int)EstadoTransferencia.PENDIENTE )
            {
                mensaje = "Transferencia no se encuentra en estado PENDIENTE";
                return Json(new { finalizado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            //Recorrer todos los detalles y cambiar de bodega

            foreach (var detalle in transferencia.Detalle_Transferencia_Inventario.ToList())
            {
                var controlInventario = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == transferencia.id_bodega_desde);

                if (controlInventario == null)
                {
                    mensaje = $"No existe stock en la bodega origen para el producto {detalle.Producto.Codigo}";
                    return Json(new { finalizado = string.IsNullOrEmpty(mensaje), mensaje });
                }

                if (controlInventario.stock < detalle.cantidad)
                {
                    mensaje = $"No existe el stock en la bodega origen suficiente para el producto {detalle.Producto.Codigo}";
                    return Json(new { finalizado = string.IsNullOrEmpty(mensaje), mensaje });
                }

                controlInventario.stock -= detalle.cantidad;

                //Control de bodega destino

                var controlInventarioDestino = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == transferencia.id_bodega_hasta);

                if (controlInventarioDestino == null)
                {
                    db.Productos_x_bodega.Add(new Productos_x_bodega { 
                        id_bodega = transferencia.id_bodega_hasta,
                        id_producto = detalle.id_producto,
                        stock = detalle.cantidad
                    });
                }
                else
                {
                    controlInventarioDestino.stock += detalle.cantidad;
                }
            }

            transferencia.estado = (int)EstadoTransferencia.FINALIZADO;

            db.SaveChanges();

            return Json(new { finalizado = string.IsNullOrEmpty(mensaje), mensaje });
        }


        [HttpPost]
        public ActionResult Anular(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var transferencia = db.Transferencia_Inventario.Find(id);
            string mensaje = null;

            if (transferencia == null || transferencia.id_emisor != idEmisor)
            {
                mensaje = "Transferencia no encontrada";
                return Json(new { anulado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            if (transferencia.estado == (int)EstadoTransferencia.ANULADO)
            {
                mensaje = "Transferencia ya se encuentra en estado ANULADO";
                return Json(new { anulado = string.IsNullOrEmpty(mensaje), mensaje });
            }

            //Retornar las cantidades a la bodega original
            if (transferencia.estado == (int)EstadoTransferencia.FINALIZADO)
            {
                foreach (var detalle in transferencia.Detalle_Transferencia_Inventario.ToList())
                {
                    var controlInventario = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == transferencia.id_bodega_desde);

                    if (controlInventario == null)
                    {
                        db.Productos_x_bodega.Add(new Productos_x_bodega
                        {
                            id_bodega = transferencia.id_bodega_desde,
                            id_producto = detalle.id_producto,
                            stock = detalle.cantidad
                        });
                    }
                    else
                    {
                        controlInventario.stock += detalle.cantidad;
                    }


                    //Control de bodega destino

                    var controlInventarioDestino = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == transferencia.id_bodega_hasta);

                    if (controlInventarioDestino == null)
                    {
                        mensaje = $"No existe el stock a anular en la bodega destino para el producto {detalle.Producto.Codigo}";
                        return Json(new { anulado = string.IsNullOrEmpty(mensaje), mensaje });
                    }
                    else
                    {
                        if (controlInventario.stock < detalle.cantidad)
                        {
                            mensaje = $"No existe el stock a anular suficiente en la bodega destino para el producto {detalle.Producto.Codigo}";
                            return Json(new { anulado = string.IsNullOrEmpty(mensaje), mensaje });
                        }

                        controlInventarioDestino.stock -= detalle.cantidad;
                    }
                }
            }

            transferencia.estado = (int)EstadoTransferencia.ANULADO;

            db.SaveChanges();

            return Json(new { anulado = string.IsNullOrEmpty(mensaje), mensaje });
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }

        [NonAction]
        private ModeloUsuarioSesion GetUsuarioLogeado()
        {
            var cookieName = FormsAuthentication.FormsCookieName; //Find cookie name
            var authCookie = HttpContext.Request.Cookies[cookieName]; //Get the cookie by it's name
            if (authCookie == null) return null;
            var ticket = FormsAuthentication.Decrypt(authCookie.Value); //Decrypt it
            var emisor = db.Usuario.Where(x => x.Nombre_usuario == ticket.Name).FirstOrDefault();


            var modelo = new ModeloUsuarioSesion
            {
                NombreUsuario = ticket.Name,
                IdEmisor = (emisor == null || emisor.Emisor == null) ? 0 : emisor.id_emisor.Value
            };
            return modelo;
        }
    }
}
