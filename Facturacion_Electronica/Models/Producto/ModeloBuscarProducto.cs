using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Producto
{
    public class ModeloBuscarProducto
    {
        [Display(Name = "Numero de SKU o Codigo:")]
        public string BuscarPorCodigo { get; set; }
        [Display(Name = "Codigo Auxliar o Estilo:")]
        public string BuscarPorEstilo { get; set; }
        [Display(Name = "Nombre del Producto:")]
        public string BuscarPorNombre { get; set; }
        public List<Facturacion_Electronica.Producto> Productos { get; set; }
        [Display(Name = "Ver todos los Productos")]
        public bool BuscarTodos { get; set; }

    }
}