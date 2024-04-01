
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.NotaDebito;
using Facturacion_Electronica.Models.Usuario;
using Microsoft.Ajax.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class NotaDebitoController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private NotaDebitoBusiness notaDebitoBusiness = new NotaDebitoBusiness();

        // GET: NotaDebito
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
            var busquedaInicial = new ModeloBuscarNotaDebito
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Notas = notaDebitoBusiness.BuscarNotas(busquedaInicial, idEmisor,true);

            return View(new ModeloBuscarNotaDebito { Notas = busquedaInicial.Notas });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarNotaDebito modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Notas = notaDebitoBusiness.BuscarNotas(modeloBuscar, idEmisor);
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
            var modelo = notaDebitoBusiness.GetModeloNotaDebito(id, idEmisor);
            if (modelo == null)
            {
                return RedirectToAction("Index");
            }
            return View(modelo);
        }
        public ActionResult Imagenes(int id)
        {
            var lista = new List<byte[]>();
            return View("~/Views/Admin/Imagenes.cshtml", lista);
        }

        public ActionResult SeleccionarFactura()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            ViewBag.FechaDesde = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = DateTime.Now.ToString("yyyy-MM-dd");
            return View(new ModeloBuscarFactura { Facturas = new List<Factura>() });
        }

        [HttpPost]
        public ActionResult SeleccionarFactura(ModeloBuscarFactura modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Facturas = facturaBusiness.BuscarFacturas(modeloBuscar, idEmisor);
            modeloBuscar.Facturas = modeloBuscar.Facturas.Where(x => x.Estado == EnumEstadosComprobante.FINALIZADO || x.Estado == EnumEstadosComprobante.AUTORIZADO).ToList();
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

        public ActionResult Create(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
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
            var factura = facturaBusiness.GetModeloFactura(id, idEmisor);

            if (factura == null)
            {
                return RedirectToAction("SeleccionarFactura");
            }

            var modelo = new ModeloNotaDebito
            {
                IdFactura = factura.Id,
                Factura = factura
            };


            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modelo.EmailUsuario = usuario.Correo;
            }


            modelo.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modelo.Ambiente = ambiente.Descripcion_ambiente;
            }

            modelo.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.NOTA_DEBITO);
                if (secuencia != null)
                {
                    modelo.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modelo.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaEmision = DateTime.Now.ToString("yyyy-MM-dd");

            modelo.PuntoEmisionId = puntoEmision.id;
            modelo.FechaEmison = DateTime.Now;
            modelo.Detalles = new List<ModeloDetalleNotaDebito>();
            modelo.Adicionales = new List<ModeloDatoAdicional>();
            modelo.Id = notaDebitoBusiness.GuardarNotaDebito(modelo, idEmisor);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA).ToList(), "id", "Descripcion", modelo.IdPorcentajeIva);
            return RedirectToAction("Edit",new { modelo.Id});
        }

        public ActionResult Edit(int id)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor) == null)
            {
                return RedirectToAction("Index");
            }

            var modeloNotaDebito = notaDebitoBusiness.GetModeloNotaDebito(id, idEmisor);
            if (modeloNotaDebito.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return View("View", modeloNotaDebito);
            }
            var factura = facturaBusiness.GetModeloFactura(modeloNotaDebito.IdFactura, idEmisor);

            if (factura == null)
            {
                return RedirectToAction("SeleccionarFactura");
            }

            modeloNotaDebito.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloNotaDebito.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.NOTA_DEBITO);
                if (secuencia != null)
                {
                    modeloNotaDebito.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloNotaDebito.DireccionSucursal = puntoEmision.Direccion;
                }
            }
            ViewBag.FechaEmision = modeloNotaDebito.FechaEmison.ToString("yyyy-MM-dd");
            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });

            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA).ToList(), "id", "Descripcion", modeloNotaDebito.IdPorcentajeIva);
            return View("Create", modeloNotaDebito);
        }

        [HttpPost]
        public ActionResult AgregarDetalle(string razon, decimal valor, int id)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor) == null)
                {
                    return Json(new { datoAgregado = false, mensaje = "Nota de Débito no existe" });
                }

                if (razon.IsNullOrWhiteSpace())
                {
                    return Json(new { datoAgregado = false, mensaje = "Debe ingresar una razón de la modificación" });
                }

                if (valor <= 0)
                {
                    return Json(new { datoAgregado = false, mensaje = "EL valor de la modificación deber ser mayor a cero" });
                }


                notaDebitoBusiness.AgregarDetalle(razon, valor, id, idEmisor);
                return Json(new { datoAgregado = true });
            }
            catch (Exception)
            {
                return Json(new { datoAgregado = false, mensaje = "Datos Incorrectos" });
            }
        }

        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idNota, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaDebitoBusiness.CambiarPuntoEstablecimiento(idNota, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
        }


        [HttpPost]
        public ActionResult ActualizarIva(int id, int idIva)
        {
            return Json(new { actualizacion = notaDebitoBusiness.ActualizarIva(id, idIva) });
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idNotaDebito)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (db.Nota_debito.FirstOrDefault(x => x.id == idNotaDebito && x.id_emisior == idEmisor) == null)
            {
                return Json(new { datoEliminado = false, mensaje = "Nota de Débito no existe" });
            }

            notaDebitoBusiness.EliminarDetalle(id, idNotaDebito, idEmisor);
            return Json(new { datoEliminado = true });
        }

        public ActionResult AgregarPago(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.FormasPago = new SelectList(db.Formas_de_Pago, "id", "Descripcion_form_pago");
            ViewBag.Tiempos = new SelectList(facturaBusiness.tiemposPago);
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return View(new ModeloNotaDebitoPago
                {
                    IdNota = id,
                    Valor = 0
                });
            }
            return View(new ModeloNotaDebitoPago
            {
                IdNota = id,
                Valor = factura.Total - factura.Detalle_pago_Factura.Sum(x => x.Valor)
            }); ;
        }

        [HttpPost]
        public ActionResult AgregarPago(ModeloNotaDebitoPago modeloPago)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.FormasPago = new SelectList(db.Formas_de_Pago, "id", "Descripcion_form_pago", modeloPago.IdFormaPago);
            ViewBag.Tiempos = new SelectList(facturaBusiness.tiemposPago, modeloPago.Tiempo);
            if (ModelState.IsValid)
            {
                int idEmisor = GetUsuarioLogeado().IdEmisor;
                var nota = db.Nota_debito.FirstOrDefault(x => x.id == modeloPago.IdNota && x.id_emisior == idEmisor);
                if (nota == null)
                {
                    ModelState.AddModelError("Valor", "Nota de Débito no existe");
                    return View(modeloPago);
                }
                if (modeloPago.Valor <= 0)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar debe ser mayor a cero");
                    return View(modeloPago);
                }
                if (modeloPago.Valor > nota.Total)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar no puede ser mayor a la Nota de Débito: {nota.Total}");
                    return View(modeloPago);
                }
                var sumaPagos = nota.Detalle_pago_nota_debito.Sum(x => x.Valor);
                if ((sumaPagos + modeloPago.Valor) > nota.Total)
                {
                    ModelState.AddModelError("Valor", $"La suma de todos los pagos no puede ser mayor al total de la Nota de Débito: {nota.Total}");
                    return View(modeloPago);
                }
                notaDebitoBusiness.AgregarPago(modeloPago, modeloPago.IdNota, idEmisor);
                return Json(new { pagoAgregado = true });
            }
            return View(modeloPago);
        }

        [HttpPost]
        public ActionResult EliminarPago(int id, int idNota)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaDebitoBusiness.EliminarPago(id, idNota, idEmisor);
            return RedirectToAction("Edit", new { id = idNota });

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
                notaDebitoBusiness.AgregarDatoAcional(modeloDatoAdicional, modeloDatoAdicional.IdComprobante, idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }

        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idNota)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaDebitoBusiness.EliminarAdicional(id, idNota, idEmisor);
            return Json(new { datoEliminado = true });
        }

        [HttpPost]
        public ActionResult FinalizarNotaDebito(ModeloNotaDebito modeloNota)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == modeloNota.Id && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Nota de Débito no existe" });
            }
            if (modeloNota.FechaEmison > DateTime.Now)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Fecha no puede ser mayor a la actual" });
            }
            if (!nota.Detalle_nota_debito.Any())
            {
                return Json(new { retencionFinalizada = false, mensaje = "Nota de Débito no posee detalles" });
            }
            if (nota.estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { retencionFinalizada = false, mensaje = "Nota de Débito ya finalizada anteriormente" });
            }
            if (nota.Total != nota.Detalle_pago_nota_debito.Sum(x => x.Valor))
            {
                return Json(new { facturaFinalizada = false, mensaje = "Nota de Debito con pago incompleto" });
            }
            notaDebitoBusiness.FinalizarNotaDebito(modeloNota, idEmisor);
            return Json(new { retencionFinalizada = true });
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaDebitoBusiness.BorrarNotaDebito(id, idEmisor);
            return Json(new { retencionBorrada = true });
        }


        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            if (nota == null || nota.estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Nota de Debito no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            notaDebitoBusiness.GenerarXml(nota);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.NOTA_DEBITO && x.id_emisor == idEmisor);
            if (nota == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionNotaDebito { NotaDebito = nota, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.NOTA_DEBITO && x.id_emisor == idEmisor);
            if (nota == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionNotaDebito { NotaDebito = nota, Impresion = impresionConfig });
        }

        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);

            if (nota == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "NOTA DE DEBITO " + nota.Numero + ".pdf";
            if (nota.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.NOTA_DEBITO).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);

            if (nota == null)
            {

                return File(new byte[0], "application/xml", "test.xml");
            }
            string nombreArchivo = "NOTA DE DEBITO " + nota.Numero + ".xml";
            if (nota.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo, "application/xml");
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.NOTA_DEBITO).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
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