using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Retencion
{
    public class ModeloBuscarRetencion
    {
        [Display(Name = "Número de Retención:")]
        public string BuscarPorNumero { get; set; }
        [Display(Name = "Nombre de Cliente:")]
        public string BuscarPorNombreCliente { get; set; }
        [Display(Name = "Número de Identificación de Cliente:")]
        public string BuscarPorIdCliente { get; set; }
        [Display(Name = "Fecha Desde:")]
        public DateTime? BuscarFechaDesde { get; set; }
        [Display(Name = "Fecha Hasta:")]
        public DateTime? BuscarFechaHasta { get; set; }
        public List<Facturacion_Electronica.Retencion> Retenciones { get; set; }
    }
}