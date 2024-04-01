using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Retencion;
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
    public class RetencionController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private RetencionBusiness retencionBusiness = new RetencionBusiness();

        // GET: Retencion
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            if (db.Emisor.FirstOrDefault(x=>x.id == idEmisor) != null && db.Emisor.Any(x=>x.id == idEmisor && !x.Obligado_conta))
            {
                ViewBag.MensajeError = "No esta obligado a llevar contabilidad, por ende este comprobante esta deshabilitado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }


            ViewBag.FechaDesde = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = DateTime.Now.ToString("yyyy-MM-dd");
            var busquedaInicial = new ModeloBuscarRetencion
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Retenciones = retencionBusiness.BuscarRetenciones(busquedaInicial, idEmisor, true);

            return View(new ModeloBuscarRetencion { Retenciones = busquedaInicial.Retenciones });
        }

        public ActionResult View(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var modelo = retencionBusiness.GenerarModeloRetencion(id, idEmisor);
            if (modelo == null)
            {
                return RedirectToAction("Index");
            }
            return View(modelo);
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarRetencion modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Retenciones = retencionBusiness.BuscarRetenciones(modeloBuscar, idEmisor);
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

        public ActionResult Imagenes(int id)
        {
            var lista = new List<byte[]>();
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

            if (db.Emisor.FirstOrDefault(x => x.id == idEmisor) != null && db.Emisor.Any(x => x.id == idEmisor && !x.Obligado_conta))
            {
                ViewBag.MensajeError = "No esta obligado a llevar contabilidad, por ende este comprobante esta deshabilitado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            if (!db.Puntos_emisior.Any(x => x.Id_emisor == idEmisor))
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de un punto de emision";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var modeloRetencion = new ModeloRetencion();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloRetencion.EmailUsuario = usuario.Correo;
            }


            modeloRetencion.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloRetencion.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloRetencion.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.RETENCION);
                if (secuencia != null)
                {
                    modeloRetencion.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloRetencion.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });

            modeloRetencion.PuntoEmisionId = puntoEmision.id;
            modeloRetencion.FechaEmison = DateTime.Now;
            modeloRetencion.Cliente = null;
            modeloRetencion.Id = retencionBusiness.GuardarRetencion(modeloRetencion, idEmisor);
            modeloRetencion.Estado = EnumEstadosComprobante.PENDIENTE;
            modeloRetencion.Detalles = new List<ModeloDetalleImpuesto>();
            modeloRetencion.Adicionales = new List<ModeloDatoAdicional>();

            ViewBag.FechaEmision = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaEmisionComprobante = DateTime.Now.ToString("yyyy-MM-dd");
            var documentosPermitidos = new[] { EnumTipoDocumento.FACTURA, EnumTipoDocumento.NOTA_DEBITO, EnumTipoDocumento.LIQUIDACION_COMPRA };
            ViewBag.TipoDocumento = new SelectList(db.Tipo_documento.Where(x => documentosPermitidos.Contains(x.id)), "id", "Descripcion_doc", modeloRetencion.IdTipoDocumento);

            ViewBag.TipoImpuesto = new SelectList(db.Impuestos_retencion, "id", "Descripcion");
            var impuestoSeleccionado = db.Impuestos_retencion.FirstOrDefault();
            ViewBag.TipoPorcentajeImpuesto = new SelectList(db.Impuesto_porcentaje_retencion.Where(x => x.id_impuesto == impuestoSeleccionado.id), "id", "Descripcion", modeloRetencion.IdImpuesto);
            return View(modeloRetencion);
        }

        [HttpPost]
        public ActionResult Create(ModeloRetencion modeloRetencion)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (ModelState.IsValid)
            {
                if (modeloRetencion.FechaEmison > DateTime.Now)
                {
                    ModelState.AddModelError("FechaEmison", "Fecha de Emisión no puede ser mayor a la actual");
                }
                else
                {
                    if (modeloRetencion.FechaEmisionComprobante > DateTime.Now)
                    {
                        ModelState.AddModelError("FechaEmisionComprobante", "Fecha de Emisión no puede ser mayor a la actual");
                    }
                    else
                    {
                        var porcenjateImpuesto = db.Impuesto_porcentaje_retencion.FirstOrDefault(x => x.id == modeloRetencion.IdPorcentajeImpuesto);
                        if (porcenjateImpuesto == null)
                        {
                            ModelState.AddModelError("PorcentajeRetencion", "Error de Porcentaje");
                        }
                        else
                        {
                            if (!porcenjateImpuesto.porcentaje_fijo && (modeloRetencion.PorcentajeRetencion < 0 || modeloRetencion.PorcentajeRetencion > 100))
                            {
                                ModelState.AddModelError("PorcentajeRetencion", "El valor de porcentaje de ser entre 0% y 100%");
                            }
                            else
                            {
                                retencionBusiness.AgregarDetalleImpuesto(modeloRetencion, idEmisor, modeloRetencion.PorcentajeRetencion);
                            }
                        }
                    }
                }
            }

            var modelo = retencionBusiness.GenerarModeloRetencion(modeloRetencion.Id, idEmisor);
            modelo.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            modelo.BaseImponible = modeloRetencion.BaseImponible;
            modelo.ValorRetenido = modeloRetencion.ValorRetenido;
            modelo.NumeroComprobante = modeloRetencion.NumeroComprobante;

            ViewBag.FechaEmision = modeloRetencion.FechaEmison.ToString("yyyy-MM-dd");
            ViewBag.FechaEmisionComprobante = modeloRetencion.FechaEmisionComprobante.ToString("yyyy-MM-dd");
            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            var documentosPermitidos = new[] { EnumTipoDocumento.FACTURA, EnumTipoDocumento.NOTA_DEBITO, EnumTipoDocumento.LIQUIDACION_COMPRA };
            ViewBag.TipoDocumento = new SelectList(db.Tipo_documento.Where(x => documentosPermitidos.Contains(x.id)), "id", "Descripcion_doc", modeloRetencion.IdTipoDocumento);

            ViewBag.TipoImpuesto = new SelectList(db.Impuestos_retencion, "id", "Descripcion", modelo.IdImpuesto);
            ViewBag.TipoPorcentajeImpuesto = new SelectList(db.Impuesto_porcentaje_retencion.Where(x => x.id_impuesto == modeloRetencion.IdImpuesto), "id", "Descripcion", modeloRetencion.IdImpuesto);

            return View(modelo);

        }
        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idRetencion, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            retencionBusiness.CambiarPuntoEstablecimiento(idRetencion, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
        }
        public ActionResult Edit(int id)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor) == null)
            {
                return RedirectToAction("Index");
            }

            var modeloRetencion = retencionBusiness.GenerarModeloRetencion(id, idEmisor);
            if (modeloRetencion.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return View("View", modeloRetencion);
            }
            modeloRetencion.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            modeloRetencion.BaseImponible = modeloRetencion.BaseImponible;
            modeloRetencion.ValorRetenido = modeloRetencion.ValorRetenido;
            modeloRetencion.NumeroComprobante = modeloRetencion.NumeroComprobante;

            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloRetencion.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.RETENCION);
                if (secuencia != null)
                {
                    modeloRetencion.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloRetencion.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.FechaEmision = modeloRetencion.FechaEmison.ToString("yyyy-MM-dd");
            ViewBag.FechaEmisionComprobante = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            var documentosPermitidos = new[] { EnumTipoDocumento.FACTURA, EnumTipoDocumento.NOTA_DEBITO, EnumTipoDocumento.RETENCION };
            ViewBag.TipoDocumento = new SelectList(db.Tipo_documento.Where(x => documentosPermitidos.Contains(x.id)), "id", "Descripcion_doc", modeloRetencion.IdTipoDocumento);

            ViewBag.TipoImpuesto = new SelectList(db.Impuestos_retencion, "id", "Descripcion", modeloRetencion.IdImpuesto);
            ViewBag.TipoPorcentajeImpuesto = new SelectList(db.Impuesto_porcentaje_retencion.Where(x => x.id_impuesto == modeloRetencion.IdImpuesto), "id", "Descripcion", modeloRetencion.IdImpuesto);

            return View("Create", modeloRetencion);
        }


        [HttpGet]
        public ActionResult BuscarCliente(string identificacion, int idRetencion)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClienteRetencion(identificacion, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            retencionBusiness.ActualizarCliente(cliente.Id, idRetencion, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult CargarPoncentajesImpuesto(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (id == 0)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }

            try
            {
                var tasas = new Dictionary<int, string>();
                foreach (var tasa in db.Impuesto_porcentaje_retencion.Where(x => x.id_impuesto == id).ToList())
                {
                    tasas.Add(tasa.id, $"{tasa.Codigo}-{tasa.Descripcion} ({tasa.Porcentaje}%)");
                }
                return Json(new SelectList(tasas, "Key", "Value"), JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return Json(new SelectList(null), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult CargarValorPorcentajeImpuesto(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (id == 0)
            {
                return Json(null, JsonRequestBehavior.AllowGet);
            }
            var porcenjateImpuesto = db.Impuesto_porcentaje_retencion.FirstOrDefault(x => x.id == id);
            if (porcenjateImpuesto == null)
            {
                return Json(new { valor = 0, porcentajeFijo = false }, JsonRequestBehavior.AllowGet);
            }
            return Json(new { valor = porcenjateImpuesto.Porcentaje, porcentajeFijo = porcenjateImpuesto.porcentaje_fijo }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult CalcularValorRetenido(int idPorcentaje, decimal baseImponible, decimal porcentaje)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (idPorcentaje == 0 || baseImponible < 0)
            {
                return Json(new { valor = "0.00" }, JsonRequestBehavior.AllowGet);
            }
            var porcenjateImpuesto = db.Impuesto_porcentaje_retencion.FirstOrDefault(x => x.id == idPorcentaje);
            if (porcenjateImpuesto == null)
            {
                return Json(new { valor = "0.00" }, JsonRequestBehavior.AllowGet);
            }
            if (!porcenjateImpuesto.porcentaje_fijo)
            {
                if (porcentaje < 0 || porcentaje > 100)
                {
                    return Json(new { valor = "0.00" }, JsonRequestBehavior.AllowGet);
                }
                return Json(new { valor = (baseImponible * (porcentaje / 100)).ToString() }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { valor = (baseImponible * (porcenjateImpuesto.Porcentaje / 100)).ToString() }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idRetencion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            retencionBusiness.EliminarDetalle(id, idRetencion, idEmisor);
            return RedirectToAction("Edit", new { id = idRetencion });

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
                retencionBusiness.AgregarDatoAcional(modeloDatoAdicional, modeloDatoAdicional.IdComprobante, idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }
        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idRetencion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            retencionBusiness.EliminarAdicional(id, idRetencion, idEmisor);
            return RedirectToAction("Edit", new { id = idRetencion });
        }

        [HttpPost]
        public ActionResult FinalizarRetencion(ModeloRetencion modeloRetencion)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == modeloRetencion.Id && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Retención no existe" });
            }
            if (modeloRetencion.FechaEmison > DateTime.Now)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Fecha no puede ser mayor a la actual" });
            }
            if (retencion.estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Retención ya finalizada anteriormente" });
            }

            retencionBusiness.FinalizarRetencion(modeloRetencion, idEmisor);
            return Json(new { retencionFinalizada = true });
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            retencionBusiness.BorrarRetencion(id, idEmisor);
            return Json(new { retencionBorrada = true });
        }

        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (retencion == null || retencion.estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Retención no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            retencionBusiness.GenerarXml(retencion);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.RETENCION && x.id_emisor == idEmisor);
            if (retencion == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionRetencion { Retencion = retencion, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.RETENCION && x.id_emisor == idEmisor);
            if (retencion == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionRetencion { Retencion = retencion, Impresion = impresionConfig });

        }

        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (retencion == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "COMPROBANTE DE RETENCION " + retencion.numero + ".pdf";
            if (retencion.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.RETENCION).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (retencion == null)
            {

                return File(new byte[0], "application/xml", "test.xml");
            }
            string nombreArchivo = "COMPROBANTE DE RETENCION " + retencion.numero + ".xml";
            if (retencion.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo, "application/xml");
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.RETENCION).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
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