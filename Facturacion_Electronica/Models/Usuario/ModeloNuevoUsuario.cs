using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Usuario
{
    public class ModeloNuevoUsuario
    {
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Nombre Usuario")]
        [RegularExpression(@"^[a-zA-Z''.''_''@''0-9']{3,15}$", ErrorMessage = "Nota importante: minimo 3, maximo 15 caracteres, simbolos permitidos:@ - . _ ")]
        public string NombreUsuario { get; set; }
   
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z''.''@''_''0-9'-]{4,15}$", ErrorMessage = "Nota importante: minimo 4, maximo 15 caracteres, simbolos permitidos:@ - . _ ")]
        public string Clave { get; set; }
        
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z]{4,15}$", ErrorMessage = "Nota importante: permitidos solo letras, minimo 4, maximo 15 caracteres")]
        public string Nombre { get; set; }
        
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-ZñÑ]{4,15}$", ErrorMessage = "Nota importante: permitidos solo letras, minimo 4, maximo 15 caracteres")]
        public string Apellido { get; set; }
        
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$", ErrorMessage = "Nota importante:Email invalido, minimo 7, maximo 60 caracteres")]
        public string Correo { get; set; }
        
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Numero de telefono")]
        [RegularExpression(@"^[0-9]{6,15}$", ErrorMessage = "Nota importante: permitidos solo numeros, minimo 6, maximo 15 caracteres")]
        public string Numero_telefono { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z'.''0-9'' '-]{4,150}$", ErrorMessage = "Nota importante: minimo 4, maximo 150 caracteres, simbolos permitidos:- .")]
        public string Direccion{ get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-ZñÑ]{4,20}$", ErrorMessage = "Nota importante: permitidos solo letras, minimo 4, maximo 20 caracteres")]
        public string Ciudad { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z]{4,20}$", ErrorMessage = "Nota importante: permitidos solo letras, minimo 4, maximo 20 caracteres")]
        public string Provincia { get; set; }
        [Display(Name = "Recibir Notificaciones")]
        public bool Notificaciones { get; set; }

        public HtmlString ReCapcha { get; set; }

    }
}