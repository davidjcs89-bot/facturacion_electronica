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
using Facturacion_Electronica.Models.Transportista;
using Facturacion_Electronica.Models.Usuario;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{

    [Authorize]
    public class TransportistaController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private TransportistaBusiness transportistaBusiness = new TransportistaBusiness();

        // GET: Transportista
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View(new ModeloBuscarTransportista { Transportistas = new List<Transportistas>()});
        }

        [HttpPost]
        public ActionResult Index(ModeloBuscarTransportista modeloBuscarTransportista)
        {
            modeloBuscarTransportista.Transportistas = transportistaBusiness.BuscarTransportistas(modeloBuscarTransportista, GetUsuarioLogeado().IdEmisor);
            return View(modeloBuscarTransportista);
        }

        // GET: Transportista/Create
        public ActionResult Create(int origen)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion");
            return View(new ModeloTransportista { Origen = origen});
        }

        // POST: Transportista/Create
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloTransportista modeloTransportista)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            var idEmsior = GetUsuarioLogeado().IdEmisor;
            ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloTransportista.TipoidentificacionId);
            if (ModelState.IsValid)
            {
                if (modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.CEDULA || modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.RUC)
                {
                    if (!emisorBusiness.ValidarCedulaRuc(modeloTransportista.NumerdeIdentificacion, modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.RUC))
                    {
                        ModelState.AddModelError("TipoidentificacionId", "Número de Identificación incorrecto");
                        return View(modeloTransportista);
                    }
                }

                if (db.Transportistas.Any(x => x.Id_emisor == idEmsior && x.Numero_identificacion == modeloTransportista.NumerdeIdentificacion))
                {
                    ModelState.AddModelError("NumerdeIdentificacion", "Ya existe un transportista con este Número de Identificación");
                    return View(modeloTransportista);
                }

                transportistaBusiness.CrearNuevoTransportista(modeloTransportista, idEmsior);
                return Json(new { transportistaCreado = true, identificacion = modeloTransportista.NumerdeIdentificacion, origen = modeloTransportista.Origen });
            }

            
            return View(modeloTransportista);
        }

        // GET: Transportista/Edit/5
        public async Task<ActionResult> Edit(int id)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            var idEmsior = GetUsuarioLogeado().IdEmisor;
            Transportistas transportistas = await db.Transportistas.FindAsync(id);
            if (transportistas == null || transportistas.Id_emisor != idEmsior)
            {
                return HttpNotFound();
            }
            var modeloTransportista = transportistaBusiness.BuscarTransportista(id,idEmsior);
            ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloTransportista.TipoidentificacionId);
            return View(modeloTransportista);
        }

        // POST: Transportista/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(ModeloTransportista modeloTransportista)
        {
            if (!HttpContext.Request.IsAjaxRequest()) return null;
            var idEmsior = GetUsuarioLogeado().IdEmisor;
            ViewBag.TipoIdentificacion = new SelectList(db.Tipo_Identificacion.Where(x => x.id != EnumTipoIdentificacion.CONSUMIDOR_FINAL), "id", "Descripcion", modeloTransportista.TipoidentificacionId);
            if (ModelState.IsValid)
            {
                if (modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.CEDULA || modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.RUC)
                {
                    if (!emisorBusiness.ValidarCedulaRuc(modeloTransportista.NumerdeIdentificacion, modeloTransportista.TipoidentificacionId == EnumTipoIdentificacion.RUC))
                    {
                        ModelState.AddModelError("TipoidentificacionId", "Número de Identificación incorrecto");
                        return View(modeloTransportista);
                    }
                }

                if (db.Transportistas.Any(x => x.Id_emisor == idEmsior && x.Numero_identificacion == modeloTransportista.NumerdeIdentificacion && x.id != modeloTransportista.Id))
                {
                    ModelState.AddModelError("NumerdeIdentificacion", "Ya existe un transportista con este Número de Identificación");
                    return View(modeloTransportista);
                }

                transportistaBusiness.ActualizarTransportista(modeloTransportista);
                return Json(new { transportistaActualizado = true, identificacion = modeloTransportista.NumerdeIdentificacion });
            }


            return View(modeloTransportista);
        }

        // GET: Transportista/Delete/5
        public async Task<ActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Transportistas transportistas = await db.Transportistas.FindAsync(id);
            if (transportistas == null)
            {
                return HttpNotFound();
            }
            return View(transportistas);
        }

        // POST: Transportista/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(int id)
        {
            Transportistas transportistas = await db.Transportistas.FindAsync(id);
            db.Transportistas.Remove(transportistas);
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
