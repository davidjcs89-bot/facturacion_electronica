using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.NotaDebito
{
    public class ModeloImpresionNotaDebito
    {
        public Nota_debito NotaDebito { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}