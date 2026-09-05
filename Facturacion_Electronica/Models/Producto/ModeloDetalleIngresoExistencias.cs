using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Producto
{
    public class ModeloDetalleIngresoExistencias
    {
        public int Id { get; set; }
        public ModeloProducto producto { get; set; }
        public int Cantidad { get; set; }
    }
}