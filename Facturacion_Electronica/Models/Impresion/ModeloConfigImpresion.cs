using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Facturacion_Electronica.Models.Impresion
{
    public class ModeloConfigImpresion
    {
        [Display(Name = "Tipo de Documento:")]
        public int IdTipoComprobante { get; set; }
        [Display(Name = "Firma:")]
        public bool Firma { get; set; }
        [Display(Name = "Mensajes:")]
        [AllowHtml]
        public string Mensajes { get; set; }
    }
}