using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Factura
{
    public class ModeloImpresionFactura
    {
        public Facturacion_Electronica.Factura Factura{ get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}