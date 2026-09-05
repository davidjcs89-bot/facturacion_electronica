using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Pedido;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class PedidoController : Controller
    {

        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private Business.ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private PedidoBusiness pedidoBusiness = new PedidoBusiness();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();

        // GET: Pedido
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            ViewBag.FechaDesde = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = DateTime.Now.ToString("yyyy-MM-dd");
            var busquedaInicial = new ModeloBuscarPedido
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Pedidos = pedidoBusiness.BuscarPedidos(busquedaInicial, idEmisor, true);
            return View(new ModeloBuscarPedido { Pedidos = busquedaInicial.Pedidos });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarPedido modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Pedidos = pedidoBusiness.BuscarPedidos(modeloBuscar, idEmisor);
            if (modeloBuscar.BuscarFechaDesde != null)
            {
                ViewBag.FechaDesde = modeloBuscar.BuscarFechaDesde.Value.ToString("yyyy-MM-dd");
            }
            if (modeloBuscar.BuscarFechaHasta != null)
            {
                ViewBag.FechaHasta = modeloBuscar.BuscarFechaHasta.Value.ToString("yyyy-MM-dd");
            }

            return View(modeloBuscar);
        }

        public ActionResult Create(bool? esMayorista)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var emisor = emisorBusiness.BuscarEmisor(idEmisor);
            if (emisor == null)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            if (!db.Puntos_emisior.Any(x => x.Id_emisor == idEmisor))
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de un punto de emision | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var modeloPedido = new ModeloPedido();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloPedido.EmailUsuario = usuario.Correo;
            }


            modeloPedido.Emisor = emisor;

            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloPedido.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaEmision = DateTime.Now.ToString("yyyy-MM-dd");

            //Buscar consumidor final
            modeloPedido.EsConsumidorFinal = true;
            modeloPedido.PuntoEmisionId = puntoEmision.id;
            modeloPedido.Cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            modeloPedido.Id = pedidoBusiness.GuardarPedido(modeloPedido, idEmisor);
            modeloPedido.Detalles = new List<ModeloPedidoDetalle>();
            modeloPedido.Abonos = new List<ModeloAbono>();
            modeloPedido.PermiteEditarCliente = true;
            modeloPedido.PermiteEditarDetalles = true;
            return RedirectToAction("Edit", new { id = modeloPedido.Id });
        }

        public ActionResult View(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var modelo = pedidoBusiness.GetModeloPedido(id, idEmisor);
            if (modelo == null)
            {
                return RedirectToAction("Index");
            }
            return View(modelo);
        }

        public ActionResult Edit(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                return Content("Aun no a configurado los datos de emisor");
            }

            var emisor = emisorBusiness.BuscarEmisor(idEmisor);
            if (emisor == null)
            {
                return Content("Aun no a configurado los datos de emisor");
            }

            if (!db.Puntos_emisior.Any(x => x.Id_emisor == idEmisor))
            {
                return Content("Aun no a configurado los datos de un punto de emision");
            }

            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);

            var pedido = db.Pedido.Find(id);
            if (pedido == null || pedido.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }

            var modeloPedido = pedidoBusiness.GetModeloPedido(id, idEmisor);
            if (modeloPedido == null)
            {
                return RedirectToAction("Index");
            }

            if (usuario != null)
            {
                modeloPedido.EmailUsuario = usuario.Correo;
            }

            modeloPedido.Emisor = emisor;

            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloPedido.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloPedido.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            modeloPedido.EsConsumidorFinal = modeloPedido.Cliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL;

            ViewBag.Impresion = emisor.Adicionales;

            return View("Create", modeloPedido);
        }

        [HttpGet]
        public ActionResult BuscarConsumidorFinal(int idFactura)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var pedido = db.Pedido.FirstOrDefault(x => x.id_emisor == idEmisor && x.id == idFactura);
            if (pedido == null)
            {
                return Json(new { clienteActualizado = false }, JsonRequestBehavior.AllowGet);
            }
            if (pedido.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL)
            {
                return Json(new { clienteActualizado = false, mensaje = $"El total del pedido sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, para cambiar a Consumidor Final" }, JsonRequestBehavior.AllowGet);
            }
            pedidoBusiness.ActualizarAConsumidorFinal(idFactura, idEmisor);
            var cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            return Json(new { clienteActualizado = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }
        public ActionResult AgregarProducto(int idPedido)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var emisor = db.Emisor.FirstOrDefault(x => x.id == idEmisor);
            var productos = db.Producto.Where(x => (x.Codigo.Equals("servicio", StringComparison.OrdinalIgnoreCase) || x.Codigo.Equals("producto", StringComparison.OrdinalIgnoreCase)) && x.id_emisor == idEmisor).ToList();

            productos.ForEach(x=>x.Cantidad_producto = 1);

            //Lista vacia si maneja control de inventario
            /*if (productos == null || emisor == null || emisor.control_inventario)
            {
                return View(new ModeloBuscarProducto {IdFactura = idFactura,  Productos = new List<Producto>() });
            }*/
            return View(new ModeloBuscarProducto { IdFactura = idPedido, Productos = productos });

        }

        [HttpPost]
        public ActionResult AgregarProducto(ModeloBuscarProducto modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var pedido = db.Pedido.Find(modelo.IdFactura);

            var productosDefecto = db.Producto.Where(x => (x.Codigo.Equals("servicio", StringComparison.OrdinalIgnoreCase) || x.Codigo.Equals("producto", StringComparison.OrdinalIgnoreCase)) && x.id_emisor == idEmisor).ToList();
            productosDefecto.ForEach(x => x.Cantidad_producto = 1);

            var productos = productobusiness.BuscarProductos(modelo, idEmisor, pedido.Puntos_emisior.id_bodega);
            modelo.Productos = productos;
            modelo.Productos.AddRange(productosDefecto);
            return View(modelo);
        }

        [HttpPost]
        public ActionResult AgregarProductoPedido(int id, int idFactura, int cantidad = 1)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            string mensaje = pedidoBusiness.AgregarProducto(idFactura, id, cantidad, idEmisor, true);
            //return RedirectToAction("Edit", new { id = idFactura });
            return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje });
        }

        [HttpPost]
        public ActionResult ActualizarDetalle(int id, int idFactura, decimal nuevoPrecio, int nuevacantidad, decimal porcentajeDescuento, string adicional)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevoPrecio <= 0 || nuevacantidad <= 0 || porcentajeDescuento < 0)
                {
                    return Json(new { detalleActualizado = false, mensaje = "Los datos estan incorrectos" });
                }
                string mensaje = pedidoBusiness.ActualizarDetalle(id, idFactura, idEmisor, nuevoPrecio, nuevacantidad, porcentajeDescuento, adicional);
                return Json(new { detalleActualizado = string.IsNullOrEmpty(mensaje), mensaje });
            }
            catch (Exception ex)
            {
                return Json(new { detalleActualizado = false, mensaje = "Error, no se pudo actualizar el detalle, " + ex.Message });
            }
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            pedidoBusiness.EliminarDetalle(id, idFactura, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });
        }

        [HttpGet]
        public ActionResult BuscarCliente(string identificacion, int idFactura)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClienteFactura(identificacion, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            pedidoBusiness.ActualizarCliente(cliente.Id, idFactura, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, codigo = cliente.Codigo, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarClientePorCodigo(string codigo, int idFactura)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClientePedido(codigo, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = codigo;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            pedidoBusiness.ActualizarCliente(cliente.Id, idFactura, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, codigo = cliente.Codigo, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult AgregarAbono(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            return View(new ModeloAbono { IdPedido = id });
        }


        [HttpPost]
        public ActionResult AgregarAbono(ModeloAbono modelo)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (ModelState.IsValid)
            {
                int idEmisor = GetUsuarioLogeado().IdEmisor;
                var mensaje = pedidoBusiness.AgregarAbono(modelo, modelo.IdPedido, idEmisor);

                if (string.IsNullOrEmpty(mensaje)) {
                    return Json(new { datoAgregado = true });
                } else
                {
                    ModelState.AddModelError("Monto", mensaje);
                }
            }
            return View(modelo);
        }

        [HttpPost]
        public ActionResult EliminarAbono(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            pedidoBusiness.EliminarAbono(id, idFactura, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });
        }

        [HttpPost]
        public ActionResult FinalizarPedido (int idPedido)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return Json(new { pedidoFinalizado = false, mensaje = "Pedido no existe" });
            }
            if (pedido.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { pedidoFinalizado = false, mensaje = "Pedido ya finalizado anteriormente" });
            }

            pedidoBusiness.FinalizarPedido(idPedido, idEmisor);
            return Json(new { pedidoFinalizado = true });

        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            pedidoBusiness.AnularPedido(id, idEmisor);
            return Json(new { pedidoBorrado = true });
        }

        [HttpPost]
        public ActionResult GenerarFactura(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var pedido = db.Pedido.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return RedirectToAction("Create", "Pedido");
            }
            var idFactura = facturaBusiness.ImportarDesdePedido(id, idEmisor);
            return Json(new { facturaGenerada = true, idFactura });
        }

        public ActionResult DescargarPDF(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var pedido = db.Pedido.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (pedido == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }

            string nombreArchivo = "PEDIDO " + pedido.Numero + ".pdf";
            if (pedido.Estado == EnumEstadosComprobante.ANULADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = pedidoBusiness.GenerarDocumentoPdf(pedido);
            if (documento != null && documento.Length > 0)
            {
                return File(documento, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
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