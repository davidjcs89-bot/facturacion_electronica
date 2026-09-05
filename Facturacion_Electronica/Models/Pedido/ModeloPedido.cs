using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Producto;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Pedido
{
    public class ModeloPedido
    {
        public int Id { get; set; }
        public ModeloEmisor Emisor { get; set; }
        public string EmailUsuario { get; set; }
        public string  Numero { get; set; }
        public string FechaCreacion { get; set; }
        public string FechaModificacion { get; set; }
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
        public decimal Total { get; set; }
        public int Estado { get; set; }
        public bool PermiteEditarCliente { get; set; }
        public bool PermiteEditarDetalles { get; set; }
        public List<ModeloPedidoDetalle> Detalles { get; set; }
        public List<ModeloAbono> Abonos { get; set; }
    }

    public class ModeloPedidoDetalle
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public ModeloProducto Producto { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal PrecioConImpuestos { get; set; }
        public decimal IvaUnitario { get; set; }
        public decimal IceUnitrario { get; set; }
        public decimal IrbpnrUnitario { get; set; }
        public int Cantidad { get; set; }
        public string Adicional { get; set; }
        public decimal Descuento { get; set; }
        public decimal ValorDescuento { get; set; }
        public decimal ValorDescuentoUnitario { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ValorIva { get; set; }
        public decimal ValorIce { get; set; }
        public decimal ValorIrbpnr { get; set; }
        public decimal Total { get; set; }
    }

    public class ModeloAbono
    {
        public int Id { get; set; }
        public int IdPedido { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a cero.")]
        public decimal Monto { get; set; }
        [StringLength(300, ErrorMessage = "Máximo 300 carcteres")]
        public string Descripcion { get; set; }
        public string Fecha { get; set; }
    }
}