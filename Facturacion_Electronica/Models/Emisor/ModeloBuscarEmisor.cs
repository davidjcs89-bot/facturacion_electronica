using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Emisor
{
    public class ModeloBuscarEmisor
    {
        [Display(Name = "Buscar por Razon Social:")]
        public string BuscarPorRazonSocial { get; set; }
        [Display(Name = "Buscar por Ruc:")]
        public string BuscarPorRuc { get; set; }
        [Display(Name = "Buscar por Email:")]
        public string BuscarPorEmail { get; set; }
        public List<Facturacion_Electronica.Emisor> Emisores { get; set; }
        public bool BuscarTodos { get; set; }
    }
}