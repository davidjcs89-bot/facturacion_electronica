using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.GuiaRemision
{
    public class ModeloImpresionGuiaRemision
    {
        public Guia_remision GuiaRemision { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}