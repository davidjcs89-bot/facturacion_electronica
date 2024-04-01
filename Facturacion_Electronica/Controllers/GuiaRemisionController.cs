using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.GuiaRemision;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Transportista;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class GuiaRemisionController : Controller
    {

        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private GuiaRemisionBusiness guiaRemisionBusiness = new GuiaRemisionBusiness();
        private TransportistaBusiness transportistaBusiness = new TransportistaBusiness();

        // GET: GuiaRemision
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
            var busquedaInicial = new ModeloBuscarGuiaRemision
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Guias = guiaRemisionBusiness.BuscarGuias(busquedaInicial, idEmisor,true);
            return View(new ModeloBuscarGuiaRemision { Guias = busquedaInicial.Guias });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarGuiaRemision modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Guias = guiaRemisionBusiness.BuscarGuias(modeloBuscar, idEmisor);
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
            var modelo = guiaRemisionBusiness.GetModeloGuiaRemision(id, idEmisor);
            if (modelo == null)
            {
                return RedirectToAction("Index");
            }
            if (modelo.Destinatarios.Any())
            {
                modelo.IdDestinatarioSeleccionado = modelo.Destinatarios.FirstOrDefault().Id;
            }
            else
            {
                modelo.IdDestinatarioSeleccionado = 0;
            }

            return View(modelo);
        }

        public ActionResult Imagenes(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var lista = new List<byte[]>();

            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (guia != null && (guia.estado == EnumEstadosComprobante.FINALIZADO || guia.estado == EnumEstadosComprobante.AUTORIZADO))
            {
                foreach (var det in guia.Guia_remision_destinatario.ToList())
                {
                    foreach(var prod in det.Detalles_guia_remision.ToList())
                    {
                        if (prod.Producto.imagen != null)
                        {
                            lista.Add(prod.Producto.imagen);
                        }
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

            var modeloGuia = new ModeloGuiaRemision();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloGuia.EmailUsuario = usuario.Correo;
            }


            modeloGuia.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloGuia.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloGuia.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.GUIA_REMISION);
                if (secuencia != null)
                {
                    modeloGuia.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloGuia.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaInicioTransporte = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaFinTransporte = DateTime.Now.ToString("yyyy-MM-dd");

            modeloGuia.PuntoEmisionId = puntoEmision.id;
            modeloGuia.Transportista = new ModeloTransportista();
            return View(modeloGuia);
        }

        [HttpPost]
        public ActionResult Create([Bind(Exclude = "Transportista")] ModeloGuiaRemision modeloGuia)
        {
            modeloGuia.DireccionPartida = " ";
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            if (modeloGuia.IdentificacionTransportista == null)
            {
                ModelState.AddModelError("IdentificacionTransportista", "Transportista no encontrado");
            }
            else
            {
                var transportista = db.Transportistas.FirstOrDefault(x => x.Id_emisor == idEmisor && x.Numero_identificacion == modeloGuia.IdentificacionTransportista);
               
                if (ModelState.IsValid)
                {

                    if (transportista != null)
                    {
                        modeloGuia.Transportista = transportistaBusiness.BuscarTransportista(transportista.id, idEmisor);
                        modeloGuia.Transportista.Id = transportista.id;
                        modeloGuia.Transportista.Placa = transportista.Placa;
                        var idGuia = guiaRemisionBusiness.GuardarGuia(modeloGuia, idEmisor);
                        return RedirectToAction("Edit", new { id = idGuia });
                    }
                    else
                    {
                        ModelState.AddModelError("IdentificacionTransportista", "Transportista no encontrado");
                    }
                }
            }

            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloGuia.EmailUsuario = usuario.Correo;
            }


            var emisor = emisorBusiness.BuscarEmisor(idEmisor);
            modeloGuia.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloGuia.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloGuia.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.GUIA_REMISION);
                if (secuencia != null)
                {
                    modeloGuia.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloGuia.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaInicioTransporte = modeloGuia.FechaInicioTransporte.ToString("yyyy-MM-dd");
            ViewBag.FechaFinTransporte = modeloGuia.FechaFinTransporte.ToString("yyyy-MM-dd");

            modeloGuia.PuntoEmisionId = modeloGuia.PuntoEmisionId;         
            return View(modeloGuia);
        }

        public ActionResult Edit(int id)
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

            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            var modeloGuia = guiaRemisionBusiness.GetModeloGuiaRemision(id, idEmisor);
            if (modeloGuia == null)
            {
                return RedirectToAction("Index");
            }

            if (usuario != null)
            {
                modeloGuia.EmailUsuario = usuario.Correo;
            }
            modeloGuia.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloGuia.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.GUIA_REMISION);
                if (secuencia != null)
                {
                    modeloGuia.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloGuia.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            try
            {
                if (TempData["IdDestinatarioSeleccionado"] != null && Convert.ToInt32(TempData["IdDestinatarioSeleccionado"].ToString()) != 0)
                {
                    modeloGuia.IdDestinatarioSeleccionado = Convert.ToInt32(TempData["IdDestinatarioSeleccionado"].ToString());
                }
                else
                {
                    if (modeloGuia.Destinatarios.Any())
                    {
                        modeloGuia.IdDestinatarioSeleccionado = modeloGuia.Destinatarios.FirstOrDefault().Id;
                    }
                    else
                    {
                        modeloGuia.IdDestinatarioSeleccionado = 0;
                    }
                }
            }
            catch
            {
                modeloGuia.IdDestinatarioSeleccionado = 0;
            }


            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaInicioTransporte = modeloGuia.FechaInicioTransporte.ToString("yyyy-MM-dd");
            ViewBag.FechaFinTransporte = modeloGuia.FechaFinTransporte.ToString("yyyy-MM-dd");

            return View(modeloGuia);
        }

        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idGuia, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.CambiarPuntoEstablecimiento(idGuia, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
        }

        [HttpGet]
        public ActionResult BuscarTransportista(string identificacion, int idGuia)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var transportista = transportistaBusiness.BuscarTransportistaGuia(identificacion, GetUsuarioLogeado().IdEmisor);
            if (transportista == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            guiaRemisionBusiness.ActualizarTransportista(transportista.Id, idGuia, idEmisor);
            return Json(new { existeTransportista = true, id = transportista.Id, identificacion = transportista.NumerdeIdentificacion, nombre = transportista.Nombre, placa = transportista.Placa, email = transportista.Correo }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarDestinatario(string identificacion, int idGuia)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = clienteBusiness.BuscarClienteGuiaRemision(identificacion, GetUsuarioLogeado().IdEmisor);
            if (cliente == null)
            {
                TempData["identificacionBuscada"] = identificacion;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }
            //guiaRemisionBusiness.ActualizarTransportista(transportista.Id, idGuia, idEmisor);
            return Json(new { existeTransportista = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial}, JsonRequestBehavior.AllowGet);
        }

        public ActionResult AgregarDestinatario(int id)
        {
            ViewBag.FechaEmisionDocumento = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.Documento = new SelectList(db.Tipo_documento.Where(x => x.id == EnumTipoDocumento.FACTURA), "id", "Descripcion_doc");
            return View(new ModeloGuiaDestinatario { IdGuia = id});
        }

        [HttpPost]
        public ActionResult AgregarDestinatario(ModeloGuiaDestinatario destinatario)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.FechaEmisionDocumento = destinatario.FechaEmisionDocumento.ToString("yyyy-MM-dd");
            ViewBag.Documento = new SelectList(db.Tipo_documento.Where(x => x.id == EnumTipoDocumento.FACTURA), "id", "Descripcion_doc",destinatario.IdDocumento);
            if (ModelState.IsValid)
            {
                if (destinatario.IdCliente == 0)
                {
                    ModelState.AddModelError("Identificacion", "Ingrese el cliente");
                    return View(destinatario);
                }

                if (!db.Clientes.Any(x => x.id_emisor == idEmisor && x.id == destinatario.IdCliente && x.tipo_cliente == EnumTipoCliente.DESTINATARIO))
                {
                    ModelState.AddModelError("Identificacion", "Cliente no encotrado");
                    return View(destinatario);
                }
                guiaRemisionBusiness.AgregarDestinatario(destinatario, idEmisor);
                return Json(new { destinatarioAgregado = true });
            }

            if (destinatario.IdCliente == 0)
            {
                ModelState.AddModelError("Identificacion", "Ingrese el cliente");
            }

            if (!db.Clientes.Any(x => x.id_emisor == idEmisor && x.id_emisor == destinatario.IdCliente && x.tipo_cliente == EnumTipoCliente.DESTINATARIO))
            {
                ModelState.AddModelError("Identificacion","Cliente no encotrado");
            }

            return View(destinatario);
        }

        public ActionResult EditarDestinatario(int id,int idGuia)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;

            ViewBag.Documento = new SelectList(db.Tipo_documento.Where(x => x.id == EnumTipoDocumento.FACTURA), "id", "Descripcion_doc");
            var modelo = guiaRemisionBusiness.ObtenerDestinatario(idGuia, id, idEmisor);
            ViewBag.FechaEmisionDocumento = modelo.FechaEmisionDocumento.ToString("yyyy-MM-dd");
            return View(modelo);
        }

        public ActionResult AgregarProducto()
        {
            return View(new ModeloBuscarProducto { Productos = new List<Producto>() });
        }

        [HttpPost]
        public ActionResult BuscarProducto(ModeloBuscarProducto modelo)
        {
            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor);
            modelo.Productos = productos;
            return View("AgregarProducto", modelo);
        }

        [HttpPost]
        public ActionResult AgregarProducto(int id, int idDestinatario, int idGuia, int cantidad)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.AgregarProducto(id, cantidad, idDestinatario, idGuia, idEmisor);
            TempData["IdDestinatarioSeleccionado"] = idDestinatario;
            return Json(new { productoAgregado = true });
        }

        public ActionResult ObtenerProductosDestinatario(int idDestinatario, int idGuia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var destinatario = db.Guia_remision_destinatario.FirstOrDefault(x=>x.id == idDestinatario && x.id_guia == idGuia && x.Guia_remision.id_emisor == idEmisor);
            
            if (destinatario == null)
            {
                return Json(new List<ModeloDetalleGuiaRemision>(), JsonRequestBehavior.AllowGet);
            }

            var listaDetalles = new List<ModeloDetalleGuiaRemision>();
            if (destinatario != null)
            {
                listaDetalles.AddRange(from item in destinatario.Detalles_guia_remision
                              let producto = db.Producto.FirstOrDefault(x=>x.id == item.id_producto && x.id_emisor ==idEmisor)
                              where producto != null
                              select new ModeloDetalleGuiaRemision
                              {
                                  Id = item.id,
                                  Codigo = producto.Codigo,
                                  Descripcion = producto.Nombre,
                                  Cantidad = item.Cantidad
                              });
            }
            return Json(listaDetalles, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idDestinatario, int idGuia)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.EliminarProducto(id, idDestinatario, idGuia, idEmisor);
            return Json(new { detalleEliminado = true });
        }

        [HttpPost]
        public ActionResult EliminarDestinatario(int idDestinatario, int idGuia)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.EliminarDestinatario(idDestinatario,idGuia,idEmisor);
            return Json(new { destinatarioEliminado = true });
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
                guiaRemisionBusiness.AgregarDatoAcional(modeloDatoAdicional, modeloDatoAdicional.IdComprobante, idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }
        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idGuia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.EliminarAdicional(id, idGuia, idEmisor);
            return RedirectToAction("Edit", new { id = idGuia });
        }

        [HttpPost]
        public ActionResult FinalizarGuiaRemision(ModeloGuiaRemision modeloGuia)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == modeloGuia.Id && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return Json(new { guiaFinalizada = false, mensaje = "Guia de Remisión no existe" });
            }

            if (guia.Direccion_partida == null || string.IsNullOrEmpty(modeloGuia.DireccionPartida))
            {
                return Json(new { guiaFinalizada = false, mensaje = "Ingrese la dirección de partida de la Guia de Remisión" });
            }

            if (!guia.Guia_remision_destinatario.Any())
            {
                return Json(new { guiaFinalizada = false, mensaje = "No se han ingresado destinatarios" });
            }

            foreach (var destinatario in guia.Guia_remision_destinatario.ToList())
            {
                if (!destinatario.Detalles_guia_remision.Any())
                {
                    return Json(new { guiaFinalizada = false, mensaje = "Todos los destinatarios deben tener al menos un producto" });
                }
            }


            if (modeloGuia.FechaInicioTransporte != DateTime.Now.Date)
            {
                return Json(new { guiaFinalizada = false, mensaje = "Fecha de inicio de transporte no puede ser diferente a la actual" });
            }

            if (modeloGuia.FechaInicioTransporte > modeloGuia.FechaFinTransporte)
            {
                return Json(new { guiaFinalizada = false, mensaje = "Fecha de fin de transporte no puede ser menor a la de inicio de transporte" });
            }

            if (modeloGuia.DireccionPartida == null || modeloGuia.DireccionPartida.Trim().Length == 0)
            {
                return Json(new { guiaFinalizada = false, mensaje = "ingrese la dirección de partida" });
            }

            if (guia.estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { guiaFinalizada = false, mensaje = "Guia de Remisión ya finalizada anteriormente" });
            }

            guiaRemisionBusiness.FinalizarGuiaRemision(modeloGuia, idEmisor);
            return Json(new { retencionFinalizada = true });
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            guiaRemisionBusiness.BorrarGuiaRemision(id, idEmisor);
            return Json(new { guiaBorrada = true });
        }


        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (guia == null || guia.estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Guia de Remisión no encontrada" }, JsonRequestBehavior.AllowGet);
            }
            guiaRemisionBusiness.GenerarXml(guia);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.GUIA_REMISION && x.id_emisor == idEmisor);
            if (guia == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionGuiaRemision { GuiaRemision = guia, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.GUIA_REMISION && x.id_emisor == idEmisor);
            if (factura == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionGuiaRemision { GuiaRemision = factura, Impresion = impresionConfig });
        }

        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (guia == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "GUIA REMISION " + guia.Numero_comprobante + ".pdf";
            if (guia.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], "application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.GUIA_REMISION).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (guia == null)
            {

                return File(new byte[0], "application/pdf", "test.xml");
            }
            string nombreArchivo = "GUIA REMISION " + guia.Numero_comprobante + ".xml";
            if (guia.estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.GUIA_REMISION).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
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