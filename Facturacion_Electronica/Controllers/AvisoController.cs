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
using Facturacion_Electronica.Models.Usuario;
using System.Web.Security;
using Facturacion_Electronica.Business;

namespace Facturacion_Electronica.Controllers
{
    public class AvisoController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        // GET: Aviso
        public async Task<ActionResult> Index()
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(await db.Avisos.ToListAsync());
        }


        // GET: Aviso/Create
        public ActionResult Create()
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View();
        }

        // POST: Aviso/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create(Avisos avisos)
        {
            if (ModelState.IsValid)
            {
                if (!string.IsNullOrEmpty(avisos.Message))
                {
                    avisos.CreateOn = DateTime.Now;
                    db.Avisos.Add(avisos);
                    await db.SaveChangesAsync();
                    return RedirectToAction("Index");
                }
                ModelState.AddModelError("message","El texto del aviso es requerido");
            }

            return View(avisos);
        }

        // GET: Aviso/Edit/5
        public async Task<ActionResult> Edit(int? id)
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Avisos avisos = await db.Avisos.FindAsync(id);
            if (avisos == null)
            {
                return HttpNotFound();
            }
            return View(avisos);
        }

        // POST: Aviso/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit( Avisos avisos)
        {
            if (ModelState.IsValid)
            {
                if (!string.IsNullOrEmpty(avisos.Message))
                {
                    db.Entry(avisos).State = EntityState.Modified;
                    db.Entry(avisos).Property("CreateOn").IsModified = false;

                    await db.SaveChangesAsync();
                    return RedirectToAction("Index");
                }
                ModelState.AddModelError("message", "El texto del aviso es requerido");
            }
            return View(avisos);
        }

        // GET: Aviso/Delete/5
        public async Task<ActionResult> Delete(int? id)
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Avisos avisos = await db.Avisos.FindAsync(id);
            if (avisos == null)
            {
                return HttpNotFound();
            }
            return View(avisos);
        }

        // POST: Aviso/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(int id)
        {
            Avisos avisos = await db.Avisos.FindAsync(id);
            db.Avisos.Remove(avisos);
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
