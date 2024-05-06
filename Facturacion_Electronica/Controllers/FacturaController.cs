using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Xml;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class FacturaController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();
        private Productobusiness productobusiness = new Productobusiness();

        // GET: Factura
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
            var busquedaInicial = new ModeloBuscarFactura
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Facturas = facturaBusiness.BuscarFacturas(busquedaInicial, idEmisor,true);
            return View(new ModeloBuscarFactura { Facturas = busquedaInicial.Facturas });
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarFactura modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Facturas = facturaBusiness.BuscarFacturas(modeloBuscar, idEmisor);
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
            var modelo = facturaBusiness.GetModeloFactura(id, idEmisor);
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

            var factura = db.Factura.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);
            if (factura != null && (factura.Estado == EnumEstadosComprobante.FINALIZADO || factura.Estado == EnumEstadosComprobante.AUTORIZADO))
            {
                foreach (var item in factura.Detalle_factura.ToList())
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

            var modeloFactura = new ModeloFactura();
            var nombreUsuario = GetUsuarioLogeado().NombreUsuario;
            var usuario = db.Usuario.FirstOrDefault(x => x.Nombre_usuario == nombreUsuario);
            if (usuario != null)
            {
                modeloFactura.EmailUsuario = usuario.Correo;
            }


            modeloFactura.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloFactura.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloFactura.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloFactura.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloFactura.DireccionSucursal = puntoEmision.Direccion;
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
            modeloFactura.EsConsumidorFinal = true;
            modeloFactura.PuntoEmisionId = puntoEmision.id;
            modeloFactura.FechaEmison = DateTime.Now;
            modeloFactura.Cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            modeloFactura.Id = facturaBusiness.GuardarFactura(modeloFactura, idEmisor);
            modeloFactura.Detalles = new List<ModeloFacturaDetalle>();
            modeloFactura.Pagos = new List<ModeloFacturaPago>();
            modeloFactura.Adicionales = new List<ModeloDatoAdicional>();
            modeloFactura.PermiteEditarCliente = true;
            modeloFactura.PermiteEditarDetalles = true;
            return RedirectToAction("Edit",new { id = modeloFactura.Id});
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

            var factura = db.Factura.Find(id);
            if (factura == null || factura.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }

            var modeloFactura = facturaBusiness.GetModeloFactura(id,idEmisor);
            if (modeloFactura == null)
            {
                return RedirectToAction("Index");
            }

            if (usuario != null)
            {
                modeloFactura.EmailUsuario = usuario.Correo;
            }

            modeloFactura.Emisor = emisor;
            var ambiente = db.Tipo_ambientes.Find(emisor.TipoAmbiente);
            if (ambiente != null)
            {
                modeloFactura.Ambiente = ambiente.Descripcion_ambiente;
            }

            modeloFactura.ClaveAcceso = "0101010110101010101010101010101010101010101010101010101";
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == modeloFactura.PuntoEmisionId);
            if (puntoEmision != null)
            {
                //Primero por defecto
                var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == puntoEmision.id && x.Id_Documentos == EnumTipoDocumento.FACTURA);
                if (secuencia != null)
                {
                    modeloFactura.Numero = puntoEmision.Numero_establecimiento + "-" + puntoEmision.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                    modeloFactura.DireccionSucursal = puntoEmision.Direccion;
                }
            }

            ViewBag.PuntoEmision = db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor)
                                                .Select(p => new SelectListItem
                                                {
                                                    Text = p.Numero_establecimiento + "-" + p.Numero_emision,
                                                    Value = p.id.ToString()
                                                });
            ViewBag.FechaEmision = factura.Fecha_emision.ToString("yyyy-MM-dd");
            modeloFactura.EsConsumidorFinal = modeloFactura.Cliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL;

            ViewBag.Impresion = emisor.Adicionales;

            return View("Create", modeloFactura);
        }


        [HttpPost]
        public ActionResult Create(ModeloFactura modeloFactura)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;
                int facturaId = facturaBusiness.GuardarFactura(modeloFactura, idEmisor);
                return RedirectToAction("Edit", new { id = facturaId });
            }
            return View(modeloFactura);
        }

        [HttpPost]
        public ActionResult Delete(int id)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.BorrarFactura(id, idEmisor);
            return Json(new { facturaBorrada = true });
        }

        public ActionResult DescripcionFactura()
        {
            return Content("s");
        }

        public ActionResult AgregarProducto()
        { 
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var productos = db.Producto.Where(x=> (x.Codigo.Equals("servicio", StringComparison.OrdinalIgnoreCase) || x.Codigo.Equals("producto", StringComparison.OrdinalIgnoreCase)) && x.id_emisor == idEmisor ).ToList();

            if (productos == null)
            {
                return View(new ModeloBuscarProducto { Productos = new List<Producto>() });
            }
            return View(new ModeloBuscarProducto { Productos = productos });

        }

        [HttpPost]
        public ActionResult AgregarProducto(ModeloBuscarProducto modelo)
        {
            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor);
            modelo.Productos = productos;
            return View(modelo);
        }

        [HttpPost]
        public ActionResult AgregarProductoFactura(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.AgregarProducto(idFactura, id, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });

        }

        [HttpPost]
        public ActionResult ActualizarPrecioDetalle(int id, int idFactura, decimal nuevoPrecio)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevoPrecio <= 0)
                {
                    return RedirectToAction("Edit", new { id = idFactura });
                }
                facturaBusiness.ActualizarPrecioDetalle(id, idFactura, idEmisor, nuevoPrecio);
                return RedirectToAction("Edit", new { id = idFactura });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idFactura });
            }
        }

        [HttpPost]
        public ActionResult ActualizarFechaFactura(int idFactura, string nuevaFecha)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                var fecha = Convert.ToDateTime(nuevaFecha);
                if (fecha > DateTime.Now)
                {
                    return Json(new { fechaActualizada = false, mensaje = "Fecha debe ser menor o igual a la actual" });
                }
                facturaBusiness.ActualizarFecha(idFactura, fecha, idEmisor);
                return Json(new { fechaActualizada = true, mensaje = "" });
            }
            catch (Exception)
            {
                return Json(new { fechaActualizada = false, mensaje = "No se pudo actualizar la fecha" });
            }
        }

        [HttpPost]
        public ActionResult ActualizarAdicionalDetalle(int id, int idFactura, string adicional)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (adicional == null)
                {
                    return RedirectToAction("Edit", new { id = idFactura });
                }
                facturaBusiness.ActualizarAdicionalDetalle(id, idFactura, idEmisor, adicional);
                return RedirectToAction("Edit", new { id = idFactura });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idFactura });
            }
        }

        [HttpPost]
        public ActionResult ActualizarCantidadDetalle(int id, int idFactura, int nuevaCantidad)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (nuevaCantidad <= 0)
                {
                    return RedirectToAction("Edit", new { id = idFactura });
                }
                facturaBusiness.ActualizarCantidadDetalle(id, idFactura, idEmisor, nuevaCantidad);
                return RedirectToAction("Edit", new { id = idFactura });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idFactura });
            }
        }

        [HttpPost]
        public ActionResult ActualizarPorcentajeDescuentoDetalle(int id, int idFactura, decimal porcentaje)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            try
            {
                if (porcentaje < 0)
                {
                    return RedirectToAction("Edit", new { id = idFactura });
                }
                else if (porcentaje > 100)
                {
                    porcentaje = 100;
                }
                facturaBusiness.ActualizarPorcentajeDescuentoDetalle(id, idFactura, idEmisor, porcentaje);
                return RedirectToAction("Edit", new { id = idFactura });
            }
            catch (Exception)
            {
                return RedirectToAction("Edit", new { id = idFactura });
            }
        }

        [HttpPost]
        public ActionResult EliminarDetalle(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.EliminarDetalle(id, idFactura, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });

        }


        [HttpGet]
        public ActionResult BuscarConsumidorFinal(int idFactura)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x => x.id_emisor == idEmisor && x.id == idFactura);
            if (factura == null)
            {
                return Json(new { clienteActualizado = false }, JsonRequestBehavior.AllowGet);
            }
            if (factura.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL)
            {
                return Json(new { clienteActualizado = false, mensaje = $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, para cambiar a Consumidor Final" }, JsonRequestBehavior.AllowGet);
            }
            facturaBusiness.ActualizarAConsumidorFinal(idFactura, idEmisor);
            var cliente = clienteBusiness.GenerarModeloCliente(EnumDatosGenerales.ID_CONSUMIDOR_FINAL);
            return Json(new { clienteActualizado = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult ObtenerDatosFacturaPuntoEmision(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.id == id && x.Id_emisor == idEmisor);
            if (puntoEmision == null)
            {
                return Json(new { existenPuntoEmison = false }, JsonRequestBehavior.AllowGet);
            }
            var secuenciaFactura = puntoEmision.Secuencias.FirstOrDefault(x => x.Id_Documentos == EnumTipoDocumento.FACTURA);
            if (secuenciaFactura == null)
            {
                return Json(new { existenPuntoEmison = false }, JsonRequestBehavior.AllowGet);
            }
            return Json(new { existenPuntoEmison = true, numeroFactura = $"{puntoEmision.Numero_establecimiento}-{puntoEmision.Numero_emision}-{secuenciaFactura.Secuencial.ToString("D9")}", direccion = puntoEmision.Direccion }, JsonRequestBehavior.AllowGet);
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
            facturaBusiness.ActualizarCliente(cliente.Id, idFactura, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.NumeroIdentificacion, nombre = cliente.RazonSocial, direccion = cliente.Direccion , email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
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
        public ActionResult ActualizarClienteSelecionado(ModelClienteSeleccionado cliente, int idFactura)
        {
            Debug.WriteLine("HOLA HOLA HOLA HOLA HOLA HOLA HOLA");
            if (cliente is null)
            {
                TempData["identificacionBuscada"] = cliente;
                return Json(new { existeCliente = false }, JsonRequestBehavior.AllowGet);
            }

            int idEmisor = GetUsuarioLogeado().IdEmisor;

            facturaBusiness.ActualizarCliente(cliente.Id, idFactura, idEmisor);
            return Json(new { existeCliente = true, id = cliente.Id, identificacion = cliente.Identificacion, nombre = cliente.Nombre, direccion = cliente.Direccion, email = cliente.Email, celular = cliente.Celular }, JsonRequestBehavior.AllowGet);
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
                return View(new ModeloFacturaPago
                {
                    IdFactura = id,
                    Valor = 0
                });
            }
            return View(new ModeloFacturaPago
            {
                IdFactura = id,
                Valor = factura.Total - factura.Detalle_pago_Factura.Sum(x => x.Valor)
            }); ;
        }

        [HttpPost]
        public ActionResult AgregarPago(ModeloFacturaPago modeloPago)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.FormasPago = new SelectList(db.Formas_de_Pago, "id", "Descripcion_form_pago", modeloPago.IdFormaPago);
            ViewBag.Tiempos = new SelectList(facturaBusiness.tiemposPago, modeloPago.Tiempo);
            if (ModelState.IsValid)
            {
                int idEmisor = GetUsuarioLogeado().IdEmisor;
                var factura = db.Factura.FirstOrDefault(x => x.id == modeloPago.IdFactura && x.id_emisor == idEmisor);
                if (factura == null)
                {
                    ModelState.AddModelError("Valor", "Factura no existe");
                    return View(modeloPago);
                }
                if (modeloPago.Valor <= 0)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar debe ser mayor a cero");
                    return View(modeloPago);
                }
                if (modeloPago.Valor > factura.Total)
                {
                    ModelState.AddModelError("Valor", $"El total a pagar no puede ser mayor al la factura: {factura.Total}");
                    return View(modeloPago);
                }
                var sumaPagos = factura.Detalle_pago_Factura.Sum(x => x.Valor);
                if ((sumaPagos + modeloPago.Valor) > factura.Total)
                {
                    ModelState.AddModelError("Valor", $"La suma de todos los pagos no puede ser mayor al total de factura: {factura.Total}");
                    return View(modeloPago);
                }
                facturaBusiness.AgregarPago(modeloPago, modeloPago.IdFactura, idEmisor);
                return Json(new { pagoAgregado = true });
            }
            return View(modeloPago);
        }

        [HttpPost]
        public ActionResult EliminarPago(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.EliminarPago(id, idFactura, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });

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
                facturaBusiness.AgregarDatoAcional(modeloDatoAdicional,modeloDatoAdicional.IdComprobante,idEmisor);
                return Json(new { datoAgregado = true });
            }
            return View(modeloDatoAdicional);
        }
        [HttpPost]
        public ActionResult EliminarAdicional(int id, int idFactura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.EliminarAdicional(id, idFactura, idEmisor);
            return RedirectToAction("Edit", new { id = idFactura });
        }

        [HttpPost]
        public ActionResult FinalizarFactura(int idFacura)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x => x.id == idFacura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return Json(new { facturaFinalizada = false, mensaje = "Factura no existe" });
            }
            if (factura.Estado == EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { facturaFinalizada = false, mensaje = "Factura ya finalizada anteriormente" });
            }

            if (factura.Total != factura.Detalle_pago_Factura.Sum(x=>x.Valor))
            {
                return Json(new { facturaFinalizada = false, mensaje = "Factura con pago incompleto" });
            }
            facturaBusiness.FinalizarFactura(idFacura, idEmisor);
            return Json(new { facturaFinalizada = true });

        }

        [HttpPost]
        public ActionResult GenerarComprobanteElectronico(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);
            /*if (factura == null || factura.Estado != EnumEstadosComprobante.FINALIZADO)
            {
                return Json(new { generado = false, mensaje = "Factura no encontrada" }, JsonRequestBehavior.AllowGet);
            }*/
            facturaBusiness.GenerarXml(factura);
            return Json(new { generado = true, mensaje = "Comprobante Generado Correctamente" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Impresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x=>x.id_comprobante == EnumTipoDocumento.FACTURA && x.id_emisor == idEmisor);
            if (factura == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionFactura { Factura = factura, Impresion = impresionConfig });
        }

        public ActionResult PreImpresion(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            var impresionConfig = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == EnumTipoDocumento.FACTURA && x.id_emisor == idEmisor);
            if (factura == null || impresionConfig == null)
            {
                return Content("<h2>Impresión no configurada</h2>");
            }
            return View(new ModeloImpresionFactura { Factura = factura, Impresion = impresionConfig });
        }

        [HttpPost]
        public ActionResult CambiarPuntoEmision(int idFactura, int idPuntoEmision)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            facturaBusiness.CambiarPuntoEstablecimiento(idFactura, idPuntoEmision, idEmisor);
            return Json(new { actualizado = true });
        }


        public ActionResult DescargarRide(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);

            if (factura == null)
            {

                return File(new byte[0], "application/pdf", "test.pdf");
            }
            string nombreArchivo = "FACTURA " + factura.Numero + ".pdf";
            if (factura.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0],"application/pdf", nombreArchivo);
            }

            var documento = db.Documentos_Electronicos.Where(x=>x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.FACTURA).OrderByDescending(x=>x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.ride.Length > 0)
            {
                return File(documento.ride, "application/pdf", nombreArchivo);
            }
            return File(new byte[0], nombreArchivo, "application/pdf");
        }

        public ActionResult DescargarXml(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (factura == null)
            {

                return File(new byte[0], "application/xml", "test.xml");
            }
            string nombreArchivo = "FACTURA "+ factura.Numero + ".xml";
            if (factura.Estado != EnumEstadosComprobante.AUTORIZADO)
            {
                return File(new byte[0], nombreArchivo, "application/xml");
            }

            var documento = db.Documentos_Electronicos.Where(x => x.id_comprobante == id && x.id_tipo_comprobante == EnumTipoDocumento.FACTURA).OrderByDescending(x => x.id).Take(1).FirstOrDefault();
            if (documento != null && documento.xml_retornado.Length > 0)
            {
                return File(System.Text.Encoding.UTF8.GetBytes(documento.xml_retornado),  "application/xml", nombreArchivo);
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