using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Retencion
{
    public class ModeloImpresionRetencion
    {
        public Facturacion_Electronica.Retencion Retencion { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}