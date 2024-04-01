using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Web.Mvc;
using Facturacion_Electronica;
using System.Web.Security;
using Facturacion_Electronica.Models.Usuario;
using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Business;
using System.Web.Hosting;
using ExcelDataReader;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class ClienteController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();

        // GET: Cliente
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(new ModeloBuscarClientes { Clientes = new List<Clientes>(), BuscarTodos = false });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarClientes modelo)
        {
            var clientes = clienteBusiness.BuscarClientes(modelo, GetUsuarioLogeado().IdEmisor);
            modelo.Clientes = clientes;
            return View(modelo);
        }

        // GET: Cliente/Create
        public ActionResult Create(int origen)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            switch (origen)
            {
                case 1:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion");
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion");
                    break;

                case 2:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.SUJETO_RETENCION), "id", "Descripcion");
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion");
                    break;

                case 3:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion");
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL && x.id != EnumTipoIdentificacion.RUC), "id", "Descripcion");
                    break;

                case 4:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.DESTINATARIO), "id", "Descripcion");
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion");
                    break;

                default:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente, "id", "Descripcion");
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion");
                    break;
            }


            var idenficacionBuscada = TempData["identificacionBuscada"]?.ToString();
            return View(new ModeloCliente { TipoIdentificacionId = EnumTipoIdentificacion.CEDULA, NumeroIdentificacion = idenficacionBuscada, OrigenPenticionNuevoCliente = origen });
        }

        // POST: Cliente/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloCliente modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            switch (modelo.OrigenPenticionNuevoCliente)
            {
                case 1:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modelo.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modelo.TipoIdentificacionId);
                    break;

                case 2:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.SUJETO_RETENCION), "id", "Descripcion", modelo.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modelo.TipoIdentificacionId);
                    break;

                case 3:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modelo.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL && x.id != EnumTipoIdentificacion.RUC), "id", "Descripcion", modelo.TipoIdentificacionId);
                    break;

                case 4:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.DESTINATARIO), "id", "Descripcion", modelo.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modelo.TipoIdentificacionId);
                    break;

                default:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente, "id", "Descripcion", modelo.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modelo.TipoIdentificacionId);
                    break;
            }

            if (ModelState.IsValid)
            {
                if (modelo.TipoIdentificacionId == EnumTipoIdentificacion.CEDULA || modelo.TipoIdentificacionId == EnumTipoIdentificacion.RUC)
                {
                    if (!emisorBusiness.ValidarCedulaRuc(modelo.NumeroIdentificacion, modelo.TipoIdentificacionId == EnumTipoIdentificacion.RUC))
                    {
                        ModelState.AddModelError("NumeroIdentificacion", "Número de Identificación incorrecto");
                        return View(modelo);
                    }
                }

                if (db.Clientes.Where(x => (x.id_emisor == idEmisor && x.tipo_cliente == modelo.TipoClienteId  && x.identificacion == modelo.NumeroIdentificacion)).Any())
                {
                    ModelState.AddModelError("Id", "Ya existe un cliente del mismo tipo y con la misma identificación registrado anteriormente");
                    return View(modelo);
                }

                clienteBusiness.CrearCliente(modelo, GetUsuarioLogeado().IdEmisor);
                return Json(new { clienteCreado = true, identificacion = modelo.NumeroIdentificacion, origen = modelo.OrigenPenticionNuevoCliente });
            }


            return View(modelo);
        }

        // GET: Cliente/Edit/5
        public ActionResult Edit(int id, int origen)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            if (id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL) return null;
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                return Content("Aun no a configurado los datos de emisor");
            }
            Clientes clientes = db.Clientes.Find(id);
            if (clientes == null || clientes.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }
            var modeloCliente = clienteBusiness.GenerarModeloCliente(id);
            modeloCliente.OrigenPenticionNuevoCliente = origen;
            switch (origen)
            {
                case 1:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                case 2:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.SUJETO_RETENCION), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                case 3:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL && x.id != EnumTipoIdentificacion.RUC), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                default:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente, "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;
            }

            return View(modeloCliente);
        }

        // POST: Cliente/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(ModeloCliente modeloCliente)
        {
            if (modeloCliente.Id == EnumDatosGenerales.ID_CONSUMIDOR_FINAL) return null;
            switch (modeloCliente.OrigenPenticionNuevoCliente)
            {
                case 1:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                case 2:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.SUJETO_RETENCION), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                case 3:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente.Where(x => x.id == EnumTipoCliente.CLIENTE), "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL && x.id != EnumTipoIdentificacion.RUC), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;

                default:
                    ViewBag.TipoCliente = new SelectList(db.Tipo_cliente, "id", "Descripcion", modeloCliente.TipoClienteId);
                    ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloCliente.TipoIdentificacionId);
                    break;
            }
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloCliente.IdEmisor = idEmisor;
            if (ModelState.IsValid)
            {
                if (modeloCliente.TipoIdentificacionId == EnumTipoIdentificacion.CEDULA || modeloCliente.TipoIdentificacionId == EnumTipoIdentificacion.RUC)
                {
                    if (!emisorBusiness.ValidarCedulaRuc(modeloCliente.NumeroIdentificacion, modeloCliente.TipoIdentificacionId == EnumTipoIdentificacion.RUC))
                    {
                        ModelState.AddModelError("NumeroIdentificacion", "Número de Identificación incorrecto");
                        return View(modeloCliente);
                    }
                }

                if (db.Clientes.Where(x => (x.id != modeloCliente.Id && x.id_emisor == idEmisor && x.tipo_cliente == modeloCliente.TipoClienteId &&  x.identificacion == modeloCliente.NumeroIdentificacion)).Any())
                {
                    ModelState.AddModelError("Id", "Ya existe un cliente del mismo tipo y con la misma identificación registrado anteriormente");
                    return View(modeloCliente);
                }

                clienteBusiness.ActualizarCliente(modeloCliente);
                return Json(new { clienteActualizado = true, identificacion = modeloCliente.NumeroIdentificacion, origen = modeloCliente.OrigenPenticionNuevoCliente });
            }

            return View(modeloCliente);
        }

        public ActionResult Notas(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var adicionales = clienteBusiness.ObtenerDatosAdicionales(id, idEmisor);
            if (adicionales == null)
            {
                return RedirectToAction("Index");
            }
            return View(adicionales);
        }

        [HttpPost]
       // [ValidateAntiForgeryToken]
        public ActionResult Notas(DatosAdicionalesCliente modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var idUsuario = GetUsuarioLogeado().id;
            if (ModelState.IsValid)
            {
                clienteBusiness.GuardarAdicional(modelo, idUsuario);
            }
            return View(clienteBusiness.ObtenerDatosAdicionales(modelo.IdCliente, idEmisor));
        }

        public ActionResult CreateNota()
        {
            return View();
        }

        public ActionResult EliminarNota(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var cliente = db.Datos_Adicionales_Cliente.FirstOrDefault(x=>x.id == id);
            if (cliente == null)
            {
                return RedirectToAction("CreateNota");
            }
            clienteBusiness.EliminarAdicional(id, idEmisor);
            return RedirectToAction("Notas", new { id = cliente.id_cliente });
        }

        public FileResult DescargarPlantillaImportacion()
        {
            byte[] fileBytes = System.IO.File.ReadAllBytes(HostingEnvironment.MapPath("~/Adicionales/PlantillaClientes.xls"));
            string fileName = "Plantilla.xls";
            return File(fileBytes, System.Net.Mime.MediaTypeNames.Application.Octet, fileName);
        }

        public ActionResult Importar()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Importar(HttpPostedFileBase archivo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var emisor = db.Emisor.FirstOrDefault(x => x.id == idEmisor);

            if (emisor == null)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            if (archivo == null)
            {
                ViewBag.Error = "Debe selecconar un archivo";
                return View();
            }

            if (!FileIsValid(archivo))
            {
                ViewBag.Error = "Archivo en formato incorrecto";
                return View();
            }

            using (var stream = archivo.InputStream)
            {
                using (var reader = ExcelReaderFactory.CreateReader(stream))
                {
                    int i = 0;
                    try
                    {
                        while (reader.Read()) //Each row of the file
                        {
                            if (i == 0)
                            {
                                i++;
                                continue;
                            }

                            var nombre = reader.GetValue(0);
                            var tipoId = reader.GetValue(1);
                            var numeroId = reader.GetValue(2);
                            var tipoCliente = reader.GetValue(3);
                            var direccion = reader.GetValue(4);
                            var celular = reader.GetValue(5);
                            var telefono = reader.GetValue(6);
                            var extencion = reader.GetValue(7);
                            var email = reader.GetValue(8);

                            if (nombre == null || nombre.ToString().Trim().Length == 0 || tipoId == null || tipoId.ToString().Trim().Length == 0 || numeroId == null || numeroId.ToString().Trim().Length == 0 || tipoCliente == null || tipoCliente.ToString().Trim().Length == 0)
                            {
                                ViewBag.Error = "Informacion incompleta";
                                return View();
                            }

                            if (db.Clientes.Any(x => x.id_emisor == idEmisor && x.identificacion.Equals(numeroId.ToString(), StringComparison.OrdinalIgnoreCase)))
                            {
                                ViewBag.Error = "Ya existe un cliente con el numero de identificacion: " + numeroId.ToString();
                                return View();
                            }

                            var tipoIdentId = 1;
                            var tipoIdentDt = db.Tipo_Identificacion.FirstOrDefault(x => x.Descripcion.Equals(tipoId.ToString(), StringComparison.OrdinalIgnoreCase));
                            if (tipoIdentDt != null)
                            {
                                tipoIdentId = tipoIdentDt.id;
                            }

                            var tipoClienteId = 1;
                            var tipoClientDt = db.Tipo_cliente.FirstOrDefault(x => x.Descripcion.Equals(tipoCliente.ToString(), StringComparison.OrdinalIgnoreCase));
                            if (tipoClientDt != null)
                            {
                                tipoClienteId = tipoClientDt.id;
                            }

                            var cliente = new Clientes
                            {
                                id_emisor = idEmisor,
                                nombre_cliente = nombre.ToString().ToUpper(),
                                tipo_identificacion = tipoIdentId,
                                tipo_cliente = tipoClienteId,
                                identificacion = numeroId.ToString(),
                                telefono_fijo = telefono != null?telefono.ToString():"",
                                telefono_movil = celular != null ? celular.ToString() : "",
                                Direccion = direccion != null ? direccion.ToString().ToUpper() : "",
                                correo = email != null ? email.ToString().ToUpper() : "",
                                fecha_creacion = DateTime.Now,
                                fecha_modificacion = DateTime.Now
                            };
                            db.Clientes.Add(cliente);
                        }
                        db.SaveChanges();

                    }
                    catch (Exception e)
                    {
                        ViewBag.Error = "Los datos esta incorrectos<br/>" + e.Message;
                    }

                }
            }
            return View();
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
                IdEmisor = (emisor == null || emisor.Emisor == null) ? 0 : emisor.id_emisor.Value,
                id = emisor.id
            };
            return modelo;
        }

        private bool FileIsValid(HttpPostedFileBase fileUpload)
        {
            if (fileUpload == null)
            {
                return false;
            }
            if (fileUpload.ContentType == "application/vnd.ms-excel" ||
                fileUpload.ContentType == "application/excel" ||
                fileUpload.ContentType == "application/x-msexcel" ||
                fileUpload.ContentType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" //this is xlsx format
                )
                return true;

            return false;
        }
    }
}
