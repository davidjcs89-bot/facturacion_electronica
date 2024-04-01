using Facturacion_Electronica.Models.Impresion;
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
    public class ImpresionController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        // GET: Impresion
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            ViewBag.TipoComprobante = new SelectList(db.Tipo_documento.ToList(), "id", "Descripcion_doc");
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloConfigImpresion modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.TipoComprobante = new SelectList(db.Tipo_documento.ToList(), "id", "Descripcion_doc",modelo.IdTipoComprobante);
            var configImpresion = db.impresion_comprobantes.FirstOrDefault(x=>x.id_comprobante == modelo.IdTipoComprobante && x.id_emisor == idEmisor);

            if (configImpresion == null)
            {
                db.impresion_comprobantes.Add(new impresion_comprobantes { id_emisor = idEmisor, id_comprobante = modelo.IdTipoComprobante, firma = modelo.Firma, mensajes = modelo.Mensajes });
            }
            else
            {
                configImpresion.firma = modelo.Firma;
                configImpresion.mensajes = modelo.Mensajes;
            }

            db.SaveChanges();
            return View();
        }

        public ActionResult GetConfigImpresionComprobante(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var configImpresion = db.impresion_comprobantes.FirstOrDefault(x => x.id_comprobante == id && x.id_emisor == idEmisor);
            if (configImpresion == null)
            {
                return Json(new { firma = false, mensajes = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { firma = configImpresion.firma, mensajes =configImpresion.mensajes }, JsonRequestBehavior.AllowGet);
            }
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