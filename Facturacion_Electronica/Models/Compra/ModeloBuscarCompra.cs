using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Compra
{
    public class ModeloBuscarCompra
    {
        [Display(Name = "Número de Facura:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Numero de Identificacion de Cliente:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Facturacion_Electronica.Compra> Compras { get; set; }
    }
}