using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.NotaCredito
{
    public class ModeloImpresionNotaCredito
    {
        public Nota_credito NotaCredito { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}