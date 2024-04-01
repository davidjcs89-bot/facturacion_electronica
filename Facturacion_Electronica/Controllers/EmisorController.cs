
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Business;
using System.Web.Hosting;
using System.IO;
using System.Web.Security;
using Facturacion_Electronica.Models.Usuario;
using System.Collections.Generic;
using System;
using System.Diagnostics;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class EmisorController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        public static string directorioLogo => "~/Logos/";
        public static string directorioFirmas => "~/Firmas/";

        public ActionResult Index()
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(new ModeloBuscarEmisor { Emisores = new List<Emisor>() });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarEmisor modelo)
        {
            var productos = emisorBusiness.BuscarEmisores(modelo);
            modelo.Emisores = productos;
            return View(modelo);
        }

        public ActionResult Configurar(int id)
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var modelo = new ModeloEmisorConfigAdmin();
            var emisor = emisorBusiness.BuscarEmisor(id);
            if (emisor == null)
            {
                return View(modelo);
            }
            modelo.Emisor = emisor;
            var periodoHabilitado = db.Emisor_habilitacion.FirstOrDefault(x => x.id_emisor == id);
            if (periodoHabilitado == null)
            {
                modelo.Emisor = emisor;
                modelo.FechaDesde = System.DateTime.Now;
                modelo.FechaHasta = System.DateTime.Now;
            }
            else
            {
                modelo.FechaDesde = periodoHabilitado.fecha_desde;
                modelo.FechaHasta = periodoHabilitado.fecha_hasta;
            }

            ViewBag.FechaDesde = modelo.FechaDesde.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = modelo.FechaHasta.ToString("yyyy-MM-dd");
            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente", emisor.TipoAmbiente);

            return View(modelo);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Configurar(ModeloEmisorConfigAdmin modelo)
        {
            var usuario = GetUsuarioLogeado();
            if (usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA)
            {
                ViewBag.MensajeError = "Acceso Denegado";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            ViewBag.FechaDesde = modelo.FechaDesde.ToString("yyyy-MM-dd");
            ViewBag.FechaHasta = modelo.FechaHasta.ToString("yyyy-MM-dd");
            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente", modelo.Emisor.TipoAmbiente);

            var emisor = db.Emisor.FirstOrDefault(x => x.id == modelo.Emisor.Id);
            if (emisor == null)
            {
                return RedirectToAction("Index");
            }

            var periodoHabilitado = db.Emisor_habilitacion.FirstOrDefault(x => x.id_emisor == emisor.id);
            if (periodoHabilitado == null)
            {
                db.Emisor_habilitacion.Add(new Emisor_habilitacion
                {
                    id_emisor = emisor.id,
                    fecha_desde = modelo.FechaDesde,
                    fecha_hasta = modelo.FechaHasta
                });
            }
            else
            {
                periodoHabilitado.fecha_desde = modelo.FechaDesde;
                periodoHabilitado.fecha_hasta = modelo.FechaHasta;
            }
            db.SaveChanges();
            return RedirectToAction("Configurar", new { emisor.id });
        }


        // GET: Emisor/Create
        public ActionResult Create()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor > 0)
            {
                return RedirectToAction("Edit");
            }
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024), "Id", "Descripcion", 2);
            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente");
            return View();
        }

        // POST: Emisor/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloEmisor emisor, HttpPostedFileBase logo, HttpPostedFileBase firma)
        {

            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente", emisor.TipoAmbiente);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024), "Id", "Descripcion", emisor.IdImpuestoIva);

            if (ModelState.IsValid)
            {
                if (emisorBusiness.ValidarCedulaRuc(emisor.Ruc))
                {
                    if (db.Emisor.Where(x => x.Ruc == emisor.Ruc).FirstOrDefault() == null)
                    {
                        if (logo == null || logo.ContentType == "image/png" || logo.ContentType == "image/jpg" || logo.ContentType == "image/jpeg") //Only png or jpg image
                        {
                            if (firma != null)
                            {
                                if (firma.ContentType == "application/x-pkcs12") //Only p12file
                                {
                                    emisor.Firma = HostingEnvironment.MapPath(directorioFirmas) + $"{emisor.Ruc}_" + Path.GetFileName(firma.FileName);
                                    firma.SaveAs(emisor.Firma);
                                }
                                else
                                {
                                    ModelState.AddModelError("firma", "El archivo de firma electrónica solo en formato p12");
                                    return View(emisor);
                                }
                            }

                            if (logo != null)
                            {
                                emisor.Logo = HostingEnvironment.MapPath(directorioLogo) + $"{emisor.Ruc}_" + Path.GetFileName(logo.FileName);
                                logo.SaveAs(emisor.Logo);
                            }

                            emisorBusiness.GuardarEmisor(emisor, GetUsuarioLogeado().NombreUsuario);
                            TempData["accion"] = "crear";
                            return RedirectToAction("Edit");


                        }
                        else
                        {
                            ModelState.AddModelError("logo", "El archivo de logo solo en formato jpg o png");
                        }

                    }
                    else
                    {
                        ModelState.AddModelError("Ruc", "Ruc ya existente");
                    }

                }
                else
                {
                    ModelState.AddModelError("Ruc", "Ruc invalido");
                }

            }

            return View(emisor);
        }

        // GET: Emisor/Edit/5
        public ActionResult Edit()
        {
            int id = GetUsuarioLogeado().IdEmisor;

            if (id == 0)
            {
                RedirectToAction("Create");
            }

            var modeloEmisor = emisorBusiness.BuscarEmisor(id);

            if (modeloEmisor == null)
            {
                RedirectToAction("Create");
            }
            if (TempData["accion"] != null)
            {
                if (TempData["accion"].ToString() == "crear")
                {
                    ViewBag.Mensaje = "Guardado Correctamente";
                }
                if (TempData["accion"].ToString() == "actualizar")
                {
                    ViewBag.Mensaje = "Actualizado Correctamente";
                }
            }
            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente", modeloEmisor.TipoAmbiente);
            //AQUI SE REFLEJA EL LISTADO DE PORCENTAJES DEL IVA EN LA PANTALLA DE EDICION DE EMISOR
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024), "Id", "Descripcion", modeloEmisor.IdImpuestoIva);

            return View(modeloEmisor);
        }

        // POST: Emisor/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Exclude = "ContrasenaFirma")] ModeloEmisor emisor, HttpPostedFileBase logo, HttpPostedFileBase firma)
        {
            if (ModelState.IsValid)
            {
                if (logo == null || logo.ContentType == "image/png" || logo.ContentType == "image/jpg" || logo.ContentType == "image/jpeg") //Only png or jpg image
                {
                    if (firma == null || firma.ContentType == "application/x-pkcs12") //Only p12file
                    {
                        if (logo != null)
                        {
                            emisor.Logo = HostingEnvironment.MapPath(directorioLogo) + $"{emisor.Ruc}_" + Path.GetFileName(logo.FileName);
                            logo.SaveAs(emisor.Logo);
                        }

                        if (firma != null)
                        {
                            emisor.Firma = HostingEnvironment.MapPath(directorioFirmas) + $"{emisor.Ruc}_" + Path.GetFileName(firma.FileName);
                            firma.SaveAs(emisor.Firma);
                        }
                        emisorBusiness.ActualizarEmisor(emisor);
                        TempData["accion"] = "actualizar";
                        return RedirectToAction("Edit");
                    }
                    else
                    {
                        ModelState.AddModelError("firma", "El archivo de firma electrónica solo en formato p12");
                    }
                }

            }
            ViewBag.Tipo_ambiente = new SelectList(db.Tipo_ambientes, "id", "Descripcion_ambiente", emisor.TipoAmbiente);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024), "Id", "Descripcion", emisor.IdImpuestoIva);

            return View(emisor);
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
