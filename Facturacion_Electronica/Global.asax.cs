using ElectronicBilling.Business.ScheduleTask;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace Facturacion_Electronica
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);

            TaskManager.Instance.Initialize();
            TaskManager.Instance.Start();

            TaskManagerNotas.Instance.Initialize();
            TaskManagerNotas.Instance.Start();

        }
    }
}
