using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Producto
{
    public class ModeloProducto
    {
        public int Id { get; set; }
        public int IdEmisor { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "SKU o Codigo Principal *")]
        [RegularExpression(@"^[a-zA-Z0-9]{3,30}$", ErrorMessage = "Nota importante: minimo 3, maximo 30 caracteres, sin simbolos")]
        public string CodigoPrincipal { get; set; }

        [Display(Name = "Codigo Auxiliar")]
        [RegularExpression(@"^[a-zA-Z0-9]{3,30}$", ErrorMessage = "Nota importante: minimo 3, maximo 30 caracteres, sin simbolos")]
        public string CodigoAuxiliar { get; set; }

        [Display(Name = "Tipo de Producto *")]
        public int TipoProductoId { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Nombre del Producto *")]
        [RegularExpression(@"^[a-zA-Z''.''_''/''@''0-9'\s]{3,100}$", ErrorMessage = "Nota importante: minimo 3, maximo 100 caracteres, simbolos permitidos:@ - . _ ")]
        public string Nombre { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Precio *")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Solo valores mayores a cero")]
        public decimal Precio { get; set; }

        [Display(Name = "Porcentaje Impuesto IVA *")]
        public int IdImpuestoIva { get; set; }

        [Display(Name = "Impuesto ICE *")]
        public int IdImpuestoIce { get; set; }

        [Display(Name = "Impuesto IRBPNR *")]
        public int IdImpuestoIrbpnr { get; set; }

        [Display(Name = "Fecha de Elavoracion")]
        public DateTime FechaElavoracion { get; set; }

        [Display(Name = "Fecha de Caducidad")]
        public DateTime FechaCaducidad { get; set; }

        [Display(Name = "Cantidad")]
        public int Cantidad { get; set; }

        [Display(Name = "Costo")]
        public decimal Costo { get; set; }
        public byte[] Imagen { get; set; }

        public List<AtributoProducto> Atributos { get; set; }
    }

    public class AtributoProducto {
        public int Id { get; set; }
        public string Atributo { get; set; }
        public string Valor { get; set; }
    }

}