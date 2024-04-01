using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.GuiaRemision
{
    public class ModeloBuscarGuiaRemision
    {
        [Display(Name = "Número de Guia de Remisión:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Nombre de Transportista:")]
        public string BuscarPorNombreCliente { get; set; }
        [Display(Name = "Numero de Identificacion de Transportista:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Guia_remision> Guias { get; set; }
    }
}