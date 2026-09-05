using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Compra;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Xml;
using System.Xml.Serialization;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class CompraController : Controller
    {

        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private CompraBusiness compraBusiness = new CompraBusiness();

        // GET: Compra
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
            var busquedaInicial = new ModeloBuscarCompra
            {
                BuscarFechaDesde = DateTime.Now.Date,
                BuscarFechaHasta = DateTime.Now.Date
            };
            busquedaInicial.Compras = compraBusiness.BuscarCompras(busquedaInicial, idEmisor, true);
            return View(busquedaInicial);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarCompra modeloBuscar)
        {

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            modeloBuscar.Compras = compraBusiness.BuscarCompras(modeloBuscar, idEmisor);
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

        // GET: Compra
        public ActionResult ImportarXML()
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
        public ActionResult ImportarXML(HttpPostedFileBase archivo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (archivo == null)
            {
                ModelState.AddModelError("", "Debe cargar un archivo xml");
                return View();
            }

            if (archivo.ContentType != "text/xml")
            {
                ModelState.AddModelError("", "Debe cargar un archivo xml");
                return View();
            }

            var xml = new ModeloCompraXml();
            try
            {
                using var stream = archivo.InputStream;
                xml = compraBusiness.CargarModeloCompraPorXml(stream);

            }
            catch (Exception e)
            {
                ViewBag.Error = "Archivo xml no cumple el formato, " + e.Message;
                return View();
            }

            ViewBag.Bodegas = new SelectList(db.Bodegas.Where(x => x.id_emisor == idEmisor && x.activa), "id", "nombre");
            return View("Create", xml);
        }

        public ActionResult Create(ModeloCompraXml compra)
        {
            if (compra == null)
            {
                return RedirectToAction("Index");
            }

            return View(compra);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult CreateCompra(ModeloCompraXml modelo)
        {
            try
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;
                if (ModelState.IsValid)
                {
                    compraBusiness.GuardarCompra(modelo, idEmisor);
                    //return RedirectToAction("Index")
                    ViewBag.Correcto = "Archivo xml cargado Correctamrnte";
                    return RedirectToAction("Index");
                }
                return View("Create", modelo);
            }
            catch (Exception e)
            {
                ModelState.AddModelError(string.Empty, e.Message);
                return View("Create",modelo);
            }

        }

        public ActionResult Details(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var compra = db.Compra.FirstOrDefault(x=>x.id == id && x.id_emisor == idEmisor);

            if (compra == null)
            {
                return RedirectToAction("Index");
            }

            return View(compra);
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