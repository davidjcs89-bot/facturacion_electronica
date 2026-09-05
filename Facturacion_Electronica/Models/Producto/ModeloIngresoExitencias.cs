using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Producto
{
    public class ModeloIngresoExitencias
    {
        public int Id { get; set; }
        public int IdBodega { get; set; }

        public string Fecha { get; set; }
        public string Bodega { get; set; }
        public int TotalItems { get; set; }

        public List<ModeloDetalleIngresoExistencias> detalle { get; set; }

        public ModeloIngresoExitencias()
        {
            detalle = new List<ModeloDetalleIngresoExistencias>();
        }
    }
}