using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.NotaCredito
{
    public class ModeloBuscarNotaCredito
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
        public List<Facturacion_Electronica.Nota_credito> Notas { get; set; }
    }
}