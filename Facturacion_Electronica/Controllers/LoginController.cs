using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    public class LoginController : Controller
    {
        UsuarioBusiness usuarioBusiness = new UsuarioBusiness();

        // GET: Login
        public ActionResult Login()
        {
            if (TempData["MensajeActualizacion"] != null)
            {
                ViewBag.MensajeActualizacion = TempData["MensajeActualizacion"];
            }
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(ModeloLogin modelo)
        {
            if (ModelState.IsValid)
            {
                var resultadologin = usuarioBusiness.validarCredenciales(modelo);
                if (resultadologin)
                {
                    if (usuarioBusiness.ValidarEmisorHabilitado(modelo))
                    {
                        HostingEnvironment.QueueBackgroundWorkItem(
                            token => usuarioBusiness.EnviarEmailInicioSesion(modelo)
                        );

                        // Si no tiene un emisor creado, redigir a crear emisor
                        if (!usuarioBusiness.ValidarEmisorCreado(modelo) && !usuarioBusiness.validarEsAdmin(modelo))
                        {
                            return RedirectToAction("Create", "Emisor");
                        }

                        return RedirectToAction("Index", "Admin");
                    }
                    else
                    {
                        ModelState.AddModelError("Clave", "Usuario Deshabilitado");
                    }

                }
                else { ModelState.AddModelError("Clave", "Error en Nombre de Usuario o Clave"); }
            }
            return View(modelo);

        }

        [Authorize]
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();
            return RedirectToAction("Index", "Home");
        }

        public ActionResult RecuperarClave()
        {
            return View();
        }

        public ActionResult RecuperarUsuario()
        {
            return View();
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult RecuperarUsuario(RecuperarClave modelo)
        {
            if (ModelState.IsValid)
            {
                usuarioBusiness.RecuperarUsuario(modelo);
                ViewBag.MensajeRecuperacion = "Se ha enviado un el nombre de usuario a su correo";
                return RedirectToAction("Login");
            }
            return View(modelo);
        }

        public ActionResult ActualizarClave()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult RecuperarClave(RecuperarClave modelo)
        {
            if (ModelState.IsValid)
            {
                usuarioBusiness.RecuperarClave(modelo);
                ViewBag.MensajeRecuperacion = "Se ha enviado un codigo a su correo para resetear la clave";
                return PartialView("ActualizarClave");
            }
            return View(modelo);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ActualizarClave(ActualizarClave modelo)
        {
            if (ModelState.IsValid)
            {
                if (modelo.Clave.Equals(modelo.ClaveComfirmada))
                {
                    var respuesta = usuarioBusiness.ActualizarClave(modelo);
                    if (respuesta == null)
                    {
                        TempData["MensajeActualizacion"] = "Su clave ha sido actualizada correctamente";
                        return RedirectToAction("Login");
                    }
                    ModelState.AddModelError("Codigo", respuesta);
                }
                else
                {
                    ModelState.AddModelError("Clave", "Las contraseñas no coinciden");
                    ModelState.AddModelError("ClaveComfirmada", "Las contraseñas no coinciden");
                }

            }
            return View(modelo);
        }
    }
}