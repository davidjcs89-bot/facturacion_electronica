using Facturacion_Electronica.Models.Comprobantes;
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
    public class FallidosController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        public ActionResult Comprobantes()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var fechaDesde = DateTime.Now.Date.AddDays(-30);
            var fechaHasta = DateTime.Now.Date.AddDays(1);
            var documentos = db.vw_comprobantes_no_autorizados.Where(x=>x.id_emisor == idEmisor && x.fecha_modificacion >= fechaDesde && x.fecha_modificacion < fechaHasta).ToList();

            ViewBag.FechaDesde = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = DateTime.Now.ToString("yyyy-MM-dd");
            return View(new ModeloBusquedaComprobateNoAutorizado { Comprobantes =documentos});
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Comprobantes(ModeloBusquedaComprobateNoAutorizado modeloBuscar)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var fechaHasta = modeloBuscar.BuscarFechaHasta.AddDays(1);
            var documentos = db.vw_comprobantes_no_autorizados.Where(x => x.id_emisor == idEmisor && x.fecha_modificacion >= modeloBuscar.BuscarFechaDesde && x.fecha_modificacion < fechaHasta).ToList();
            modeloBuscar.Comprobantes = documentos;
            ViewBag.FechaDesde = modeloBuscar.BuscarFechaDesde.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = modeloBuscar.BuscarFechaHasta.ToString("yyyy-MM-dd");
            return View(modeloBuscar);
        }

        [NonAction]
        private ModeloUsuarioSesion GetUsuarioLogeado()
        {
            var cookieName = FormsAuthentication.FormsCookieName; //Find cookie name
            var authCookie = HttpContext.Request.Cookies[cookieName]; //Get the cookie by it's name
            if (authCookie == null) return null;
            var ticket = FormsAuthentication.Decrypt(authCookie.Value); //Decrypt it
            var usuario = db.Usuario.Where(x => x.Nombre_usuario == ticket.Name).FirstOrDefault();


            var modelo = new ModeloUsuarioSesion
            {
                NombreUsuario = ticket.Name,
                IdEmisor = (usuario == null || usuario.Emisor == null) ? 0 : usuario.id_emisor.Value,
                IdRol = usuario.id_rol
            };
            return modelo;
        }
    }
}