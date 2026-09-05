using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Proforma;
using Facturacion_Electronica.Models.Usuario;
using Proformacion_Electronica.Business;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class ProformaController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private ProformaBusiness proformaBusiness = new ProformaBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();


        // GET: Proforma
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
            var busquedaInicial = new ModeloBuscarProforma
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Proformas = proformaBusiness.BuscarProformas(busquedaInicial, idEmisor, true);
            return View(new ModeloBuscarProforma { Proformas = busquedaInicial.Proformas });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarProforma modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Proformas = proformaBusiness.BuscarProformas(modeloBuscar, idEmisor);
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

        public ActionResult Create()
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

            var modeloProforma = new ModeloProforma();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloProforma.EmailUsuario = usuario.Correo;
            }


            modeloProforma.Emisor = emisor;
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloProforma.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.FechaEmision = DateTime.Now.ToString("yyyy-MM-dd");

            //Buscar consumidor final
            modeloProforma.EsConsumidorFinal = true;
            modeloProforma.FechaEmison = DateTime.Now;
            modeloProforma.Cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            modeloProforma.Id = proformaBusiness.GuardarProforma(modeloProforma, idEmisor);
            modeloProforma.Detalles = new List<ModeloProformaDetalle>();
            modeloProforma.PermiteEditarCliente = true;
            return RedirectToAction("Edit", new { id = modeloProforma.Id });
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

            var proforma = db.Proforma.Find(id);
            if (proforma == null || proforma.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }

            var modeloProforma = proformaBusiness.GetModeloProforma(id, idEmisor);
            if (modeloProforma == null)
            {
                return RedirectToAction("Index");
            }

            if (usuario != null)
            {
                modeloProforma.EmailUsuario = usuario.Correo;
            }

            modeloProforma.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);


            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloProforma.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaEmision = proforma.fecha_emision.ToString("yyyy-MM-dd");
            modeloProforma.EsConsumidorFinal = modeloProforma.Cliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            return View("Create", modeloProforma);
        }

        [HttpPost]
        public ActionResult Create(ModeloProforma modeloFactura)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;
                int facturaId = proformaBusiness.GuardarProforma(modeloFactura, idEmisor);
                return RedirectToAction("Edit", new { id = facturaId });
            }
            return View(modeloFactura);
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            proformaBusiness.BorrarProforma(id, idEmisor);
            return Json(new { facturaBorrada = true });
        }

        public ActionResult AgregarProducto()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            //AQUI CARGAMOS LOS PRODUCTOS QUE NOS APARECERAN POR DEFECTO EN LA TABLA DEL MODAL DE AGREGAR PRODUCTOS
            var productos = db.Producto.Where(x => (x.Codigo.Equals("servicio", StringComparison.OrdinalIgnoreCase) || x.Codigo.Equals("producto", StringComparison.OrdinalIgnoreCase)) && x.id_emisor == idEmisor).ToList();

            if (productos == null)
            {
                // CUANDO NO SE OBTIENEN PRODUCTOS SETEAMOS A PRODUCTOS UNA LISTA VACIA
                return View(new ModeloBuscarProducto { Productos = new List<Producto>() });
            }
            // CUANDO CONSEGUIMOS PRODUCTOS PUES SETEAMOS LOS PRODUCTOS OBTENIDOS AL MODEL PRODUCTOS
            return View(new ModeloBuscarProducto { Productos = productos });
        }

        [HttpPost]
        public ActionResult AgregarProducto(ModeloBuscarProducto modelo)
        {
            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor,0);
            modelo.Productos = productos;
            return View(modelo);
        }

        [HttpPost]
        public ActionResult AgregarProductoProforma(int id, int idProforma)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            string mensaje = proformaBusiness.AgregarProducto(idProforma, id, idEmisor);
            //return RedirectToAction("Edit", new { id = idProforma });
            return Json(new { detalleAgregado = string.IsNullOrEmpty(mensaje), mensaje = mensaje });
        }

        //[HttpPost]
        //public ActionResult ActualizarPrecioDetalle(int id, int idProforma, decimal nuevoPrecio)
        //{
        //    var idEmisor = GetUsuarioLogeado().IdEmisor;
        //    try
        //    {
        //        if (nuevoPrecio <= 0)
        //        {
        //            return RedirectToAction("Edit", new { id = idProforma });
        //        }
        //        proformaBusiness.ActualizarPrecioDetalle(id, idProforma, idEmisor, nuevoPrecio);
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //    catch (Exception)
        //    {
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //}

        //[HttpPost]
        //public ActionResult ActualizarAdicionalDetalle(int id, int idProforma, string adicional)
        //{
        //    var idEmisor = GetUsuarioLogeado().IdEmisor;
        //    try
        //    {
        //        if (adicional == null)
        //        {
        //            return RedirectToAction("Edit", new { id = idProforma });
        //        }
        //        proformaBusiness.ActualizarAdicionalDetalle(id, idProforma, idEmisor, adicional);
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //    catch (Exception)
        //    {
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //}

        //[HttpPost]
        //public ActionResult ActualizarCantidadDetalle(int id, int idProforma, int nuevaCantidad)
        //{
        //    var idEmisor = GetUsuarioLogeado().IdEmisor;
        //    try
        //    {
        //        if (nuevaCantidad <= 0)
        //        {
        //            return RedirectToAction("Edit", new { id = idProforma });
        //        }
        //        proformaBusiness.ActualizarCantidadDetalle(id, idProforma, idEmisor, nuevaCantidad);
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //    catch (Exception)
        //    {
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //}

        [HttpPost]
        public ActionResult ActualizarDetalle(int id, int idProforma, decimal nuevoPrecio, int nuevacantidad, decimal porcentajeDescuento, string adicional)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevoPrecio <= 0 || nuevacantidad <= 0 || porcentajeDescuento < 0)
                {
                    return Json(new { detalleActualizado = false, mensaje = "Los datos estan incorrectos" });
                }
                string mensaje = proformaBusiness.ActualizarDetalle(id, idProforma, idEmisor, nuevoPrecio, nuevacantidad, porcentajeDescuento, adicional);
                return Json(new { detalleActualizado = string.IsNullOrEmpty(mensaje), mensaje = mensaje });
            }
            catch (Exception ex)
            {
                return Json(new { detalleActualizado = false, mensaje = "Error, no se pudo actualizar el detalle, "+ex.Message });
            }
        }

        [HttpPost]
        public ActionResult ActualizarObservaciones(int id, string observaciones)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (string.IsNullOrEmpty(observaciones))
                {
                    return RedirectToAction("Edit", new { id = id });
                }
                proformaBusiness.ActualizarObservacionesProforma(id, idEmisor, observaciones);
                return RedirectToAction("Edit", new { id });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id });
            }
        }

        //[HttpPost]
        //public ActionResult ActualizarPorcentajeDescuentoDetalle(int id, int idProforma, decimal porcentaje)
        //{
        //    var idEmisor = GetUsuarioLogeado().IdEmisor;
        //    try
        //    {
        //        if (porcentaje < 0)
        //        {
        //            return RedirectToAction("Edit", new { id = idProforma });
        //        }
        //        else if (porcentaje > 100)
        //        {
        //            porcentaje = 100;
        //        }
        //        proformaBusiness.ActualizarPorcentajeDescuentoDetalle(id, idProforma, idEmisor, porcentaje);
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //    catch (Exception)
        //    {
        //        return RedirectToAction("Edit", new { id = idProforma });
        //    }
        //}

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idProforma)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            proformaBusiness.EliminarDetalle(id, idProforma, idEmisor);
            return RedirectToAction("Edit", new { id = idProforma });

        }


        [HttpGet]
        public ActionResult BuscarConsumidorFinal(int idProforma)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var proforma = db.Proforma.FirstOrDefault(x => x.id_emisor == idEmisor && x.id == idProforma);
            if (proforma == null)
            {
                return Json(new { clienteActualizado = false }, JsonRequestBehavior.AllowGet);
            }
            if (proforma.total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL)
            {
                return Json(new { clienteActualizado = false, mensaje = $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, para cambiar a Consumidor Final" }, JsonRequestBehavior.AllowGet);
            }
            proformaBusiness.ActualizarAConsumidorFinal(idProforma, idEmisor);
            var cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            return Json(new { clienteActualizado = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarCliente(string identificacion, int idProforma)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClienteFactura(identificacion, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            proformaBusiness.ActualizarCliente(cliente.Id, idProforma, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarClienteByNombre(string nombre)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;

            //int idEmisor = GetUsuarioLogeado().IdEmisor;
            var clientes = clienteBusiness.BuscarClientesFacturaByNombre(nombre, GetUsuarioLogeado().IdEmisor);

            if (clientes == null || !clientes.Any())
            {
                TempData["identificacionBuscada"] = nombre;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }

            var clientesData = new List<object>();
            foreach (var cliente in clientes)
            {
                clientesData.Add(new
                {
                    existeCliente = true,
                    id = cliente.Id,
                    identificacion = cliente.NumeroIdentificacion,
                    nombre = cliente.RazonSocial,
                    direccion = cliente.Direccion,
                    email = cliente.Email,
                    celular = cliente.Celular
                });
            }

            //proformaBusiness.ActualizarCliente(clientes.First().Id, idProforma, idEmisor);

            return Json(clientesData, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult ActualizarClienteSelecionado(ModelClienteSeleccionado cliente, int idProforma)
        {
            if (cliente is null)
            {
                TempData["identificacionBuscada"] = cliente;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }

            int idEmisor = GetUsuarioLogeado().IdEmisor;

            proformaBusiness.ActualizarCliente(cliente.Id, idProforma, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.Identificacion, nombre = cliente.Nombre, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult EnviarProforma(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return Json(new { enviado = false, mensaje = "Proforma no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            proformaBusiness.EnviarPorEmail(id);
            return Json(new { enviado = true, mensaje = "Proforma Enviada" }, JsonRequestBehavior.AllowGet);


        }

        [HttpPost]
        public ActionResult GenerarFactura(ModeloProforma modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var proforma = db.Proforma.FirstOrDefault(x => x.id == modelo.Id && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return RedirectToAction("Create", "Factura");
            }
            var idFactura = facturaBusiness.ImportarDesdeProforma(modelo.Id, idEmisor);
            return RedirectToAction("Edit", "Factura", new { id = idFactura });
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.FACTURA && x.id_emisor == idEmisor);
            if (proforma == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionProforma { Proforma = proforma, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.FACTURA && x.id_emisor == idEmisor);
            if (proforma == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionProforma { Proforma = proforma, Impresion = impresionConfig });
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