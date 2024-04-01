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
using Facturacion_Electronica.Models;
using Facturacion_Electronica.Business;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class CuentaCorreoController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        // GET: CuentaCorreo
        public ActionResult Index()
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var cuenta = db.Cuentas_correo.FirstOrDefault();
            if (cuenta == null)
            {
                return View( new ModeloCuentaCorreo());
            }

            return View(new ModeloCuentaCorreo {
                direccion = cuenta.direccion,
                clave = cuenta.clave,
                nombre_mostrar = cuenta.nombre_mostrar,
                puerto = cuenta.puerto,
                servidor = cuenta.servidor,
                ssl = cuenta.ssl
            });
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Index(ModeloCuentaCorreo modelo)
        {
            if (ModelState.IsValid)
            {
                var idEmisor = GetUsuarioLogeado().IdEmisor;
                var cuenta = db.Cuentas_correo.FirstOrDefault();
                if (cuenta == null)
                {
                    db.Cuentas_correo.Add(new Cuentas_correo { 
                        direccion = modelo.direccion,
                        clave = modelo.clave,
                        nombre_mostrar = modelo.nombre_mostrar,
                        puerto = modelo.puerto,
                        servidor = modelo.servidor,
                        ssl = modelo.ssl
                    });
                }
                else
                {
                    cuenta.direccion = modelo.direccion;
                    cuenta.clave = modelo.clave;
                    cuenta.nombre_mostrar = modelo.nombre_mostrar;
                    cuenta.puerto = modelo.puerto;
                    cuenta.servidor = modelo.servidor;
                    cuenta.ssl = modelo.ssl;
                }
                await db.SaveChangesAsync();
            }
            return View(modelo);
        }

        public ActionResult Details()
        {
            var cuenta = db.Cuentas_correo.FirstOrDefault();
            if (cuenta == null)
            {
                return View(new ModeloCuentaCorreo());
            }

            return View(new ModeloCuentaCorreo
            {
                direccion = cuenta.direccion,
                clave = cuenta.clave,
                nombre_mostrar = cuenta.nombre_mostrar,
                puerto = cuenta.puerto,
                servidor = cuenta.servidor,
                ssl = cuenta.ssl
            });
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
