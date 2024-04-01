using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Producto;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.NotaCredito
{
    public class ModeloNotaCredito
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
        public decimal SubtotalIvaCero { get; set; }
        public decimal SubtotalIce { get; set; }
        public decimal SubtotalIrbpnr { get; set; }
        public decimal SubtotalNoObjetoIva { get; set; }
        public decimal SubtotalExcentoIva { get; set; }
        public decimal TotalDescuento { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal ValorIrbpnr { get; set; }
        public decimal Total { get; set; }

        [Required(ErrorMessage = "Dato requerido.")]
        [Display(Name = "Motivo")]
        public string Motivo { get; set; }
        public int Estado { get; set; }
        public List<ModeloNotaCreditoDetalle> Detalles { get; set; }
        public List<ModeloDatoAdicional> Adicionales { get; set; }
    }

    public class ModeloNotaCreditoDetalle
    {
        public bool Seleccionar { get; set; }
        public int Id { get; set; }
        public int IdDetalleFactura { get; set; }
        public ModeloFacturaDetalle DetalleFactura { get; set; }
        public ModeloProducto Producto { get; set; }   
        public decimal PrecioUnitario { get; set; }
        public int Cantidad { get; set; }
        public decimal Descuento { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal ValorIrbpnr { get; set; }
        public decimal Total { get; set; }
    }
}