using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Facturacion_Electronica.Controllers
{
    public class HomeController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        public ActionResult Index()
        {
            var avisos = db.Avisos.ToList().Select(x=>x.Message);
            ViewBag.Avisos = avisos;
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}