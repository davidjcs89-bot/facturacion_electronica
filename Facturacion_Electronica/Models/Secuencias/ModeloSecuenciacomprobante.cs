using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Secuencias
{
    public class ModeloSecuenciacomprobante
    {
        public int Id { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Numero de Establecimiento:")]
        [RegularExpression(@"(?!000)^[0-9]{3}$", ErrorMessage = "Nota importante: permitidos solo 3 numeros y no puede ser 000")]
        public string NumeroComprobante { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Numero de Punto de Emision:")]
        [RegularExpression(@"(?!000)^[0-9]{3}$", ErrorMessage = "Nota importante: permitidos solo 3 numeros y no puede ser 000")]
        public string NumeroPuntoEmision { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Direccion de Establecimiento:")]
        [RegularExpression(@"^[a-zA-Z'.''0-9'' '-]{4,100}$", ErrorMessage = "Nota importante: minimo 4, maximo 100 caracteres, simbolos permitidos:- .")]
        public string Direccion { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Bodega")]
        public int IdBodega { get; set; }

        public List<ModeloSecuencia> Secuencias { get; set; }
    }
}