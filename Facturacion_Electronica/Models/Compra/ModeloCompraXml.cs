using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Xml.Serialization;

namespace Facturacion_Electronica.Models.Compra
{
    [XmlRoot("factura")]
    public class ModeloCompraXml
    {
        [XmlElement("infoTributaria")]
        public InformacionTributariaXml DatosTributarios { get; set; }

        [XmlElement("infoFactura")]
        public InformacionFacturaXml Factura { get; set; }


        [XmlArray("detalles")]
        public List<DetalleCompraXml> Detalles { get; set; }
    }

    public class InformacionTributariaXml
    {
        [XmlElement("razonSocial")]
        public string RazonSocial { get; set; }

        [XmlElement("nombreComercial")]
        public string NombreComercial { get; set; }

        [XmlElement("ruc")]
        public string Ruc { get; set; }

        [XmlElement("claveAcceso")]
        public string ClaveAcceso { get; set; }

        [XmlElement("ptoEmi")]
        public string CodigoEmision { get; set; }

        [XmlElement("estab")]
        public string CodigoEstablecimiento { get; set; }

        [XmlElement("secuencial")]
        public string Secuencial { get; set; }

        [XmlElement("dirMatriz")]
        public string DireccionMatriz { get; set; }
    }

    public class InformacionFacturaXml {

        [XmlElement("fechaEmision")]
        public string FechaEmision { get; set; }

        [XmlElement("dirEstablecimiento")]
        public string DireccionEstablecimiento { get; set; }

        [XmlElement("tipoIdentificacionComprador")]
        public string TipoIdentificacionComprador { get; set; }

        [XmlElement("razonSocialComprador")]
        public string RazonSocialComprador { get; set; }

        [XmlElement("identificacionComprador")]
        public string IdentificacionComprador { get; set; }

        [XmlElement("direccionComprador")]
        public string DireccionComprador { get; set; }

        [XmlElement("totalSinImpuestos")]
        public decimal TotalSinImpuestos { get; set; }

        [XmlElement("totalDescuento")]
        public decimal TotalDescuento { get; set; }

        [XmlElement("importeTotal")]
        public decimal Total { get; set; }

        [XmlArray("totalConImpuestos")]
        public List<ImpuestoCompraXml> Impuestos { get; set; }
    }

    [XmlType("totalImpuesto")]
    public class ImpuestoCompraXml
    {
        [XmlElement("codigo")]
        public string Codigo { get; set; }

        [XmlElement("codigoPorcentaje")]
        public string CodigoPorcentaje { get; set; }

        [XmlElement("baseImponible")]
        public decimal BaseImponible { get; set; }

        [XmlElement("valor")]
        public decimal Valor { get; set; }
    }

    [XmlType("detalle")]
    public class DetalleCompraXml
    {
        [XmlElement("codigoPrincipal")]
        public string Codigo { get; set; }

        [XmlElement("descripcion")]
        public string Descripcion { get; set; }

        [XmlElement("cantidad")]
        public decimal Cantidad { get; set; }

        [XmlElement("precioUnitario")]
        public decimal Precio { get; set; }

        [XmlElement("descuento")]
        public decimal Descuento { get; set; }

        [XmlElement("precioTotalSinImpuesto")]
        public decimal PrecioSInImpuestos { get; set; }

        [XmlArray("impuestos")]
        public List<ImpuestoDetalleCompraXml> Impuestos { get; set; }
    }

    [XmlType("impuesto")]
    public class ImpuestoDetalleCompraXml : ImpuestoCompraXml
    {

        [XmlElement("tarifa")]
        public decimal Tarifa { get; set; }
    }
}