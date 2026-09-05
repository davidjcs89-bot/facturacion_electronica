using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Producto
{
    public class Kardex
    {
        public DateTime FechaDesde { get; set; }
        public DateTime FechaHasta { get; set; }
        public ModeloProducto producto { get; set; }

        public String KardexHtml { get; set; }
    }
}