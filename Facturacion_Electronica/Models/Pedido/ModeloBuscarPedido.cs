using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.Pedido
{
    public class ModeloBuscarPedido
    {
        [Display(Name = "Número de Pedido:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Nombre de Cliente:")]
        public string BuscarPorNombreCliente { get; set; }
        [Display(Name = "Numero de Identificacion de Cliente:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Numero de Código de Cliente:")]
        public string BuscarPorCodigoCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Facturacion_Electronica.Pedido> Pedidos { get; set; }
    }
}