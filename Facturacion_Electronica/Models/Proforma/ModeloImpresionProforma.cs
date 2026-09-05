using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Proforma
{
    public class ModeloImpresionProforma
    {
        public Facturacion_Electronica.Proforma Proforma { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}