using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Producto;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.LiquidacionCompra
{
    public class ModeloLiquidacion
    {
        public int Id { get; set; }
        public ModeloEmisor Emisor { get; set; }
        public DateTime FechaEmison { get; set; }
        [RegularExpression(@"^([0-9]{3}-[0-9]{3}-[0-9]{9})$", ErrorMessage = "Error Número de Guía de Remisión")]
        [Display(Name = "Guía de Remisión:")]
        public string GuiaRemision { get; set; }
        public string EmailUsuario { get; set; }
        public string Ambiente { get; set; }
        public string ClaveAcceso { get; set; }
        public string  Numero { get; set; }
        public int PuntoEmisionId { get; set; }
        [Display(Name = "Consumidor Final")]
        public bool EsConsumidorFinal { get; set; }
        public ModeloCliente Cliente { get; set; }
        public string DireccionSucursal { get; set; }
        public decimal SubtotalSinImpuestos { get; set; }
        public decimal SubtotalIva { get; set; }
        public decimal SubtotalIvaCero { get; set; }
        public decimal SubtotalIce { get; set; }
        public decimal SubtotalIrbpnr { get; set; }
        public decimal SubtotalNoObjetoIva { get; set; }
        public decimal SubtotalExcentoIva { get; set; }
        public decimal TotalDescuento { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal ValorIrbpnr { get; set; }
        public decimal Propina { get; set; }
        public decimal Total { get; set; }
        public int Estado { get; set; }
        public bool PermiteEditarCliente { get; set; }
        public bool PermiteEditarDetalles { get; set; }
        public List<ModeloLiquidacionDetalle> Detalles { get; set; }
        public List<ModeloLiquidacionPago> Pagos { get; set; }
        public List<ModeloDatoAdicional> Adicionales { get; set; }
    }

    public class ModeloLiquidacionDetalle
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public ModeloProducto Producto { get; set; }
        public decimal PrecioUnitario { get; set; }
        public int Cantidad { get; set; }
        public decimal Descuento { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal ValorIrbpnr { get; set; }
        public decimal Total { get; set; }
        public string Adicional { get; set; }
    }

    public class ModeloLiquidacionPago
    {
        public int Id { get; set; }
        public int IdFactura { get; set; }
        [Display(Name = "Forma de Pago")]
        public int IdFormaPago { get; set; }
        public string DescripcionFormaPago { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public decimal Valor { get; set; }
        public string Tiempo { get; set; }
        public int Plazo { get; set; }
    }
}