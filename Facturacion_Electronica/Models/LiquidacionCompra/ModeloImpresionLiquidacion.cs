using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.LiquidacionCompra
{
    public class ModeloImpresionLiquidacion
    {
        public Liquidacion_Compra Liquidacion { get; set; }
        public impresion_comprobantes Impresion { get; set; }
    }
}