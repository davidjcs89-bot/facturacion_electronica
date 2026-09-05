using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Hosting;
using System.Web.Mvc;
using System.Web.Security;
using ExcelDataReader;
using Facturacion_Electronica;
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Producto;
using Facturacion_Electronica.Models.Usuario;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class IngresosBodegaController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private Productobusiness productobusiness = new Productobusiness();

        // GET: IngresosBodega
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var ingresos_bodega = new List<ModeloIngresoExitencias>();
            foreach (var ingreso in db.Ingresos_bodega.Where(x=>x.id_emisor == idEmisor).OrderByDescending(x=>x.id).ToList())
            {
                ingresos_bodega.Add(new ModeloIngresoExitencias { 
                    Bodega = ingreso.Bodegas.nombre,
                    Fecha = ingreso.fecha.ToString("dd/MM/yyyy HH:mm"),
                    Id = ingreso.id,
                    TotalItems = ingreso.Ingresos_bodega_detalle.Sum(x=>x.cantidad)
                });
            }
            return View(ingresos_bodega);
        }

        public ActionResult Details(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var ingresos_bodega = db.Ingresos_bodega.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);

            if (ingresos_bodega == null)
            {
                return RedirectToAction("Index");
            }

            var modelo = new ModeloIngresoExitencias
            {
                Bodega = ingresos_bodega.Bodegas.nombre,
                Fecha = ingresos_bodega.fecha.ToString("dd/MM/yyyy HH:mm"),
                Id = ingresos_bodega.id,
                TotalItems = ingresos_bodega.Ingresos_bodega_detalle.Sum(x => x.cantidad)
            };

            foreach (var detalle in ingresos_bodega.Ingresos_bodega_detalle.ToList())
            {
                modelo.detalle.Add(new ModeloDetalleIngresoExistencias
                {
                    producto = productobusiness.GenerarModeloProducto(detalle.id_producto),
                    Cantidad = detalle.cantidad
                }); 
            }

            return View(modelo);
        }

        // GET: IngresosBodega/Create
        public ActionResult Create()
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

            ViewBag.Bodegas = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa), "id", "nombre");

            return View(new ModeloIngresoExitencias());
        }

        public ActionResult CargarExistencias()
        {
            return RedirectToAction("Create");
        }

        // POST: IngresosBodega/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CargarExistencias(ModeloIngresoExitencias modelo, HttpPostedFileBase archivo)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.Bodegas = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa), "id", "nombre", modelo.IdBodega);

            if (archivo == null)
            {
                ViewBag.Error = "Debe selecconar un archivo";
                return View("Create", modelo);
            }

            if (!FileIsValid(archivo))
            {
                ViewBag.Error = "Archivo en formato incorrecto";
                return View("Create", modelo);
            }

            using (var stream = archivo.InputStream)
            {
                using (var reader = ExcelReaderFactory.CreateReader(stream))
                {
                    int i = 0;
                    try
                    {
                        while (reader.Read()) 
                        {
                            if (i == 0)
                            {
                                i++;
                                continue;
                            }

                            var codigo = reader.GetValue(0);
                            var cantidad = reader.GetValue(1);

                            if (codigo == null || codigo.ToString().Trim().Length == 0 || cantidad == null || cantidad.ToString().Trim().Length == 0)
                            {
                                ViewBag.Error = "Informacion incompleta";
                                return View("Create", modelo);
                            }

                            if (!db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo.Equals(codigo.ToString(), StringComparison.OrdinalIgnoreCase)))
                            {
                                ViewBag.Error = "No existe el producto con en código: " + codigo.ToString();
                                return View("Create", modelo);
                            }

                            if (Convert.ToInt32(cantidad) <= 0)
                            {
                                ViewBag.Error = "La cantidad debe ser mayor a cero";
                                return View("Create", modelo);
                            }

                            modelo.detalle.Add(new ModeloDetalleIngresoExistencias
                            {
                                Cantidad = Convert.ToInt32(cantidad),
                                producto = productobusiness.GenerarModeloProducto(codigo.ToString(), idEmisor)
                            });

                        }

                    }
                    catch (Exception e)
                    {
                        ViewBag.Error = "Los datos esta incorrectos<br/>" + e.Message;
                    }

                }
            }


            return View("Create", modelo);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloIngresoExitencias modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            if (modelo.detalle.Count == 0)
            {
                return Json(new { ingresoExitoso = false, mensaje = "No ha cargado el detalle de productos" });
            }

            var resultado = productobusiness.CargarExistenciasBodega(modelo, idEmisor);

            return Json(new { ingresoExitoso = String.IsNullOrEmpty(resultado), mensaje = resultado });
        }
                 
                protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
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

        public FileResult DescargarPlantilla()
        {
            byte[] fileBytes = System.IO.File.ReadAllBytes(HostingEnvironment.MapPath("~/Adicionales/PlantillaInventario.xlsx"));
            string fileName = "1 Plantilla ingreso de existencias sidoit.xlsx";
            return File(fileBytes, System.Net.Mime.MediaTypeNames.Application.Octet, fileName);
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
