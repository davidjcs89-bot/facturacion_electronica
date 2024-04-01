using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Factura;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Retencion
{
    public class ModeloRetencion
    {
        public int Id { get; set; }
        public ModeloEmisor Emisor { get; set; }
        public DateTime FechaEmison
        {
            get; set;
        }
        public string EmailUsuario { get; set; }
        public string Ambiente { get; set; }
        public string ClaveAcceso { get; set; }
        public string Numero { get; set; }
        public int PuntoEmisionId { get; set; }
        public ModeloCliente Cliente { get; set; }
        public string DireccionSucursal { get; set; }

        [Display(Name = "Tipo de Documento:")]
        public int IdTipoDocumento { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [RegularExpression(@"^[0-9]{15}$", ErrorMessage = "Número de Comprobante Incorrecto")]
        [Display(Name = "Nro. Comprobante:")]
        public string NumeroComprobante { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Fecha Emision:")]
        public DateTime FechaEmisionComprobante { get; set; }
        [Display(Name = "Impuesto:")]
        public int IdImpuesto { get; set; }
        [Display(Name = "Porcentaje Impuesto:")]
        public int IdPorcentajeImpuesto { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Range(0, double.MaxValue, ErrorMessage = "Solo valores mayores o igual a cero")]
        [Display(Name = "Base Imponible:")]
        public decimal BaseImponible { get; set; }
        [Display(Name = "Porcentaje Retención:")]
        public decimal PorcentajeRetencion { get; set; }
        [Display(Name = "Valor Retenido:")]
        public decimal ValorRetenido { get; set; }
        public int Estado { get; set; }
        public List<ModeloDetalleImpuesto> Detalles { get; set; }
        public List<ModeloDatoAdicional> Adicionales { get; set; }
    }

    public class ModeloDetalleImpuesto
    {
        public int Id { get; set; }
        public string CodigoImpuesto { get; set; }
        public string NombreImpuesto { get; set; }
        public string DescripcionImpuesto { get; set; }
        public decimal BaseImponible { get; set; }
        public decimal Porcentaje { get; set; }
        public decimal Total { get; set; }
        public DateTime FechaEmision { get; set; }
        public string TipoDocumento { get; set; }
    }
}