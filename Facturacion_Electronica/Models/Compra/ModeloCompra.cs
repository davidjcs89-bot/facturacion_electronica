using Facturacion_Electronica.Models.Cliente;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Compra
{
    public class ModeloCompra
    {
        public int Id { get; set; }
        public int IdEmisor { get; set; }
        public DateTime Fecha { get; set; }
        public string Numero { get; set; }
        public string Clave { get; set; }
        public int ICliente { get; set; }
        public ModeloCliente Cliente { get; set; }
        public decimal TotalSinImpuestos { get; set; }
        public decimal TotalDescuento { get; set; }
        public decimal Total { get; set; }
    }
}