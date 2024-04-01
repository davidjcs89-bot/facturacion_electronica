using Facturacion_Electronica.Models.Compra;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Xml;
using System.Xml.Serialization;

namespace Facturacion_Electronica.Business
{
    public class CompraBusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();

        public ModeloCompraXml CargarModeloCompraPorXml(Stream xml)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(ModeloCompraXml));
            XmlDocument doc = new XmlDocument();
            doc.Load(xml);
            string xmlFactura = "";
            var factura = doc.GetElementsByTagName("comprobante");
            for (int i = 0; i < factura.Count; i++)
            {
                xmlFactura += factura[i].InnerXml;
            }
            XmlReader xmlReader = XmlReader.Create(new StringReader(xmlFactura));
            ModeloCompraXml result = (ModeloCompraXml)serializer.Deserialize(xmlReader);
            return result;
        }

        public Compra CargarModeloCompra(ModeloCompraXml xml, int idEmisor)
        {
            var compra = new Compra();
            var cliente = _db.Clientes.FirstOrDefault(x=>x.id_emisor == idEmisor && x.identificacion == xml.DatosTributarios.Ruc);
            if (cliente == null)
            {
                compra.Clientes = new Clientes { 
                    identificacion = xml.DatosTributarios.Ruc,
                    Direccion = xml.DatosTributarios.DireccionMatriz,
                    fecha_creacion = DateTime.Now,
                    fecha_modificacion = DateTime.Now,
                    id_emisor =idEmisor,
                    nombre_cliente = xml.DatosTributarios.RazonSocial,
                    tipo_cliente = EnumTipoCliente.PROVEEDOR,
                    tipo_identificacion = EnumTipoIdentificacion.RUC                    
                };
            }
            else
            {
                compra.Clientes = new Clientes
                {
                    id = cliente.id,
                    identificacion = xml.DatosTributarios.Ruc,
                    Direccion = xml.DatosTributarios.DireccionMatriz,
                    fecha_creacion = DateTime.Now,
                    fecha_modificacion = DateTime.Now,
                    id_emisor = idEmisor,
                    nombre_cliente = xml.DatosTributarios.RazonSocial,
                    tipo_cliente = EnumTipoCliente.PROVEEDOR,
                    tipo_identificacion = EnumTipoIdentificacion.RUC
                };
            }
            compra.id_emisor = idEmisor;
            compra.fecha = Convert.ToDateTime(xml.Factura.FechaEmision);
            compra.numero = xml.DatosTributarios.CodigoEstablecimiento + "-" + xml.DatosTributarios.CodigoEmision + "-" + xml.DatosTributarios.Secuencial;
            compra.clave = xml.DatosTributarios.ClaveAcceso;
            compra.total_sin_impuestos = xml.Factura.TotalSinImpuestos;
            compra.total_descuento = xml.Factura.TotalDescuento;
            compra.total = xml.Factura.Total;

            compra.Impuestos_Compra = new List<Impuestos_Compra>();
            foreach (var impuesto in xml.Factura.Impuestos.ToList())
            {
                compra.Impuestos_Compra.Add(new Impuestos_Compra { 
                    base_imponible = impuesto.BaseImponible,
                    codigo = impuesto.Codigo,
                    codigo_porcentaje = impuesto.CodigoPorcentaje,
                    valor = impuesto.Valor
                });
            }

            compra.Detalle_Compra = new List<Detalle_Compra>();
            foreach (var detalle in xml.Detalles.ToList())
            {
                var impuestos = new List<Impuesto_Detalle_Compra>();
                foreach (var impuesto in detalle.Impuestos.ToList())
                {
                    impuestos.Add(new Impuesto_Detalle_Compra { 
                        base_imponible = impuesto.BaseImponible,
                        codigo = impuesto.Codigo,
                        codigo_porcentaje = impuesto.CodigoPorcentaje,
                        tarifa = impuesto.Tarifa,
                        valor = impuesto.Valor
                    });

                    compra.Detalle_Compra.Add(new Detalle_Compra { 
                        cantidad = (int)(detalle.Cantidad),
                        codigo = detalle.Codigo,
                        descripcion = detalle.Descripcion,
                        descuento = detalle.Descuento,
                        precio = detalle.Precio,
                        precio_sin_impuestos = detalle.PrecioSInImpuestos,
                        Impuesto_Detalle_Compra = impuestos
                    });
                }
            }

            return compra;
        }

        public void CrearProductos(ModeloCompraXml xml, int idEmisor)
        {

            var emisor = _db.Emisor.FirstOrDefault(x=>x.id == idEmisor);

            if (emisor == null)
            {
                return;
            }

            foreach (var detalle in xml.Detalles)
            {
                _db.Producto.Add(new Producto { 
                    Cantidad_producto = (int?)detalle.Cantidad,
                    Codigo = detalle.Codigo,
                    Codigo_auxiliar = detalle.Codigo,
                    Nombre = detalle.Descripcion,
                    Codigo_ice = EnumImpuestoProducto.NO_APLICA_ICE,
                    Codigo_irbpnr = EnumImpuestoProducto.NO_APLICA_IRBPNR,
                    Codigo_iva = emisor.id_impuesto_iva_actual,
                    fecha_creacion = DateTime.Now,
                    Fecha_caducidadproducto = null,
                    Fecha_modificacion = DateTime.Now,
                    Fecha_elavoracionproducto = null,
                    Costo_producto = detalle.Precio,
                    Precio = detalle.Precio,
                    id_emisor = idEmisor,
                    Tipo_producto = EnumTipoProducto.BIEN
                });

                _db.SaveChanges();
            }
        }

        public void GudardarCompra(ModeloCompraXml xml, int idEmisor)
        {
            var compra = this.CargarModeloCompra(xml,idEmisor);

            if (compra != null)
            {
                _db.Compra.Add(compra);
                _db.SaveChanges();

                this.CrearProductos(xml,idEmisor);
            }
        }

    }
}