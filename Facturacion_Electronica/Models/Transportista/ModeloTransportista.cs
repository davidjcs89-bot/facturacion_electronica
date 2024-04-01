using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Transportista
{
    public class ModeloTransportista
    {
        public int Id { get; set; }
        public int IdEmisor { get; set; }
        [RegularExpression(@"^[a-zA-Z''.''_''@''0-9' ']{3,50}$", ErrorMessage = "Nota importante: minimo 3, maximo 50 caracteres, simbolos permitidos:@ - . _ ")]
        [Display(Name = "Razon social o Apellido y Nombre:")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string Nombre { get; set; }
        [Display(Name = "Tipo de Identificacion")]
        [Required(ErrorMessage = "Dato requerido.")]
        public int TipoidentificacionId { get; set; }
        [Display(Name = "Numero de identificacion:")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string NumerdeIdentificacion { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$", ErrorMessage = "Nota importante:Email invalido, minimo 7, maximo 60 caracteres")]
        [Display(Name = "Correo electronico:")]
        public string Correo { get; set; }
        [RegularExpression(@"^[a-zA-Z]{3}[0-9]{3,4}$", ErrorMessage = "Nota importante: Número de Placa incorrecto")]
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Número de Placa:")]
        public string Placa { get; set; }
        public int Origen { get; set; }

    }
}