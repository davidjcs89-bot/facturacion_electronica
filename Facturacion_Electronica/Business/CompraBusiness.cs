using Facturacion_Electronica.Models.Compra;
using System;
using System.Collections.Generic;
using System.Globalization;
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

        public List<Compra> BuscarCompras(ModeloBuscarCompra modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Compra>();

            if (ultimos)
            {
                return _db.Compra.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = _db.Compra.Where(x => x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.fecha_creacion < fechaHasta).ToList();
            }
            if (modeloBuscar.BuscarPorNumero != null && modeloBuscar.BuscarPorNumero.Trim().Length > 0 && !modeloBuscar.BuscarPorNumero.Equals("0000"))
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.numero.Contains(modeloBuscar.BuscarPorNumero)).ToList();
            }
            if (modeloBuscar.BuscarPorIdCliente != null && modeloBuscar.BuscarPorIdCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.identificacion == modeloBuscar.BuscarPorIdCliente).ToList();
            }
            return listado;
        }

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

            xmlFactura = xmlFactura.Replace("&lt;", "<");
            xmlFactura = xmlFactura.Replace("&gt;", ">");

            // Recortar xml
            int indiceInicio = xmlFactura.IndexOf("<factura");  //
            int indiceFin = xmlFactura.IndexOf("</factura>");

            xmlFactura = xmlFactura.Substring(indiceInicio, (indiceFin + 10) - indiceInicio);

            XmlReader xmlReader = XmlReader.Create(new StringReader(xmlFactura));
            ModeloCompraXml result = (ModeloCompraXml)serializer.Deserialize(xmlReader);

            result.Detalles.ForEach(x=>x.PrecioVenta = x.PrecioCompra);

            return result;
        }

        public Compra CargarModeloCompra(ModeloCompraXml xml, int idEmisor)
        {
            var compra = new Compra();
            var cliente = _db.Clientes.FirstOrDefault(x => x.id_emisor == idEmisor && x.identificacion == xml.DatosTributarios.Ruc);
            if (cliente == null)
            {
                compra.Clientes = new Clientes
                {
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
            compra.fecha = DateTime.ParseExact(xml.Factura.FechaEmision, "dd/MM/yyyy", CultureInfo.InvariantCulture);
            compra.numero = xml.DatosTributarios.CodigoEstablecimiento + "-" + xml.DatosTributarios.CodigoEmision + "-" + xml.DatosTributarios.Secuencial;
            compra.clave = xml.DatosTributarios.ClaveAcceso;
            compra.total_sin_impuestos = xml.Factura.TotalSinImpuestos;
            compra.total_descuento = xml.Factura.TotalDescuento;
            compra.total = xml.Factura.Total;

            compra.Impuestos_Compra = new List<Impuestos_Compra>();
            foreach (var impuesto in xml.Factura.Impuestos.ToList())
            {
                compra.Impuestos_Compra.Add(new Impuestos_Compra
                {
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
                    impuestos.Add(new Impuesto_Detalle_Compra
                    {
                        base_imponible = impuesto.BaseImponible,
                        codigo = impuesto.Codigo,
                        codigo_porcentaje = impuesto.CodigoPorcentaje,
                        tarifa = impuesto.Tarifa,
                        valor = impuesto.Valor
                    });

                    compra.Detalle_Compra.Add(new Detalle_Compra
                    {
                        cantidad = (int)(detalle.Cantidad),
                        codigo = detalle.Codigo,
                        descripcion = detalle.Descripcion,
                        descuento = detalle.Descuento,
                        precio = detalle.PrecioCompra,
                        precio_sin_impuestos = detalle.PrecioSInImpuestos,
                        Impuesto_Detalle_Compra = impuestos
                    });
                }
            }

            return compra;
        }

        public void CrearProductos(ModeloCompraXml xml, int idEmisor)
        {

            var emisor = _db.Emisor.FirstOrDefault(x => x.id == idEmisor);

            if (emisor == null)
            {
                return;
            }

            foreach (var detalle in xml.Detalles)
            {

                var producto = _db.Producto.FirstOrDefault(x => x.id_emisor == idEmisor && x.Codigo == detalle.Codigo);

                if (producto != null)
                {
                    producto.Fecha_modificacion = DateTime.Now;
                    producto.Costo_producto = detalle.PrecioCompra;
                    producto.Nombre = detalle.Descripcion;
                    producto.Precio = detalle.PrecioVenta;
                    producto.Cantidad_producto = (int?)detalle.Cantidad;

                    var stockBodega = _db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == producto.id && x.id_bodega == xml.idBodega);

                    if (stockBodega != null)
                    {
                        stockBodega.stock += (int)detalle.Cantidad;
                    }
                    else
                    {
                        producto.Productos_x_bodega.Add(new Productos_x_bodega
                        {
                            stock = (int)detalle.Cantidad,
                            id_bodega = xml.idBodega
                        });
                    }
                }
                else
                {
                    var productoNuevo = new Producto
                    {
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
                        Costo_producto = detalle.PrecioCompra,
                        Precio = detalle.PrecioVenta,
                        id_emisor = idEmisor,
                        Tipo_producto = EnumTipoProducto.BIEN
                    };

                    productoNuevo.Productos_x_bodega.Add(new Productos_x_bodega
                    {
                        stock = (int)detalle.Cantidad,
                        id_bodega = xml.idBodega
                    });

                    _db.Producto.Add(productoNuevo);
                }
            }
            _db.SaveChanges();
        }

        public void GuardarCompra(ModeloCompraXml xml, int idEmisor)
        {
            var compra = this.CargarModeloCompra(xml, idEmisor);
            compra.id_bodega = xml.idBodega;
            compra.fecha_creacion = DateTime.Now;
            compra.estado = 1;

            if (compra != null)
            {
                _db.Compra.Add(compra);
                _db.SaveChanges();

                this.CrearProductos(xml, idEmisor);
            }
        }

    }
}