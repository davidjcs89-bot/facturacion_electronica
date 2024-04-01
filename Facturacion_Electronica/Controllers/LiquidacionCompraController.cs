using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.LiquidacionCompra;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class LiquidacionCompraController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private LiquidacionCompraBusiness liquidacionCompraBusiness = new LiquidacionCompraBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        // GET: LiquidacionCompra
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
            var busquedaInicial = new ModeloBuscarLiquidacion
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Liquidaciones = liquidacionCompraBusiness.BuscarLiquidaciones(busquedaInicial, idEmisor,true);
            return View(new ModeloBuscarLiquidacion { Liquidaciones = busquedaInicial.Liquidaciones });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarLiquidacion modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Liquidaciones = liquidacionCompraBusiness.BuscarLiquidaciones(modeloBuscar, idEmisor);
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

        public ActionResult View(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var modelo = liquidacionCompraBusiness.GetModeloLiquidacion(id, idEmisor);
            if (modelo == null)
            {
                return RedirectToAction("Index");
            }
            return View(modelo);
        }

        public ActionResult Imagenes(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var lista = new List<byte[]>();

            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (liquidacion != null && (liquidacion.Estado == EnumEstadosComprobante.FINALIZADO || liquidacion.Estado == EnumEstadosComprobante.AUTORIZADO))
            {
                foreach (var item in liquidacion.Detalle_Liquidacion.ToList())
                {
                    if (item.Producto.imagen != null)
                    {
                        lista.Add(item.Producto.imagen);
                    }
                }
            }
            return View("~/Views/Admin/Imagenes.cshtml", lista);
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

            var modeloLiquidacion = new ModeloLiquidacion();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloLiquidacion.EmailUsuario = usuario.Correo;
            }


            modeloLiquidacion.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloLiquidacion.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloLiquidacion.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.LIQUIDACION_COMPRA);
                if (secuencia != null)
                {
                    modeloLiquidacion.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloLiquidacion.DireccionSucursal = puntoEmision.Direccion;
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
            modeloLiquidacion.EsConsumidorFinal = true;
            modeloLiquidacion.PuntoEmisionId = puntoEmision.id;
            modeloLiquidacion.FechaEmison = DateTime.Now;
            modeloLiquidacion.Cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            modeloLiquidacion.Id = liquidacionCompraBusiness.GuardarLiquidacion(modeloLiquidacion, idEmisor);
            modeloLiquidacion.Detalles = new List<ModeloLiquidacionDetalle>();
            modeloLiquidacion.Pagos = new List<ModeloLiquidacionPago>();
            modeloLiquidacion.Adicionales = new List<ModeloDatoAdicional>();
            modeloLiquidacion.PermiteEditarCliente = true;
            modeloLiquidacion.PermiteEditarDetalles = true;
            return RedirectToAction("Edit", new { id = modeloLiquidacion.Id });
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

            var liquidacion = db.Liquidacion_Compra.Find(id);
            if (liquidacion == null || liquidacion.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }

            var modeloLiquidacion = liquidacionCompraBusiness.GetModeloLiquidacion(id, idEmisor);
            if (modeloLiquidacion.Cliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL)
            {
                modeloLiquidacion.Cliente = new ModeloCliente();
            }

            if (modeloLiquidacion == null)
            {
                return RedirectToAction("Index");
            }

            if (usuario != null)
            {
                modeloLiquidacion.EmailUsuario = usuario.Correo;
            }

            modeloLiquidacion.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloLiquidacion.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloLiquidacion.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloLiquidacion.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.LIQUIDACION_COMPRA);
                if (secuencia != null)
                {
                    modeloLiquidacion.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloLiquidacion.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaEmision = liquidacion.Fecha_emision.ToString("yyyy-MM-dd");
            modeloLiquidacion.EsConsumidorFinal = modeloLiquidacion.Cliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            return View("Create", modeloLiquidacion);
        }

        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idLiquidacion, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.CambiarPuntoEstablecimiento(idLiquidacion, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
        }

        [HttpPost]
        public ActionResult Create(ModeloLiquidacion modeloLiquidacion)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;
                int LiquidacionId = liquidacionCompraBusiness.GuardarLiquidacion(modeloLiquidacion, idEmisor);
                return RedirectToAction("Edit", new { id = LiquidacionId });
            }
            return View(modeloLiquidacion);
        }


        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.BorrarLiquidacion(id, idEmisor);
            return Json(new { liquidacionBorrada = true });
        }

        public ActionResult AgregarProducto()
        {
            return View(new ModeloBuscarProducto { Productos = new List<Producto>() });
        }

        [HttpPost]
        public ActionResult AgregarProducto(ModeloBuscarProducto modelo)
        {
            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor);
            modelo.Productos = productos;
            return View(modelo);
        }

        [HttpPost]
        public ActionResult AgregarProductoFactura(int id, int idLiquidacion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.AgregarProducto(idLiquidacion, id, idEmisor);
            return RedirectToAction("Edit", new { id = idLiquidacion });

        }

        [HttpPost]
        public ActionResult ActualizarAdicionalDetalle(int id, int idLiquidacion, string adicional)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (adicional == null)
                {
                    return RedirectToAction("Edit", new { id = idLiquidacion });
                }
                liquidacionCompraBusiness.ActualizarAdicionalDetalle(id, idLiquidacion, idEmisor, adicional);
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
        }

        [HttpPost]
        public ActionResult ActualizarPrecioDetalle(int id, int idLiquidacion, decimal nuevoPrecio)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevoPrecio <= 0)
                {
                    return RedirectToAction("Edit", new { id = idLiquidacion });
                }
                liquidacionCompraBusiness.ActualizarPrecioDetalle(id, idLiquidacion, idEmisor, nuevoPrecio);
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
        }

        [HttpPost]
        public ActionResult ActualizarCantidadDetalle(int id, int idLiquidacion, int nuevaCantidad)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevaCantidad <= 0)
                {
                    return RedirectToAction("Edit", new { id = idLiquidacion });
                }
                liquidacionCompraBusiness.ActualizarCantidadDetalle(id, idLiquidacion, idEmisor, nuevaCantidad);
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
        }

        [HttpPost]
        public ActionResult ActualizarPorcentajeDescuentoDetalle(int id, int idLiquidacion, decimal porcentaje)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (porcentaje < 0)
                {
                    return RedirectToAction("Edit", new { id = idLiquidacion });
                }
                else if (porcentaje > 100)
                {
                    porcentaje = 100;
                }
                liquidacionCompraBusiness.ActualizarPorcentajeDescuentoDetalle(id, idLiquidacion, idEmisor, porcentaje);
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idLiquidacion });
            }
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idLiquidacion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.EliminarDetalle(id, idLiquidacion, idEmisor);
            return RedirectToAction("Edit", new { id = idLiquidacion });

        }

        [HttpGet]
        public ActionResult BuscarConsumidorFinal(int idLiquidacion)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var Liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id_emisor == idEmisor && x.id == idLiquidacion);
            if (Liquidacion == null)
            {
                return Json(new { clienteActualizado = false }, JsonRequestBehavior.AllowGet);
            }
            if (Liquidacion.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL)
            {
                return Json(new { clienteActualizado = false, mensaje = $"El total de la Liquidacion sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, para cambiar a Consumidor Final" }, JsonRequestBehavior.AllowGet);
            }
            liquidacionCompraBusiness.ActualizarAConsumidorFinal(idLiquidacion, idEmisor);
            var cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            return Json(new { clienteActualizado = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult ObtenerDatosLiquidacionPuntoEmision(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.id == id && x.Id_emisor == idEmisor);
            if (puntoEmision == null)
            {
                return Json(new { existenPuntoEmison = false }, JsonRequestBehavior.AllowGet);
            }
            var secuenciaFactura = puntoEmision.Secuencias.FirstOrDefault(x => x.Id_Documentos == EnumTipoDocumento.LIQUIDACION_COMPRA);
            if (secuenciaFactura == null)
            {
                return Json(new { existenPuntoEmison = false }, JsonRequestBehavior.AllowGet);
            }
            return Json(new { existenPuntoEmison = true, numeroFactura = $"{puntoEmision.Numero_establecimiento}-{puntoEmision.Numero_emision}-{secuenciaFactura.Secuencial.ToString("D9")}", direccion = puntoEmision.Direccion }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarCliente(string identificacion, int idLiquidacion)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClienteFactura(identificacion, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false, mensaje = "Cliente no encotrado" }, JsonRequestBehavior.AllowGet);
            }
            if (cliente.TipoIdentificacionId == EnumTipoIdentificacion.RUC || cliente.TipoIdentificacionId == EnumTipoIdentificacion.CONSUMIDOR_FINAL)
            {
                return Json(new { existeCliente = false, mensaje = "No permitido para clientes con RUC"}, JsonRequestBehavior.AllowGet);
            }
            liquidacionCompraBusiness.ActualizarCliente(cliente.Id, idLiquidacion, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult AgregarPago(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.FormasPago = new SelectList(db.Formas_de_Pago, "id", "Descripcion_form_pago");
            ViewBag.Tiempos = new SelectList(liquidacionCompraBusiness.tiemposPago);
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var Liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (Liquidacion == null)
            {
                return View(new ModeloLiquidacionPago
                {
                    IdFactura = id,
                    Valor = 0
                });
            }
            return View(new ModeloLiquidacionPago
            {
                IdFactura = id,
                Valor = Liquidacion.Total - Liquidacion.Detalle_pago_Liquidacion.Sum(x => x.Valor)
            }); ;
        }

        [HttpPost]
        public ActionResult AgregarPago(ModeloLiquidacionPago modeloPago)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.FormasPago = new SelectList(db.Formas_de_Pago, "id", "Descripcion_form_pago", modeloPago.IdFormaPago);
            ViewBag.Tiempos = new SelectList(liquidacionCompraBusiness.tiemposPago, modeloPago.Tiempo);
            if (ModelState.IsValid)
            {
                int idEmisor = GetUsuarioLogeado().IdEmisor;
                var Liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == modeloPago.IdFactura && x.id_emisor == idEmisor);
                if (Liquidacion == null)
                {
                    ModelState.AddModelError("Valor", "Factura no existe");
                    return View(modeloPago);
                }
                if (modeloPago.Valor <= 0)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar debe ser mayor a cero");
                    return View(modeloPago);
                }
                if (modeloPago.Valor > Liquidacion.Total)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar no puede ser mayor al la Liquidacion: {Liquidacion.Total}");
                    return View(modeloPago);
                }
                var sumaPagos = Liquidacion.Detalle_pago_Liquidacion.Sum(x => x.Valor);
                if ((sumaPagos + modeloPago.Valor) > Liquidacion.Total)
                {
                    ModelState.AddModelError("Valor", $"La suma de todos los pagos no puede ser mayor al total de Liquidacion: {Liquidacion.Total}");
                    return View(modeloPago);
                }
                liquidacionCompraBusiness.AgregarPago(modeloPago, modeloPago.IdFactura, idEmisor);
                return Json(new { pagoAgregado = true });
            }
            return View(modeloPago);
        }

        [HttpPost]
        public ActionResult EliminarPago(int id, int idLiquidacion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.EliminarPago(id, idLiquidacion, idEmisor);
            return RedirectToAction("Edit", new { id = idLiquidacion });

        }

        public ActionResult AgregarAdicional(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            return View(new ModeloDatoAdicional { IdComprobante = id });
        }

        [HttpPost]
        public ActionResult AgregarAdicional(ModeloDatoAdicional modeloDatoAdicional)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (ModelState.IsValid)
            {
                int idEmisor = GetUsuarioLogeado().IdEmisor;
                liquidacionCompraBusiness.AgregarDatoAcional(modeloDatoAdicional, modeloDatoAdicional.IdComprobante, idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }
        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idLiquidacion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            liquidacionCompraBusiness.EliminarAdicional(id, idLiquidacion, idEmisor);
            return RedirectToAction("Edit", new { id = idLiquidacion });
        }


        [HttpPost]
        public ActionResult FinalizarLiquidacion(ModeloLiquidacion modeloLiquidacion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == modeloLiquidacion.Id && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return Json(new { liquidacionFinalizada = false, mensaje = "Liquidacion no existe" });
            }
            if (liquidacion.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { liquidacionFinalizada = false, mensaje = "Liquidacion ya finalizada anteriormente" });
            }
            if (modeloLiquidacion.FechaEmison > DateTime.Now)
            {
                return Json(new { liquidacionFinalizada = false, mensaje = "Fecha no puede ser mayor a la actual" });
            }
            if (liquidacion.id_cliente == EnumDatosGenerales.ID_CONSUMIDOR_FINAL)
            {
                return Json(new { liquidacionFinalizada = false, mensaje = "Liquidacion no puede ser emitida a un Consumidor Final" });
            }

            if (liquidacion.Total != liquidacion.Detalle_pago_Liquidacion.Sum(x => x.Valor))
            {
                return Json(new { liquidacionFinalizada = false, mensaje = "Liquidacion con pago incompleto" });
            }
            liquidacionCompraBusiness.FinalizarLiquidacion(modeloLiquidacion, idEmisor);
            return Json(new { liquidacionFinalizada = true });

        }

        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (liquidacion == null || liquidacion.Estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Liquidacion de Compra no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            liquidacionCompraBusiness.GenerarXml(liquidacion);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.LIQUIDACION_COMPRA && x.id_emisor == idEmisor);
            if (liquidacion == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionLiquidacion { Liquidacion = liquidacion, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.LIQUIDACION_COMPRA && x.id_emisor == idEmisor);
            if (liquidacion == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionLiquidacion { Liquidacion = liquidacion, Impresion = impresionConfig });
        }

        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (liquidacion == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "LIQUIDACION COMPRA " + liquidacion.Numero + ".pdf";
            if (liquidacion.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.LIQUIDACION_COMPRA).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], "application/pdf", nombreArchivo);
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (liquidacion == null)
            {

                return File(new byte[0], "application/pdf", "test.xml");
            }
            string nombreArchivo = "LIQUIDACION COMPRA " + liquidacion.Numero + ".xml";
            if (liquidacion.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.LIQUIDACION_COMPRA).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.xml_retornado.Length > 0)
            {
                return File(System.Text.Encoding.UTF8.GetBytes(documento.xml_retornado), "application/xml", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/xml");
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