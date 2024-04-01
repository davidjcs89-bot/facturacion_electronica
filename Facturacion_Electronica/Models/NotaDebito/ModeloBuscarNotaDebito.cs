using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.NotaDebito
{
    public class ModeloBuscarNotaDebito
    {
        [Display(Name = "Número de Nota de Crédito:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Nombre de Cliente:")]
        public string BuscarPorNombreCliente { get; set; }
        [Display(Name = "Numero de Identificacion de Cliente:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Facturacion_Electronica.Nota_debito> Notas { get; set; }
    }
}