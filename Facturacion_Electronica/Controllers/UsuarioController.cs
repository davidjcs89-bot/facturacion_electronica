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
using Facturacion_Electronica.Business;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    public class UsuarioController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private UsuarioBusiness usuarioBusiness = new UsuarioBusiness();


        [Authorize]
        public ActionResult Index()
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(new ModeloBuscarUsuario { Usuarios = new List<Usuario>() });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarUsuario modelo)
        {
            var productos = usuarioBusiness.BuscarUsuarios(modelo);
            modelo.Usuarios = productos;
            return View(modelo);
        }

        // GET: Usuario/Create
        public ActionResult Create()
        {
            var modeloNuevoUsuario = new ModeloNuevoUsuario();
            modeloNuevoUsuario.Notificaciones = true;
            modeloNuevoUsuario.ReCapcha = ReCapchaBusiness.GenerateCaptcha();
            return View(modeloNuevoUsuario);
        }

        // POST: Usuario/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [CaptchaValidator]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloNuevoUsuario nuevoNsuario, bool captchaValid)
        {
            if (!captchaValid)
            {
                ModelState.AddModelError("", "Capcha Incorrecta");
                nuevoNsuario.ReCapcha = ReCapchaBusiness.GenerateCaptcha();
                return View(nuevoNsuario);
            }

            if (ModelState.IsValid)
            {
                if (db.Usuario.Where(x => x.Nombre_usuario == nuevoNsuario.NombreUsuario).FirstOrDefault() == null)
                {
                    if (db.Usuario.Where(x => x.Correo == nuevoNsuario.Correo).FirstOrDefault() == null)
                    {
                        usuarioBusiness.registrarUsuario(nuevoNsuario);
                        TempData["MensajeActualizacion"] = "Usuario creado correctamente";
                        return RedirectToAction("Login","Login");
                    }
                    else
                    {
                        ModelState.AddModelError("Correo", "Correo ya registrado");
                    }
                }
                else
                {
                    ModelState.AddModelError("NombreUsuario","Nombre de usuario ya registrado");
                }

            }
            nuevoNsuario.ReCapcha = ReCapchaBusiness.GenerateCaptcha();
            return View(nuevoNsuario);
        }



        // GET: Usuario/Edit/5
        public async Task<ActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Usuario usuario = await db.Usuario.FindAsync(id);
            if (usuario == null)
            {
                return HttpNotFound();
            }
            ViewBag.Id_Categoria = new SelectList(db.Categoria_usuarios, "id", "Descripcion", usuario.Id_Categoria);
            return View(usuario);
        }

        // POST: Usuario/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "id,Nombre_usuario,Clave,Nombre,Apellido,Correo,Numero_telefono,Direccion_Dom_cuenta,Ciudad,Provincia,Fecha_modificacion,Fecha_creacion,Estado,Id_Categoria,Notificaciones")] Usuario usuario)
        {
            if (ModelState.IsValid)
            {
                db.Entry(usuario).State = EntityState.Modified;
                await db.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            ViewBag.Id_Categoria = new SelectList(db.Categoria_usuarios, "id", "Descripcion", usuario.Id_Categoria);
            return View(usuario);
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult> ObtenerDiasRestantes()
        {
            var usuario = GetUsuarioLogeado();
            var emisor = await db.Emisor.FirstOrDefaultAsync(x=>x.id == usuario.IdEmisor);
            if (emisor == null || emisor.Emisor_habilitacion == null)
            {
                return Json(new { dias = 0 }, JsonRequestBehavior.AllowGet);
            }
            var dias = emisor.Emisor_habilitacion.fecha_hasta - DateTime.Now;
            if (dias.Days < 0)
            {
                return Json(new { dias = 0 }, JsonRequestBehavior.AllowGet);
            }
            return Json(new { dias = dias.Days }, JsonRequestBehavior.AllowGet);
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
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
