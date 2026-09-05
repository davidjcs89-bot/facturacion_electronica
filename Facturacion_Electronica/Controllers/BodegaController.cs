using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using Facturacion_Electronica;
using Facturacion_Electronica.Models;
using Facturacion_Electronica.Models.Usuario;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class BodegaController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        // GET: Bodega
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var bodegas = db.Bodegas.Where(b => b.id_emisor == idEmisor);
            return View(bodegas.ToList());
        }

        // GET: Bodega/Create
        public ActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloBodega modelo)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;

                //Validar duplicidad de codigo
                if (db.Bodegas.Any(x=>x.id_emisor == idEmisor && x.codigo.Equals(modelo.Codigo, StringComparison.OrdinalIgnoreCase)))
                {
                    ModelState.AddModelError("Codigo", "Ya existe una bodega con este código");
                    return View(modelo);
                }

                db.Bodegas.Add(new Bodegas { activa = true, codigo = modelo.Codigo, nombre = modelo.Nombre, id_emisor = idEmisor });
                db.SaveChanges();

                return Json(new { bodegaCreada = true });
            }

            return View(modelo);
        }

        // GET: Bodega/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var bodegas = db.Bodegas.FirstOrDefault(x=>x.id_emisor == idEmisor && x.id == id.Value);

            if (bodegas == null)
            {
                return HttpNotFound();
            }

            return View(new ModeloBodega { Id = bodegas.id, Activo = bodegas.activa, Codigo = bodegas.codigo, Nombre = bodegas.nombre });
        }

        // POST: Bodega/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(ModeloBodega modelo)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;

                //Validar duplicidad de codigo
                if (db.Bodegas.Any(x => x.id_emisor == idEmisor && x.id != modelo.Id && x.codigo.Equals(modelo.Codigo, StringComparison.OrdinalIgnoreCase)))
                {
                    ModelState.AddModelError("Codigo", "Ya existe una bodega con este código");
                    return View(modelo);
                }

                var bodegas = db.Bodegas.FirstOrDefault(x => x.id_emisor == idEmisor && x.id == modelo.Id);

                if (bodegas == null)
                {
                    ModelState.AddModelError("Codigo", "Bodega no existe");
                    return View(modelo);
                }

                bodegas.codigo = modelo.Codigo;
                bodegas.nombre = modelo.Nombre;
                bodegas.activa = modelo.Activo;

                db.SaveChanges();
                return Json(new { bodegaModificada = true });
            }

            return View(modelo);
        }

        public ActionResult Existencias()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var bodegas = db.Bodegas.Where(b => b.id_emisor == idEmisor && b.activa).ToList();

            ViewBag.bodegas = new SelectList(bodegas, "id", "nombre");

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Existencias(Bodegas modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var bodegas = db.Bodegas.Where(b => b.id_emisor == idEmisor && b.activa).ToList();

            ViewBag.bodegas = new SelectList(bodegas, "id", "nombre", modelo.id);

            var bodega = db.Bodegas.FirstOrDefault(x=>x.id == modelo.id && x.id_emisor == idEmisor);

            return View(bodega);
        }

        // GET: Bodega/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Bodegas bodegas = db.Bodegas.Find(id);
            if (bodegas == null)
            {
                return HttpNotFound();
            }
            return View(bodegas);
        }

        // POST: Bodega/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            Bodegas bodegas = db.Bodegas.Find(id);
            db.Bodegas.Remove(bodegas);
            db.SaveChanges();
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
