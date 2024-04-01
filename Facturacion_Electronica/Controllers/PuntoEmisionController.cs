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
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Secuencias;
using Facturacion_Electronica.Models.Usuario;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class PuntoEmisionController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private SecuenciasBusiness secucenciasBusiness = new SecuenciasBusiness();

        // GET: PuntoEmision
        public async Task<ActionResult> Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            return View(await db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor).ToListAsync());
        }

        // GET: PuntoEmision/Create
        public ActionResult Create()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(secucenciasBusiness.GenerarModeloNuevoPuntoEmision());
        }

        // POST: PuntoEmision/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloSecuenciacomprobante modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (ModelState.IsValid)
            {
                if(db.Puntos_emisior.Where(x=>x.Id_emisor == idEmisor && x.Numero_establecimiento == modelo.NumeroComprobante && x.Numero_emision == modelo.NumeroPuntoEmision).FirstOrDefault() == null)
                {
                    secucenciasBusiness.CrearSecuenciasPuntoEmision(modelo, GetUsuarioLogeado().IdEmisor);
                    return RedirectToAction("Index");
                }
                ModelState.AddModelError("NumeroComprobante", "Ya existe un punto de emision con estos numeros");
                ModelState.AddModelError("NumeroPuntoEmision", "Ya existe un punto de emision con estos numeros");
            }

            return View(modelo);
        }

        // GET: PuntoEmision/Edit/5
        public async Task<ActionResult> Edit(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            Puntos_emisior puntos_emisior = await db.Puntos_emisior.FindAsync(id);
            if (puntos_emisior == null || puntos_emisior.Id_emisor != idEmisor)
            {
                return RedirectToAction("Ïndex");
            }
            return View(secucenciasBusiness.ObtenerModeloPuntoEmision(id));
        }

        // POST: PuntoEmision/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(ModeloSecuenciacomprobante modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (ModelState.IsValid)
            {
                if (db.Puntos_emisior.Where(x => x.Id_emisor == idEmisor && x.Numero_establecimiento == modelo.NumeroComprobante && x.Numero_emision == modelo.NumeroPuntoEmision && x.id != modelo.Id).FirstOrDefault() == null)
                {
                    secucenciasBusiness.ActualizarSecuenciasPuntoEmision(modelo, GetUsuarioLogeado().IdEmisor);
                    return RedirectToAction("Index");
                }
                ModelState.AddModelError("NumeroComprobante", "Ya existe un punto de emision con estos numeros");
                ModelState.AddModelError("NumeroPuntoEmision", "Ya existe un punto de emision con estos numeros");
            }

            return View(modelo);
        }

        // GET: PuntoEmision/Delete/5
        public async Task<ActionResult> Delete(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            Puntos_emisior puntos_emisior = await db.Puntos_emisior.FindAsync(id);
            if (puntos_emisior == null || puntos_emisior.Id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }
            return View(puntos_emisior);
        }

        // POST: PuntoEmision/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(int id)
        {
            Puntos_emisior puntos_emisior = await db.Puntos_emisior.FindAsync(id);
            foreach(var secuencia in puntos_emisior.Secuencias.ToList())
            {
                db.Secuencias.Remove(secuencia);
            }

            db.Puntos_emisior.Remove(puntos_emisior);
            await db.SaveChangesAsync();
            return RedirectToAction("Index");
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
                IdEmisor = (emisor == null || emisor.Emisor == null) ? 0 : emisor.id_emisor.Value
            };
            return modelo;
        }
    }
}
