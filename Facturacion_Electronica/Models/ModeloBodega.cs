using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models
{
    public class ModeloBodega
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Código:")]
        [MaxLength(10)]
        public string Codigo { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Nombre:")]
        [MaxLength(300)]
        public string Nombre { get; set; }

        [Display(Name = "Activa:")]
        public bool Activo { get; set; }
    }
}