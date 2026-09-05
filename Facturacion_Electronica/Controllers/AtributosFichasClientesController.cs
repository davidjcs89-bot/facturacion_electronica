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
using Facturacion_Electronica.Models.Usuario;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]

    public class AtributosFichasClientesController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        // GET: AtributosFichasClientes
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            var atributos_fichas_clientes = db.Atributos_fichas_clientes.Where(x=>x.id_emisor == idEmisor);
            return View(atributos_fichas_clientes.ToList());
        }

        // GET: AtributosFichasClientes/Details/5
        public ActionResult Details(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Atributos_fichas_clientes atributos_fichas_clientes = db.Atributos_fichas_clientes.Find(id);
            if (atributos_fichas_clientes == null)
            {
                return HttpNotFound();
            }
            return View(atributos_fichas_clientes);
        }

        // GET: AtributosFichasClientes/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: AtributosFichasClientes/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(Atributos_fichas_clientes modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            if (ModelState.IsValid)
            {
                if (string.IsNullOrWhiteSpace(modelo.nombre))
                {
                    ModelState.AddModelError("nombre","Ingrese un nombre del atributo");
                    return View(modelo);
                }

                modelo.id_emisor = idEmisor;
                db.Atributos_fichas_clientes.Add(modelo);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            return View(modelo);
        }

        // GET: AtributosFichasClientes/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }

            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var modelo = db.Atributos_fichas_clientes.FirstOrDefault(x=>x.id == id.Value && x.id_emisor == idEmisor);
            if (modelo == null)
            {
                return HttpNotFound();
            }

            return View(modelo);
        }

        // POST: AtributosFichasClientes/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que quiere enlazarse. Para obtener 
        // más detalles, vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(Atributos_fichas_clientes modelo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;

            var atributo = db.Atributos_fichas_clientes.FirstOrDefault(x => x.id == modelo.id && x.id_emisor == idEmisor);

            if (ModelState.IsValid)
            {
                if (string.IsNullOrWhiteSpace(modelo.nombre))
                {
                    ModelState.AddModelError("nombre", "Ingrese un nombre del atributo");
                    return View(modelo);
                }

                atributo.nombre = modelo.nombre;

                db.SaveChanges();
                return RedirectToAction("Index");
            }

            return View(modelo);
        }

        // GET: AtributosFichasClientes/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Atributos_fichas_clientes atributos_fichas_clientes = db.Atributos_fichas_clientes.Find(id);
            if (atributos_fichas_clientes == null)
            {
                return HttpNotFound();
            }
            return View(atributos_fichas_clientes);
        }

        // POST: AtributosFichasClientes/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            Atributos_fichas_clientes atributos_fichas_clientes = db.Atributos_fichas_clientes.Find(id);
            db.Atributos_fichas_clientes.Remove(atributos_fichas_clientes);
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
