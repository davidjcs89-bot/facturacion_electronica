using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Usuario
{
    public class ModeloLogin
    {
        [Required(ErrorMessage = "Dato requerido.")]
        public string Usuario { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        public string Clave { get; set; }
    }
}