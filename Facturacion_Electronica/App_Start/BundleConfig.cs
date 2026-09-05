using System.Web;
using System.Web.Optimization;

namespace Facturacion_Electronica
{
    public class BundleConfig
    {
        // Para obtener más información sobre las uniones, visite https://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.validate*"));

            // Utilice la versión de desarrollo de Modernizr para desarrollar y obtener información. De este modo, estará
            // para la producción, use la herramienta de compilación disponible en https://modernizr.com para seleccionar solo las pruebas que necesite.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js"));

            bundles.Add(new ScriptBundle("~/bundles/UsuarioJs").Include(
                    "~/Scripts/Usuario/Usuario.js"));

            bundles.Add(new StyleBundle("~/bundles/UsuarioCss").Include(
                    "~/Content/Usuario.css"));

            bundles.Add(new StyleBundle("~/bundles/SweetAlertCss").Include(
                "~/Scripts/sweetalert/dist/sweetalert.css"));

            bundles.Add(new StyleBundle("~/bundles/SweetAlert").Include(
                "~/Scripts/sweetalert/dist/sweetalert.min.js"
            ));

            bundles.Add(new ScriptBundle("~/bundles/moment").Include(
              "~/Scripts/moment/min/moment-with-locales.min.js"
            ));

            bundles.Add(new ScriptBundle("~/bundles/datetimePicker").Include(
              "~/Scripts/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js",
              "~/Scripts/datePicker.js"
            ));

            bundles.Add(new StyleBundle("~/bundles/datetimePickerCss").Include(
                "~/Scripts/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css"
            ));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/site.css"));
            bundles.Add(new StyleBundle("~/bundles/fontawesome").Include(
                    "~/Content/fonts/fontawesome/css/font-awesome.min.css", new CssRewriteUrlTransform()
            ));

            bundles.Add(new ScriptBundle("~/bundles/LiquidacionJs").Include(
            "~/Scripts/LiquidacionCompra/LiquidacionCompra.js"));

            bundles.Add(new ScriptBundle("~/bundles/FacturaJs").Include(
            "~/Scripts/Factura/Factura.js"));

            bundles.Add(new ScriptBundle("~/bundles/PedidoJs").Include(
            "~/Scripts/Pedido/Pedido.js"));

            bundles.Add(new ScriptBundle("~/bundles/ProformaJs").Include(
            "~/Scripts/Proforma/Proforma.js"));

            bundles.Add(new ScriptBundle("~/bundles/ClienteJs").Include(
            "~/Scripts/Cliente/Cliente.js"));

            bundles.Add(new ScriptBundle("~/bundles/BodegaJs").Include(
            "~/Scripts/Bodega/Bodega.js"));

            bundles.Add(new ScriptBundle("~/bundles/TransportistaJs").Include(
            "~/Scripts/Transportista/Transportista.js"));

            bundles.Add(new ScriptBundle("~/bundles/UsuarioJs").Include(
            "~/Scripts/Usuario/Usuario.js"));

            bundles.Add(new ScriptBundle("~/bundles/EmisorJs").Include(
            "~/Scripts/Emisor/Emisor.js"));

            bundles.Add(new ScriptBundle("~/bundles/RetencionJs").Include(
            "~/Scripts/Retencion/Retencion.js"));

            bundles.Add(new ScriptBundle("~/bundles/NotaCreditoJS").Include(
            "~/Scripts/NotaCredito/NotaCredito.js"));

            bundles.Add(new ScriptBundle("~/bundles/NotaDebitoJS").Include(
            "~/Scripts/NotaDebito/NotaDebito.js"));

            bundles.Add(new ScriptBundle("~/bundles/GuiaRemisionJS").Include(
            "~/Scripts/GuiaRemision/GuiaRemision.js"));

            bundles.Add(new ScriptBundle("~/bundles/ImpresionJS").Include(
            "~/Scripts/Impresion/Impresion.js"));

            bundles.Add(new ScriptBundle("~/bundles/ComprobantesJS").Include(
            "~/Scripts/Comprobantes/Comprobantes.js"));

            bundles.Add(new ScriptBundle("~/bundles/IngresoBodegasJS").Include(
            "~/Scripts/IngresoExistencias/IngresoExistencias.js"));

            bundles.Add(new ScriptBundle("~/bundles/TransferenciaJs").Include(
            "~/Scripts/Transferencia/Transferencia.js"));

            bundles.Add(new ScriptBundle("~/bundles/ProductoJs").Include(
            "~/Scripts/Producto/Producto.js"));

            bundles.Add(new ScriptBundle("~/bundles/GeneralJS").Include(
            "~/Scripts/General/AccionesGenerales.js"));

            //Styles
            bundles.Add(new StyleBundle("~/bundles/LoginCSS").Include(
            "~/Content/Login/LoginStyles.css"));

            bundles.Add(new StyleBundle("~/bundles/HomeCSS").Include(
            "~/Content/Home/HomeStyles.css"));

            bundles.Add(new StyleBundle("~/bundles/ProformaCSS").Include(
            "~/Content/Proforma/ProformaStyles.css"));

            bundles.Add(new StyleBundle("~/bundles/ProductosCSS").Include(
            "~/Content/Productos/ProductosStyles.css"));


            BundleTable.EnableOptimizations = true;
        }
        
    }
}
