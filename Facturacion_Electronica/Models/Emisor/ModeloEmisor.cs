using Facturacion_Electronica.Validators;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Emisor
{
    public class ModeloEmisor
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[0-9]{13}$", ErrorMessage = "Nota importante: permitidos solo numeros")]
        [Display(Name = "Numero de RUC:")]
        public string Ruc { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z'.''0-9'' ']{2,40}$", ErrorMessage = "Nota importante: minimo 2, maximo 40 caracteres, simbolos permitidos: .")]
        [Display(Name = "Apellidos y Nombre, Razon Social:")]
        public string RazonSocial { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z'.''0-9'' ']{2,40}$", ErrorMessage = "Nota importante: minimo 2, maximo 40 caracteres, simbolos permitidos: .")]
        [Display(Name = "Nombre Comercial:")]
        public string NombreComercial { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[a-zA-Z'.''0-9'' '-]{4,100}$", ErrorMessage = "Nota importante: minimo 4, maximo 100 caracteres, simbolos permitidos:- .")]
        [Display(Name = "Direccion Matriz:")]
        public string DireccionMatriz { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Es contribuyente Especial")]
        public bool ContirbuyenteEspecial { get; set; }

        [ConditionalRequired("ContirbuyenteEspecial==true", ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[0-9]{2,13}$", ErrorMessage = "Nota importante: permitidos solo numeros, minimo 2, maximo 13 caracteres")]
        [Display(Name = "Numero de Contribuyente Especial:")]
        public string NumeroContribuyenteEspecial { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Obligado a llevar contabilidad")]
        public bool ObligadoContabilidad { get; set; }

        [Display(Name = "Porcentaje Iva por Defecto")]
        public int IdImpuestoIva { get; set; }

        [Display(Name = "Logo")]
        public string Logo { get; set; }
        public string LogoRelativoPath { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Tipo de Ambiente")]
        public int TipoAmbiente { get; set; }

        [Display(Name = "Cargar Firma")]
        public string Firma { get; set; }

        //[Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Contraseña Firma")]
        public string ContrasenaFirma { get; set; }

        [Display(Name = "Adicionales en Comprobantes")]
        public string Adicionales { get; set; }
    }

    public class ModeloEmisorConfigAdmin
    {
        public DateTime FechaDesde { get; set; }
        public DateTime FechaHasta { get; set; }
        public ModeloEmisor Emisor { get; set; }
    }
}