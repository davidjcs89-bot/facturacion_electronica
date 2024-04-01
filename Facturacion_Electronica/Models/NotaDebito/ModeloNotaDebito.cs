using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Factura;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.NotaDebito
{
    public class ModeloNotaDebito
    {
        public int Id { get; set; }
        public ModeloEmisor Emisor { get; set; }
        public DateTime FechaEmison { get; set; }
        public string EmailUsuario { get; set; }
        public string Ambiente { get; set; }
        public string ClaveAcceso { get; set; }
        public string Numero { get; set; }
        public int PuntoEmisionId { get; set; }
        public int IdFactura { get; set; }
        public ModeloFactura Factura { get; set; }
        public int IdCliente { get; set; }
        public ModeloCliente Cliente { get; set; }
        public string DireccionSucursal { get; set; }
        public decimal SubtotalSinImpuestos { get; set; }
        public decimal SubtotalIva { get; set; }
        [Display(Name = "Impuesto Iva")]
        public int IdPorcentajeIva { get; set; }
        public decimal SubtotalIvaCero { get; set; }
        public decimal SubtotalIce { get; set; }
        public decimal SubtotalNoObjetoIva { get; set; }
        public decimal SubtotalExcentoIva { get; set; }
        public decimal TotalDescuento { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal Total { get; set; }
        public int Estado { get; set; }
        [Display(Name = "Razón Modificación")]
        public string RazonModificacion { get; set; }
        [Display(Name = "Valor Modificación")]
        public decimal ValorModificacion { get; set; }
        public List<ModeloDetalleNotaDebito> Detalles { get; set; }
        public List<ModeloDatoAdicional> Adicionales { get; set; }
        public List<ModeloNotaDebitoPago> Pagos { get; set; }
        public bool PermiteEditarDetalles { get; set; }
    }

    public class ModeloDetalleNotaDebito
    {
        public int Id { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Razón Modificación")]
        public string RazonModificacion { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Valor Modificación")]
        public decimal ValorModificacion { get; set; }
    }

    public class ModeloNotaDebitoPago
    {
        public int Id { get; set; }
        public int IdNota { get; set; }
        [Display(Name = "Forma de Pago")]
        public int IdFormaPago { get; set; }
        public string DescripcionFormaPago { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public decimal Valor { get; set; }
        public string Tiempo { get; set; }
        public int Plazo { get; set; }
    }
}