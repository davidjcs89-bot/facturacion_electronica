using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Cliente
{
    public class ModeloCliente
    {
        public int Id { get; set; }
        public int IdEmisor { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Razon social o Apellido y Nombre:")]
        public string RazonSocial { get; set; }
        [Display(Name = "Código")]
        public string Codigo { get; set; }
        [Display(Name = "Tipo de Identificacion")]
        public int TipoIdentificacionId { get; set; }
        [Display(Name = "Tipo de Cliente")]
        public int TipoClienteId { get; set; }
        [Required(ErrorMessage = "Nro. de Identificacion Requerido")]
        [Display(Name = "Numero de identificacion:")]
        public string NumeroIdentificacion { get; set; }
        [Display(Name = "Numero de Extencion:")]
        [RegularExpression(@"^[0-9]{4,10}$", ErrorMessage = "Número Incorrecto")]
        public string Extension { get; set; }
        [Display(Name = "Numero de Telefono convencional:")]
        [RegularExpression(@"^[0-9]{6,15}$", ErrorMessage = "Número Incorrecto")]
        public string TelefonoConvencional  { get; set; }
        [Display(Name = "Numero de telefono celular:")]
        [RegularExpression(@"^[0-9]{10}$", ErrorMessage = "Número Incorrecto")]
        public string Celular { get; set; }
        [RegularExpression(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$", ErrorMessage = "Nota importante:Email invalido, minimo 7, maximo 60 caracteres")]
        [Display(Name = "Correo electronico:")]
        public string Email { get; set; }

        [RegularExpression(@"^[a-zA-Z'.''0-9'' '-]{4,100}$", ErrorMessage = "Nota importante: minimo 4, maximo 100 caracteres, simbolos permitidos:- .")]
        [Display(Name = "Direccion Domiciliaria:")]
        public string Direccion { get; set; }
        /// <summary>
        /// Comprobante origen desde el que se genero el nuevo cliente
        /// </summary>
        public int OrigenPenticionNuevoCliente { get; set; }
    }
}