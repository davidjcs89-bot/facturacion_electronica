using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.LiquidacionCompra
{
    public class ModeloBuscarLiquidacion
    {
        [Display(Name = "Número de Facura:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Nombre de Cliente:")]
        public string BuscarPorNombreCliente { get; set; }
        [Display(Name = "Numero de Identificacion de Cliente:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Facturacion_Electronica.Liquidacion_Compra> Liquidaciones { get; set; }
    }
}