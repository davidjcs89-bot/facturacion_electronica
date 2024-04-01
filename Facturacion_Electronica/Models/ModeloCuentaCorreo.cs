using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models
{
    public class ModeloCuentaCorreo
    {
        [RegularExpression(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$", ErrorMessage = "Email invalido")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string direccion { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string nombre_mostrar { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string servidor { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Range(1, 90000, ErrorMessage = "Número de Puerto incorrecto")]
        public int puerto { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public bool ssl { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string clave { get; set; }
    }
}