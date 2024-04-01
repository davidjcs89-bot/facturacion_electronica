using Facturacion_Electronica.Models.Producto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Factura
{
    public class ModeloBuscarProductos
    {
        public string Codigo { get; set; }
        public ModeloProducto Producto { get; set; }
    }
}