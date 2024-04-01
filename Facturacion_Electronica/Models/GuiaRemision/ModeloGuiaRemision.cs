using Facturacion_Electronica.Models.Cliente;
using Facturacion_Electronica.Models.Emisor;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Transportista;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Facturacion_Electronica.Models.GuiaRemision
{
    public class ModeloGuiaRemision
    {
        public int Id { get; set; }
        public ModeloEmisor Emisor { get; set; }
        public DateTime FechaInicioTransporte { get; set; }
        public DateTime FechaFinTransporte { get; set; }
        public string EmailUsuario { get; set; }
        public string Ambiente { get; set; }
        public string ClaveAcceso { get; set; }
        public string Numero { get; set; }
        public int PuntoEmisionId { get; set; }
        public string IdentificacionTransportista { get; set; }
        public ModeloTransportista Transportista { get; set; }
        public string DireccionSucursal { get; set; }
        [Display(Name = "Dirección de Partida")]
        public string DireccionPartida { get; set; }
        public int Estado { get; set; }
        [Display(Name = "Número de Identificación")]
        public string IdentificacionDestinatario { get; set; }
        [Display(Name = "Razón Social/ Apellidos y Nombres")]
        public string NombreDestinatario { get; set; }
        [Display(Name = "Dirección Destino")]
        public string DireccionDestino { get; set; }
        [Display(Name = "Motivo de Traslado")]
        public string MotivoTraslado { get; set; }
        [Display(Name = "Ruta")]
        public string Ruta { get; set; }
        [Display(Name = "Código de Establecimiento Destino")]
        public string CodigoEstablecimientoDestino { get; set; }
        [Display(Name = "Documento Aduanero")]
        public string DocumentoAduanero { get; set; }
        [Display(Name = "Fecha de Emisión")]
        public DateTime FechaEmisionDocumento { get; set; }
        [Display(Name = "Documento")]
        public int IdDocumento { get; set; }
        [RegularExpression(@"^[0-9]{10,49}$", ErrorMessage = "Número Incorrecto: Debe constar de 10 o 49 caracteres")]
        [Display(Name = "Número de Autorización")]
        public string NumeroAutorizacion { get; set; }
        public List<ModeloGuiaDestinatario> Destinatarios { get; set; }
        public int IdDestinatarioSeleccionado { get; set; }
        public List<ModeloDatoAdicional> Adicionales { get; set; }
    }

    public class ModeloGuiaDestinatario
    {
        public int Id { get; set; }
        public int IdGuia { get; set; }
        public int IdCliente { get; set; }
        [Display(Name = "Nro. Identificación")]
        public string Identificacion { get; set; }
        [Display(Name = "Nombre Destinatario")]
        public string Nombres { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string MotivoTraslado { get; set; }
        [Display(Name = "Ruta")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string Ruta { get; set; }
        [Display(Name = "Código de Establecimiento Destino")]
        [Required(ErrorMessage = "Dato requerido.")]
        [MaxLength(4, ErrorMessage = "Máximo 4 caracteres")]
        public string CodigoEstablecimientoDestino { get; set; }
        [Display(Name = "Documento Aduanero")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string DocumentoAduanero { get; set; }
        [Display(Name = "Fecha de Emisión")]
        [Required(ErrorMessage = "Dato requerido.")]
        public DateTime FechaEmisionDocumento { get; set; }
        [Display(Name = "Documento")]
        public int IdDocumento { get; set; }
        [Display(Name = "Número de Comprobante")]
        [RegularExpression(@"^[0-9]{3}$", ErrorMessage = "Número de Comprobante Incorrecto")]
        public string CodigoEstabComprobante { get; set; }
        [RegularExpression(@"^[0-9]{3}$", ErrorMessage = "Número de Comprobante Incorrecto")]
        public string PuntiEmisComprobante { get; set; }
        [RegularExpression(@"^[0-9]{9}$", ErrorMessage = "Número de Comprobante Incorrecto")]
        public string NumComprobante { get; set; }
        [Display(Name = "Número de Autorización")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string NumeroAutorizacion { get; set; }
        [Display(Name = "Dirección Destino")]
        [Required(ErrorMessage = "Dato requerido.")]
        public string DireccionDestino { get; set; }
        public List<ModeloDetalleGuiaRemision> Detalles { get; set; }
    }

    public class ModeloDetalleGuiaRemision
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public string Codigo { get; set; }
        public string Descripcion { get; set; }
        public int Cantidad { get; set; }
    }
}