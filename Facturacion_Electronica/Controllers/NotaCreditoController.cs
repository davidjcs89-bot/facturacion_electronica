using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.NotaCredito;
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
    public class NotaCreditoController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();
        private NotaCreditoBusiness notaCreditoBusiness = new NotaCreditoBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();

        // GET: NotaCredito
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
            var busquedaInicial = new ModeloBuscarNotaCredito { 
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Notas = notaCreditoBusiness.BuscarNotas(busquedaInicial, idEmisor, true);

            return View(new ModeloBuscarNotaCredito { Notas = busquedaInicial.Notas });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarNotaCredito modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Notas = notaCreditoBusiness.BuscarNotas(modeloBuscar, idEmisor);
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
            var modelo = notaCreditoBusiness.GetModeloNotaCredito(id, idEmisor);
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

            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (nota != null && (nota.Estado == EnumEstadosComprobante.FINALIZADO || nota.Estado == EnumEstadosComprobante.AUTORIZADO))
            {
                foreach (var item in nota.Detalle_nota_credito.ToList())
                {
                    if (item.Producto.imagen != null)
                    {
                        lista.Add(item.Producto.imagen);
                    }
                }
            }
            return View("~/Views/Admin/Imagenes.cshtml", lista);
        }

        public ActionResult SeleccionarFactura()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emiso | Menú: Configuración —> Emisor —> r";
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

        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idNota, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaCreditoBusiness.CambiarPuntoEstablecimiento(idNota, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
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

            var modelo = new ModeloNotaCredito
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
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.NOTA_CREDITO);
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
            modelo.Detalles = new List<ModeloNotaCreditoDetalle>();
            modelo.Adicionales = new List<ModeloDatoAdicional>();
            modelo.Id = notaCreditoBusiness.GuardarNotaCredito(modelo, idEmisor);
            foreach (var detalle in factura.Detalles.ToList())
            {
                modelo.Detalles.Add(new ModeloNotaCreditoDetalle
                {
                    IdDetalleFactura = detalle.Id,
                    DetalleFactura = detalle,
                    Cantidad = detalle.Cantidad,
                    Seleccionar = false
                });
            }

            return View(modelo);
        }

        [HttpPost]
        public ActionResult Create(ModeloNotaCredito modeloNotaCredito)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                    .Select(p => new SelectListItem
                                    {
                                        Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                        Value = p.id.ToString()
                                    });
            ViewBag.FechaEmision = modeloNotaCredito.FechaEmison.ToString("yyyy-MM-dd");

            if (modeloNotaCredito.Motivo == null || modeloNotaCredito.Motivo.Trim().Length == 0)
            {
                return Json(new { notaGenerada = false, error = "Ingrese un motivo" });
            }

            if (modeloNotaCredito.FechaEmison > DateTime.Now)
            {
                return Json(new { notaGenerada = false, error = "Fecha de Emisión deber ser menor a la actual" });
                //return View(modeloNotaCredito);
            }

            if (!modeloNotaCredito.Detalles.Any(x => x.Seleccionar))
            {
                //ModelState.AddModelError("Numero", "Debe seleccionar al menos un detalle");
                return Json(new { notaGenerada = false, error = "Debe seleccionar al menos un detalle" });
                //return View(modeloNotaCredito);
            }

            foreach (var detalle in modeloNotaCredito.Detalles)
            {
                if (detalle.Seleccionar)
                {
                    var detalleFactura = db.Detalle_factura.FirstOrDefault(x => x.id == detalle.IdDetalleFactura);
                    if (detalle.Cantidad > detalleFactura.Cantidad)
                    {
                        return Json(new { notaGenerada = false, error = "La cantidad a devolver debe ser menor o igual a la facturada" });
                    }
                }
            }

            //Validar que el total de cantidad de items de la factura no sea menor al total de items de la nota de credito
            if (db.Detalle_factura.Where(x=>x.id_Factura == modeloNotaCredito.IdFactura).Sum(x=>x.Cantidad) < modeloNotaCredito.Detalles.Sum(x=> x.Cantidad))
            {
                return Json(new { notaGenerada = false, error = "El total de items a devolver debe ser menor o igual al de la factura" });
            }

            notaCreditoBusiness.FinalizarNotaCredito(modeloNotaCredito, idEmisor);
            return Json(new { notaGenerada = true });
        }

        public ActionResult Edit(int id)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor) == null)
            {
                return RedirectToAction("Index");
            }

            var modeloNotaCredito = notaCreditoBusiness.GetModeloNotaCredito(id, idEmisor);
            if (modeloNotaCredito.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return View("View", modeloNotaCredito);
            }
            var factura = facturaBusiness.GetModeloFactura(modeloNotaCredito.IdFactura, idEmisor);

            if (factura == null)
            {
                return RedirectToAction("SeleccionarFactura");
            }

            modeloNotaCredito.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloNotaCredito.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.NOTA_CREDITO);
                if (secuencia != null)
                {
                    modeloNotaCredito.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloNotaCredito.DireccionSucursal = puntoEmision.Direccion;
                }
            }
            modeloNotaCredito.Detalles.Clear();
            foreach (var detalle in factura.Detalles.ToList())
            {
                modeloNotaCredito.Detalles.Add(new ModeloNotaCreditoDetalle
                {
                    IdDetalleFactura = detalle.Id,
                    DetalleFactura = detalle,
                    Cantidad = detalle.Cantidad,
                    Seleccionar = false
                });
            }
            ViewBag.FechaEmision = modeloNotaCredito.FechaEmison.ToString("yyyy-MM-dd");
            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            return View("Create", modeloNotaCredito);
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
                notaCreditoBusiness.AgregarDatoAcional(modeloDatoAdicional, modeloDatoAdicional.IdComprobante, idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }
        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idNotaCredito)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaCreditoBusiness.EliminarAdicional(id, idNotaCredito, idEmisor);
            return RedirectToAction("Edit", new { id = idNotaCredito });
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            notaCreditoBusiness.BorrarNotaCredito(id, idEmisor);
            return Json(new { retencionBorrada = true });
        }

        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var notaCredito = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (notaCredito == null || notaCredito.Estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Nota de Crédito no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            notaCreditoBusiness.GenerarXml(notaCredito);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.NOTA_CREDITO && x.id_emisor == idEmisor);
            if (nota == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionNotaCredito { NotaCredito = nota, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.NOTA_CREDITO && x.id_emisor == idEmisor);
            if (factura == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionNotaCredito { NotaCredito = factura, Impresion = impresionConfig });
        }

        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (nota == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "NOTA DE CREDITO " + nota.Numero + ".pdf";
            if (nota.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.NOTA_CREDITO).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (nota == null)
            {

                return File(new byte[0], "application/xml", "test.xml");
            }
            string nombreArchivo = "NOTA DE CREDITO " + nota.Numero + ".xml";
            if (nota.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo, "application/xml");
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.NOTA_CREDITO).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
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