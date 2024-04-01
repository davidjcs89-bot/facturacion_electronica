using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Usuario
{
    public class RecuperarClave
    {
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$", ErrorMessage = "Nota importante:Email invalido")]
        [Display(Name = "Correo electronico:")]
        public string Correo { get; set; }
    }

    public class ActualizarClave
    {
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Código de Seguridad:")]
        public string Codigo { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Nueva Contraseña:")]
        [RegularExpression(@"^[a-zA-Z''.''@''_''0-9'-]{4,15}$", ErrorMessage = "Nota importante numeros,letras: minimo 4, maximo 15 caracteres, simbolos permitidos:@ - . _ ")]
        public string Clave { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Confirmar Nueva Contraseña:")]
        public string ClaveComfirmada { get; set; }
    }
}