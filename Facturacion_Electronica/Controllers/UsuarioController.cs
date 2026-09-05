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

            ViewBag.UsuariosActivos = db.Usuario.Count(x => x.Estado == EnumEstadoUsuario.ACTIVO).ToString();
            ViewBag.UsuariosInactivos = db.Usuario.Count(x => x.Estado == EnumEstadoUsuario.INACTIVO).ToString();

            Dictionary<int, string> estados = new Dictionary<int, string>
            {
                {  1, "ACTIVO" },
                {  2, "INACTIVO" }
            };

            ViewBag.estados = new SelectList(estados, "Key", "Value", 1);

            return View(new ModeloBuscarUsuario { BuscarPorEstado = 1, Usuarios = db.Usuario.Where(x => x.Estado == 1).OrderByDescending(x => x.id).Take(10).ToList() });
        }

        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarUsuario modelo)
        {

            ViewBag.UsuariosActivos = db.Usuario.Count(x => x.Estado == EnumEstadoUsuario.ACTIVO).ToString();
            ViewBag.UsuariosInactivos = db.Usuario.Count(x => x.Estado == EnumEstadoUsuario.INACTIVO).ToString();

            Dictionary<int, string> estados = new Dictionary<int, string>
            {
                {  1, "ACTIVO" },
                {  2, "INACTIVO" }
            };

            ViewBag.estados = new SelectList(estados, "Key", "Value", modelo.BuscarPorEstado);

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
                        return RedirectToAction("Login", "Login");
                    }
                    else
                    {
                        ModelState.AddModelError("Correo", "Correo ya registrado");
                    }
                }
                else
                {
                    ModelState.AddModelError("NombreUsuario", "Nombre de usuario ya registrado");
                }

            }
            nuevoNsuario.ReCapcha = ReCapchaBusiness.GenerateCaptcha();
            return View(nuevoNsuario);
        }

        // GET: Usuario/Edit/5
        [Authorize]
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

            Dictionary<int, string> estados = new Dictionary<int, string>
            {
                {  1, "ACTIVO" },
                {  2, "INACTIVO" }
            };

            ViewBag.estados = new SelectList(estados, "Key", "Value", usuario.Estado);
            ViewBag.Id_Categoria = new SelectList(db.Categoria_usuarios, "id", "Descripcion", usuario.Id_Categoria);
            return View(usuario);
        }

        // POST: Usuario/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit(Usuario model)
        {
            Dictionary<int, string> estados = new Dictionary<int, string>
            {
                {  1, "ACTIVO" },
                {  2, "INACTIVO" }
            };

            ViewBag.estados = new SelectList(estados, "Key", "Value", model.Estado);
            ViewBag.Id_Categoria = new SelectList(db.Categoria_usuarios, "id", "Descripcion", model.Id_Categoria);

            Usuario usuario = await db.Usuario.FindAsync(model.id);
            if (usuario == null)
            {
                return HttpNotFound();
            }

            if (ModelState.IsValid)
            {
                usuario.Fecha_modificacion = DateTime.Now;
                usuario.Notificaciones = model.Notificaciones;
                usuario.Estado = model.Estado;
                usuario.Id_Categoria = model.Id_Categoria;

                // Actulizar estado a los emisores
                var emisores = db.Emisor.Where(x => x.id == usuario.id_emisor).ToList();
                emisores.ForEach(x => x.estado = model.Estado);

                await db.SaveChangesAsync();

                ViewBag.Mensaje = "Actualizado Correctamente";

                return View(usuario);
            }

            return View(model);
        }

        [Authorize]
        [HttpPost]
        public ActionResult Delete(int id)
        {
            var usuario = db.Usuario.Find(id);

            if (usuario == null)
            {
                return Json(new { eliminado = false, mensaje = "Usuario no existe" });
            }

            // Comprobar si posee facturas acturizadas
            if (db.Factura.Any(x => x.id_emisor == usuario.id_emisor && x.Estado == EnumEstadosComprobante.AUTORIZADO))
            {
                return Json(new { eliminado = false, mensaje = "Usuario posee facturas autorizadas" });
            }

            usuario.Estado = 3;
            usuario.Fecha_modificacion = DateTime.Now;
            usuario.Nombre_usuario = ".";
            usuario.Nombre = ".";
            usuario.Correo = ".";

            // Actulizar estado a los emisores
            var emisores = db.Emisor.Where(x => x.id == usuario.id_emisor).ToList();
            emisores.ForEach(x => x.estado = 3);
            emisores.ForEach(x => x.Ruc = "0");

            db.SaveChanges();

            return Json(new { eliminado = true, mensaje = "" });
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult> ObtenerDiasRestantes()
        {
            var usuario = GetUsuarioLogeado();
            var emisor = await db.Emisor.FirstOrDefaultAsync(x => x.id == usuario.IdEmisor);
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
