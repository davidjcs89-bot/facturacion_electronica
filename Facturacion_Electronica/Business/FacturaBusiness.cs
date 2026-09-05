using DocumentFormat.OpenXml.Packaging;
using ElectronicBilling.WebServices;
using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Producto;
using iTextSharp.text;
using iTextSharp.text.html;
using iTextSharp.text.pdf;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity.Core.EntityClient;
using System.IO;
using System.Linq;
using System.Threading;
using System.Web;
using System.Web.Hosting;
using System.Web.WebPages;
using System.Xml.Linq;

namespace Facturacion_Electronica.Business
{
    public class FacturaBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();
        public List<string> tiemposPago = new List<string>() { "NINGUNO", "DIAS", "MESES", "AÑOS" };

        public List<Factura> BuscarFacturas(ModeloBuscarFactura modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Factura>();

            if (ultimos)
            {
                return db.Factura.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = db.Factura.Where(x => x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.fecha_creacion < fechaHasta).ToList();
            }
            if (modeloBuscar.BuscarPorNumero != null && modeloBuscar.BuscarPorNumero.Trim().Length > 0 && !modeloBuscar.BuscarPorNumero.Equals("0000"))
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Numero.Contains(modeloBuscar.BuscarPorNumero)).ToList();
            }
            if (modeloBuscar.BuscarPorIdCliente != null && modeloBuscar.BuscarPorIdCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.identificacion == modeloBuscar.BuscarPorIdCliente).ToList();
            }
            else if (modeloBuscar.BuscarPorNombreCliente != null && modeloBuscar.BuscarPorNombreCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.nombre_cliente.ToUpper().Contains(modeloBuscar.BuscarPorNombreCliente.ToUpper())).ToList();
            }
            return listado;
        }

        public int GuardarFactura(ModeloFactura modeloFactura, int idEmisor)
        {
            var factura = new Factura
            {
                id_emisor = idEmisor,
                id_cliente = modeloFactura.Cliente.Id,
                Guia_de_remision = modeloFactura.GuiaRemision,
                Fecha_emision = modeloFactura.FechaEmison,
                fecha_creacion = DateTime.Now,
                id_punto_emison = modeloFactura.PuntoEmisionId,
                Numero = "",
                Clave_de_Acceso = "",
                fecha_modificacion = DateTime.Now,
                Estado = EnumEstadosComprobante.PENDIENTE,
                desde_proforma = false,
                es_mayorista = modeloFactura.EsMayorista
            };
            db.Factura.Add(factura);
            db.SaveChanges();
            return factura.id;
        }

        public void BorrarFactura(int id, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (factura == null && factura.Estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Factura.Remove(factura);
            db.SaveChanges();
        }

        public void FinalizarFactura(int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }
            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == factura.id_punto_emison && x.Id_Documentos == EnumTipoDocumento.FACTURA);
            if (secuencia != null)
            {
                factura.Numero = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            factura.Clave_de_Acceso = comprobanteBusiness.GenerarClaveAcceso(factura.Fecha_emision, factura.Numero, secuencia.Tipo_documento.Codigo_doc, factura.Emisor.Ruc, factura.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            factura.Estado = EnumEstadosComprobante.FINALIZADO;
            factura.fecha_modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(factura);
        }

        public ModeloFactura GetModeloFactura(int id, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return null;
            }

            var modelo = new ModeloFactura();
            modelo.Id = factura.id;
            modelo.Ambiente = factura.Emisor.Tipo_ambientes.Descripcion_ambiente;
            modelo.FechaEmison = factura.Fecha_emision;
            modelo.ClaveAcceso = factura.Clave_de_Acceso;
            modelo.Numero = factura.Numero;
            modelo.PuntoEmisionId = factura.Puntos_emisior.id;
            modelo.GuiaRemision = factura.Guia_de_remision;
            modelo.DireccionSucursal = factura.Puntos_emisior.Direccion;
            modelo.Emisor = emisorBusiness.BuscarEmisor(factura.id_emisor);
            modelo.Cliente = clienteBusiness.GenerarModeloCliente(factura.id_cliente);
            modelo.SubtotalSinImpuestos = factura.Subtotal_sin_impuestos;
            modelo.SubtotalIva = factura.Subtotal_iva;
            modelo.SubtotalIvaCero = factura.Subtotal_iva_cero;
            modelo.SubtotalIce = factura.Subtotal_ice;
            modelo.SubtotalIrbpnr = factura.Subtotal_irbpnr;
            modelo.SubtotalExcentoIva = factura.Subtotal_excento_iva;
            modelo.SubtotalNoObjetoIva = factura.Subtotal_no_objeto_iva;
            modelo.ValorIva = factura.Valor_iva;
            modelo.ValorIce = factura.Valor_ice;
            modelo.ValorIrbpnr = factura.Valor_irbpnr;
            modelo.TotalDescuento = factura.Total_descuento;
            modelo.Total = factura.Total;
            modelo.Estado = factura.Estado;
            modelo.EsMayorista = factura.es_mayorista;
            modelo.Detalles = new List<ModeloFacturaDetalle>();
            modelo.Pagos = new List<ModeloFacturaPago>();
            modelo.Adicionales = new List<ModeloDatoAdicional>();
            modelo.PermiteEditarCliente = factura.Estado == EnumEstadosComprobante.PENDIENTE;
            modelo.PermiteEditarDetalles = factura.Estado == EnumEstadosComprobante.PENDIENTE;

            foreach (var detalle in factura.Detalle_factura.ToList())
            {
                var detalleModelo = new ModeloFacturaDetalle();

                detalleModelo.Id = detalle.id;
                detalleModelo.Cantidad = detalle.Cantidad;
                detalleModelo.Descuento = detalle.Decuento_porcentaje;
                detalleModelo.ValorDescuento = detalle.Descuento;
                detalleModelo.IdProducto = detalle.id_producto;
                detalleModelo.Producto = productobusiness.GenerarModeloProducto(detalle.id_producto);
                detalleModelo.PrecioUnitario = detalle.Precio_unitario;
                detalleModelo.IvaUnitario = detalle.Valor_iva / detalle.Cantidad;
                detalleModelo.IceUnitrario = detalle.Valor_ice / detalle.Cantidad;
                detalleModelo.IrbpnrUnitario = detalle.Valor_irbpnr / detalle.Cantidad;

                //Aumentar el descuento, si es mayor a cero
                if (detalle.Decuento_porcentaje > 0)
                {
                    detalleModelo.IvaUnitario = detalleModelo.IvaUnitario * (1 + (detalle.Decuento_porcentaje / 100));
                    detalleModelo.IceUnitrario = detalleModelo.IceUnitrario * (1 + (detalle.Decuento_porcentaje / 100));
                    detalleModelo.IrbpnrUnitario = detalleModelo.IrbpnrUnitario * (1 + (detalle.Decuento_porcentaje / 100));
                }

                detalleModelo.ValorIva = detalle.Valor_iva;
                detalleModelo.ValorIce = detalle.Valor_ice;
                detalleModelo.ValorIrbpnr = detalle.Valor_irbpnr;
                detalleModelo.Subtotal = detalle.Sub_total;
                detalleModelo.Total = detalle.Total;
                detalleModelo.Adicional = detalle.Adicional;
                detalleModelo.PrecioConImpuestos = detalleModelo.PrecioUnitario + detalleModelo.IvaUnitario + detalleModelo.IceUnitrario + detalleModelo.IrbpnrUnitario;

                modelo.Detalles.Add(detalleModelo);
            }

            foreach (var pago in factura.Detalle_pago_Factura.ToList())
            {
                modelo.Pagos.Add(new ModeloFacturaPago
                {
                    Id = pago.id,
                    DescripcionFormaPago = pago.Formas_de_Pago.Descripcion_form_pago,
                    Plazo = pago.Plazo.Value,
                    Tiempo = pago.Timpo,
                    Valor = pago.Valor
                });
            }

            foreach (var dato in factura.Datos_Adicionales_Factura.ToList())
            {
                modelo.Adicionales.Add(new ModeloDatoAdicional
                {
                    Id = dato.id,
                    Nombre = dato.Nombre,
                    Descripcion = dato.Descripcion
                });
            }

            return modelo;

        }

        public int ImportarDesdeProforma(int idProforma, int idEmisor)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma);
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (proforma == null && puntoEmision != null)
            {
                return 0;
            }

            var factura = new Factura
            {
                id_cliente = proforma.id_cliente,
                id_emisor = proforma.id_emisor,
                Fecha_emision = DateTime.Now,
                fecha_creacion = DateTime.Now,
                fecha_modificacion = DateTime.Now,
                id_punto_emison = puntoEmision.id,
                Numero = "",
                Clave_de_Acceso = "",
                Estado = EnumEstadosComprobante.PENDIENTE,
                Subtotal_excento_iva = proforma.subtotal_excento_iva,
                Subtotal_sin_impuestos = proforma.subtotal_sin_impuesto,
                Subtotal_ice = proforma.subtotal_ice,
                Subtotal_iva = proforma.subtotal_iva,
                Subtotal_irbpnr = proforma.subtotal_irbpnr,
                Subtotal_no_objeto_iva = proforma.subtotal_no_objeto_iva,
                Subtotal_iva_cero = proforma.subtotal_iva_cero,
                Valor_ice = proforma.valor_ice,
                Valor_irbpnr = proforma.valor_irbpnr,
                Valor_iva = proforma.valor_iva,
                Total = proforma.total,
                Total_descuento = proforma.total_descuento,
                desde_proforma = true,
                Detalle_factura = new List<Detalle_factura>()
            };

            foreach (var detalle in proforma.Detalle_Proforma.ToList())
            {
                var idControlInvetario = 0;
                var cantidadDetalle = detalle.cantidad;

                //Control de inventario
                if (proforma.Emisor.control_inventario)
                {
                    var controlInventario = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == puntoEmision.id_bodega);

                    //Si no existe control de inventario para el producto, continuar con el siguiente
                    if (controlInventario == null)
                    {
                        continue;
                    }

                    idControlInvetario = controlInventario.id;

                    if (controlInventario.stock == 0)
                    {
                        continue;
                    }

                    //Si el stock de inventario es menor a la cantidad solicitada, colocar el stock actual
                    if (controlInventario.stock < detalle.cantidad)
                    {
                        cantidadDetalle = controlInventario.stock;
                    }
                }

                factura.Detalle_factura.Add(new Detalle_factura
                {
                    Adicional = detalle.adicional,
                    Cantidad = detalle.cantidad,
                    Decuento_porcentaje = detalle.descuento_porcentaje,
                    Descuento = detalle.descuento,
                    id_producto = detalle.id_producto,
                    Precio_unitario = detalle.precio,
                    Sub_total = detalle.sub_total,
                    Total = detalle.total,
                    Valor_ice = detalle.valor_ice,
                    Valor_irbpnr = detalle.valor_irbpnr,
                    Valor_iva = detalle.valor_iva
                });

                //Control de inventario
                if (proforma.Emisor.control_inventario)
                {
                    var controlInventario = db.Productos_x_bodega.Find(idControlInvetario);

                    if (controlInventario != null)
                    {
                        controlInventario.stock -= cantidadDetalle;
                    }
                }
            }

            db.Factura.Add(factura);
            db.SaveChanges();
            return factura.id;
        }

        public int ImportarDesdePedido(int idPedido, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido);
            var puntoEmision = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor);
            if (pedido == null && puntoEmision != null)
            {
                return 0;
            }

            var factura = new Factura
            {
                id_cliente = pedido.id_cliente,
                id_emisor = pedido.id_emisor,
                Fecha_emision = DateTime.Now,
                fecha_creacion = DateTime.Now,
                fecha_modificacion = DateTime.Now,
                id_punto_emison = puntoEmision.id,
                Numero = "",
                Clave_de_Acceso = "",
                Estado = EnumEstadosComprobante.PENDIENTE,
                Subtotal_excento_iva = pedido.Subtotal_excento_iva,
                Subtotal_sin_impuestos = pedido.Subtotal_sin_impuestos,
                Subtotal_ice = pedido.Subtotal_ice,
                Subtotal_iva = pedido.Subtotal_iva,
                Subtotal_irbpnr = pedido.Subtotal_irbpnr,
                Subtotal_no_objeto_iva = pedido.Subtotal_no_objeto_iva,
                Subtotal_iva_cero = pedido.Subtotal_iva_cero,
                Valor_ice = pedido.Valor_ice,
                Valor_irbpnr = pedido.Valor_irbpnr,
                Valor_iva = pedido.Valor_iva,
                Total = pedido.Total,
                Total_descuento = pedido.Total_descuento,
                desde_proforma = true,
                Detalle_factura = new List<Detalle_factura>()
            };

            foreach (var detalle in pedido.Detalle_pedido.ToList())
            {

                //Control de inventario

                var controlInventario = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == puntoEmision.id_bodega);

                //Si no existe control de inventario para el producto, continuar con el siguiente
                if (controlInventario != null)
                {
                    controlInventario.stock -= detalle.Cantidad;
                }

                factura.Detalle_factura.Add(new Detalle_factura
                {
                    Adicional = detalle.Adicional,
                    Cantidad = detalle.Cantidad,
                    Decuento_porcentaje = detalle.Decuento_porcentaje,
                    Descuento = detalle.Descuento,
                    id_producto = detalle.id_producto,
                    Precio_unitario = detalle.Precio_unitario,
                    Sub_total = detalle.Sub_total,
                    Total = detalle.Total,
                    Valor_ice = detalle.Valor_ice,
                    Valor_irbpnr = detalle.Valor_irbpnr,
                    Valor_iva = detalle.Valor_iva
                });

            }

            db.Factura.Add(factura);
            db.SaveChanges();
            return factura.id;
        }

        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (punto == null || factura == null)
            {
                return;
            }

            factura.id_punto_emison = idPuntoEmision;
            db.SaveChanges();
        }

        public string AgregarProducto(int idFactura, int idProducto, int cantidad, int idEmisor, bool grabarCambios)
        {
            var producto = db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor);

            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (producto == null || factura == null)
            {
                return "No existe el producto a actualizarse";
            }

            var iva = producto.Porcentaje_impuesto_producto2;
            var ice = producto.Porcentaje_impuesto_producto;
            var irbpnr = producto.Porcentaje_impuesto_producto1;
            var idControlInventarioProducto = 0;

            //Realizar control de inventario
            /*if (factura.Emisor.control_inventario)
            {
                //Validar que exista stock
                var stock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == idProducto && x.id_bodega == factura.Puntos_emisior.id_bodega);

                if (stock == null)
                {
                    return "No existe stock disponible para este producto";
                }

                if (stock.stock < 1)
                {
                    return "El stock del producto es insuficiente";
                }

                idControlInventarioProducto = stock.id;
            }*/

            var detalle = new Detalle_factura
            {
                id_producto = idProducto,
                Cantidad = cantidad,
                Precio_unitario = producto.Precio,
                Sub_total = producto.Precio * cantidad,
                Descuento = 0
            };
            detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
            detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
            detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
            detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;

            factura.Subtotal_sin_impuestos += detalle.Sub_total;
            factura.Total_descuento += detalle.Descuento;
            if (detalle.Valor_iva > 0)
            {
                factura.Subtotal_iva += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.IvaCeroId)
            {
                factura.Subtotal_iva_cero += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.NoObjetoIva)
            {
                factura.Subtotal_no_objeto_iva += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.ExcentoIva)
            {
                factura.Subtotal_excento_iva += detalle.Sub_total;
            }


            if (detalle.Valor_ice > 0)
            {
                factura.Subtotal_ice += detalle.Sub_total;
            }

            if (detalle.Valor_irbpnr > 0)
            {
                factura.Subtotal_irbpnr += detalle.Sub_total;
            }

            factura.Valor_iva += detalle.Valor_iva;
            factura.Valor_ice += detalle.Valor_ice;
            factura.Valor_irbpnr += detalle.Valor_irbpnr;

            factura.Total_descuento += detalle.Descuento;
            factura.Total += detalle.Total;

            factura.Detalle_factura.Add(detalle);

            if (factura.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL && factura.Clientes.identificacion == EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL)
            {
                return $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, permitido a Consumidor Final";
            }

            //Realizar control de inventario
            //if (factura.Emisor.control_inventario)
            // {
            var controlStock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == idProducto && x.id_bodega == factura.Puntos_emisior.id_bodega);

            if (controlStock != null)
            {
                controlStock.stock -= 1;
            }
            //}

            //Si es factura mayorista no guardar cambios en este punto
            if (grabarCambios)
            {
                db.SaveChanges();
            }

            return null;
        }

        public string AgregarProductoMasivo(ModeloBuscarProducto modelo, int idEmisor)
        {
            //Recorrer cada detalle del modelo
            foreach (var detalle in modelo.Productos)
            {
                //Solo si se coloco cantidad
                if (detalle.Cantidad_producto.HasValue && detalle.Cantidad_producto.Value > 0)
                {
                    string mensaje = this.AgregarProducto(modelo.IdFactura, detalle.id, detalle.Cantidad_producto.Value, idEmisor, false);

                    if (mensaje != null)
                    {
                        return mensaje;
                    }
                }
            }

            db.SaveChanges();
            return null;
        }

        public string AgregarProductoMasivoExcel(ModeloBuscarProducto modelo, int idEmisor)
        {

            //Recorrer cada detalle del modelo
            foreach (var detalle in modelo.Productos)
            {
                //Solo si se coloco cantidad
                if (detalle.Cantidad_producto.HasValue && detalle.Cantidad_producto.Value > 0)
                {
                    string mensaje = this.AgregarDetalle(modelo.IdFactura, detalle.id, idEmisor, detalle.Precio,  detalle.Cantidad_producto.Value,0 , detalle.Nombre);

                    if (mensaje != null)
                    {
                        return mensaje;
                    }
                }
            }

            var factura = db.Factura.FirstOrDefault(x => x.id == modelo.IdFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return "No existe la factura";
            }

            ActutalizarTotales(factura);

            db.SaveChanges();
            return null;
        }

        public string AgregarDetalle(int idFactura, int idProducto, int idEmisor, decimal nuevoPrecio, int nuevacantidad, decimal porcentajeDescuento, string adicional)
        {
            var producto = db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor);

            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (producto == null || factura == null)
            {
                return "No existe el producto a actualizarse";
            }

            var iva = producto.Porcentaje_impuesto_producto2;
            var ice = producto.Porcentaje_impuesto_producto;
            var irbpnr = producto.Porcentaje_impuesto_producto1;
            var idControlInventarioProducto = 0;

            //Realizar control de inventario
            /*if (factura.Emisor.control_inventario)
            {
                //Validar que exista stock
                var stock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == factura.Puntos_emisior.id_bodega);

                if (stock == null)
                {
                    return "No existe stock disponible para este producto";
                }

                //Sumar el stock actual mas la cantidad que ya existe en el detalle de la factura
                if ((stock.stock + detalle.Cantidad) < nuevacantidad)
                {
                    return "El stock del producto es insuficiente";
                }

                idControlInventarioProducto = stock.id;
            }*/

            var detalle = new Detalle_factura
            {
                id_producto = idProducto,
                Cantidad = nuevacantidad,
                Precio_unitario = producto.Precio,
                Sub_total = producto.Precio * nuevacantidad,
                Descuento = 0
            };

            var cantidadDetalleOriginal = detalle.Cantidad;

            var precioSinIva = nuevoPrecio / (1 + (iva.Porcentaje / 100));
            var subtotalSinIva = precioSinIva * nuevacantidad;

            detalle.Precio_unitario = Decimal.Round(precioSinIva, 2);
            detalle.Decuento_porcentaje = porcentajeDescuento;
            detalle.Cantidad = nuevacantidad;

            detalle.Sub_total = Decimal.Round(subtotalSinIva, 2);

            var subTotalDescontado = subtotalSinIva - (subtotalSinIva * (detalle.Decuento_porcentaje / 100));

            detalle.Descuento = Decimal.Round(subtotalSinIva * (detalle.Decuento_porcentaje / 100), 2);

            detalle.Sub_total -= detalle.Descuento;

            detalle.Valor_ice = Decimal.Round(subTotalDescontado * ice.Porcentaje / 100, 2);
            detalle.Valor_irbpnr = Decimal.Round(subTotalDescontado * irbpnr.Porcentaje / 100, 2);

            detalle.Valor_iva = Decimal.Round(subTotalDescontado * iva.Porcentaje / 100, 2);

            detalle.Total = detalle.Sub_total + detalle.Valor_iva;

            if (!string.IsNullOrEmpty(adicional))
            {
                detalle.Adicional = adicional;
            }

            factura.Valor_iva += detalle.Valor_iva;
            factura.Valor_ice += detalle.Valor_ice;
            factura.Valor_irbpnr += detalle.Valor_irbpnr;

            factura.Total_descuento += detalle.Descuento;
            factura.Total += detalle.Total;

            factura.Detalle_factura.Add(detalle);

            //ActutalizarTotales(factura);

            if (factura.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL && factura.Clientes.identificacion == EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL)
            {
                return $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, permitido a Consumidor Final";
            }

            //Realizar control de inventario
            //if (factura.Emisor.control_inventario)
            //{
            var controlStock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == factura.Puntos_emisior.id_bodega);

            if (controlStock != null)
            {
                //Restar el resultado de la resta de la nueva cantidad menos el valor ya registrado en el detalle
                controlStock.stock -= (nuevacantidad - cantidadDetalleOriginal);
            }
            //}

            db.SaveChanges();

            return null;
        }

        public string ActualizarDetalle(int id, int idFactura, int idEmisor, decimal nuevoPrecio, int nuevacantidad, decimal porcentajeDescuento, string adicional)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return "No existe la factura";
            }

            var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return "No existe el detalle de la factura a actualizar";
            }

            var idControlInventarioProducto = 0;
            var cantidadDetalleOriginal = detalle.Cantidad;

            //Realizar control de inventario
            /*if (factura.Emisor.control_inventario)
            {
                //Validar que exista stock
                var stock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == factura.Puntos_emisior.id_bodega);

                if (stock == null)
                {
                    return "No existe stock disponible para este producto";
                }

                //Sumar el stock actual mas la cantidad que ya existe en el detalle de la factura
                if ((stock.stock + detalle.Cantidad) < nuevacantidad)
                {
                    return "El stock del producto es insuficiente";
                }

                idControlInventarioProducto = stock.id;
            }*/

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            var precioSinIva = nuevoPrecio / (1 + (iva.Porcentaje / 100));
            var subtotalSinIva = precioSinIva * nuevacantidad;

            detalle.Precio_unitario = Decimal.Round(precioSinIva, 2);
            detalle.Decuento_porcentaje = porcentajeDescuento;
            detalle.Cantidad = nuevacantidad;

            detalle.Sub_total = Decimal.Round(subtotalSinIva, 2);

            var subTotalDescontado = subtotalSinIva - (subtotalSinIva * (detalle.Decuento_porcentaje / 100));

            detalle.Descuento = Decimal.Round(subtotalSinIva * (detalle.Decuento_porcentaje / 100), 2);

            detalle.Sub_total -= detalle.Descuento;

            detalle.Valor_ice = Decimal.Round(subTotalDescontado * ice.Porcentaje / 100, 2);
            detalle.Valor_irbpnr = Decimal.Round(subTotalDescontado * irbpnr.Porcentaje / 100, 2);

            detalle.Valor_iva = Decimal.Round(subTotalDescontado * iva.Porcentaje / 100, 2);

            detalle.Total = detalle.Sub_total + detalle.Valor_iva;

            if (!string.IsNullOrEmpty(adicional))
            {
                detalle.Adicional = adicional;
            }

            ActutalizarTotales(factura);

            if (factura.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL && factura.Clientes.identificacion == EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL)
            {
                return $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, permitido a Consumidor Final";
            }

            //Realizar control de inventario
            //if (factura.Emisor.control_inventario)
            //{
            var controlStock = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == factura.Puntos_emisior.id_bodega);

            if (controlStock != null)
            {
                //Restar el resultado de la resta de la nueva cantidad menos el valor ya registrado en el detalle
                controlStock.stock -= (nuevacantidad - cantidadDetalleOriginal);
            }
            //}

            db.SaveChanges();

            return null;
        }

        //public void ActualizarAdicionalDetalle(int id, int idFactura, int idEmisor, string adicional)
        //{
        //    var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
        //    if (factura == null)
        //    {
        //        return;
        //    }

        //    var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
        //    if (detalle == null && adicional != null)
        //    {
        //        return;
        //    }
        //    detalle.Adicional = adicional;

        //    db.SaveChanges();
        //}

        //public void ActualizarPrecioDetalle(int id, int idFactura, int idEmisor, decimal nuevoPrecio)
        //{
        //    var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
        //    if (factura == null)
        //    {
        //        return;
        //    }

        //    var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
        //    if (detalle == null)
        //    {
        //        return;
        //    }

        //    var iva = detalle.Producto.Porcentaje_impuesto_producto2;
        //    var ice = detalle.Producto.Porcentaje_impuesto_producto;
        //    var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

        //    detalle.Precio_unitario = nuevoPrecio;
        //    detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
        //    detalle.Descuento = detalle.Sub_total * (detalle.Decuento_porcentaje / 100);
        //    detalle.Sub_total -= detalle.Descuento;
        //    detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
        //    detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
        //    detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
        //    detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
        //    ActutalizarTotales(factura);
        //    db.SaveChanges();
        //}

        public void ActualizarFecha(int idFactura, DateTime nuevaFecha, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            factura.Fecha_emision = nuevaFecha;
            factura.fecha_modificacion = DateTime.Now;
            db.SaveChanges();
        }

        //public void ActualizarCantidadDetalle(int id, int idFactura, int idEmisor, int nuevaCantidad)
        //{
        //    var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
        //    if (factura == null)
        //    {
        //        return;
        //    }

        //    var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
        //    if (detalle == null)
        //    {
        //        return;
        //    }

        //    var iva = detalle.Producto.Porcentaje_impuesto_producto2;
        //    var ice = detalle.Producto.Porcentaje_impuesto_producto;
        //    var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

        //    detalle.Cantidad = nuevaCantidad;
        //    detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
        //    detalle.Descuento = detalle.Sub_total * (detalle.Decuento_porcentaje / 100);
        //    detalle.Sub_total -= detalle.Descuento;
        //    detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
        //    detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
        //    detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
        //    detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
        //    ActutalizarTotales(factura);
        //    db.SaveChanges();
        //}

        //public void ActualizarPorcentajeDescuentoDetalle(int id, int idFactura, int idEmisor, decimal porcentaje)
        //{
        //    var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
        //    if (factura == null)
        //    {
        //        return;
        //    }

        //    var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
        //    if (detalle == null)
        //    {
        //        return;
        //    }

        //    var iva = detalle.Producto.Porcentaje_impuesto_producto2;
        //    var ice = detalle.Producto.Porcentaje_impuesto_producto;
        //    var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

        //    detalle.Decuento_porcentaje = porcentaje;
        //    detalle.Descuento = detalle.Sub_total * (porcentaje / 100);
        //    detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
        //    detalle.Sub_total -= detalle.Descuento;
        //    detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
        //    detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
        //    detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
        //    detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
        //    ActutalizarTotales(factura);
        //    db.SaveChanges();
        //}

        public void EliminarDetalle(int id, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            var detalle = factura.Detalle_factura.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            //Restaurar stock
            //if (factura.Emisor.control_inventario)
            // {
            var controlInventario = db.Productos_x_bodega.FirstOrDefault(x => x.id_producto == detalle.id_producto && x.id_bodega == factura.Puntos_emisior.id_bodega);

            if (controlInventario != null)
            {
                var control = db.Productos_x_bodega.Find(controlInventario.id);
                control.stock += detalle.Cantidad;
            }
            // }

            db.Detalle_factura.Remove(detalle);
            ActutalizarTotales(factura);
            db.SaveChanges();
        }

        private void ActutalizarTotales(Factura factura)
        {
            factura.Subtotal_sin_impuestos = 0;
            factura.Subtotal_iva_cero = 0;
            factura.Subtotal_iva = 0;
            factura.Subtotal_no_objeto_iva = 0;
            factura.Subtotal_excento_iva = 0;
            factura.Subtotal_ice = 0;
            factura.Subtotal_irbpnr = 0;
            factura.Valor_iva = 0;
            factura.Valor_ice = 0;
            factura.Valor_irbpnr = 0;

            factura.Total_descuento = 0;
            factura.Total = 0;

            foreach (var detalle in factura.Detalle_factura.ToList())
            {
                var iva = detalle.Producto.Porcentaje_impuesto_producto2;
                factura.Subtotal_sin_impuestos += detalle.Sub_total;

                if (detalle.Valor_iva > 0)
                {
                    factura.Subtotal_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    factura.Subtotal_iva_cero += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    factura.Subtotal_no_objeto_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    factura.Subtotal_excento_iva += detalle.Sub_total;
                }
                if (detalle.Valor_ice > 0)
                {
                    factura.Subtotal_ice += detalle.Sub_total;
                }

                if (detalle.Valor_irbpnr > 0)
                {
                    factura.Subtotal_irbpnr += detalle.Sub_total;
                }
                factura.Valor_iva += detalle.Valor_iva;
                factura.Valor_ice += detalle.Valor_ice;
                factura.Valor_irbpnr += detalle.Valor_irbpnr;

                factura.Total_descuento += detalle.Descuento;
                factura.Total += detalle.Total;
            }
        }

        public void ActualizarTotalesFinalizada(int id, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (factura == null || factura.Estado == EnumEstadosComprobante.ANULADO || factura.Estado == EnumEstadosComprobante.AUTORIZADO)
            {
                return;
            }

            // Recalcular valores
            ActutalizarTotales(factura);

            // Actualizar pagos
            if (factura.Detalle_pago_Factura.Count > 0)
            {
                var pago = db.Detalle_pago_Factura.Find(factura.Detalle_pago_Factura.ToList()[0].id);
                pago.Valor = factura.Total;
            }

            db.SaveChanges();
        }

        public void AnularFactura(int id, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (factura == null || factura.Estado == EnumEstadosComprobante.ANULADO)
            {
                return;
            }

            factura.Estado = EnumEstadosComprobante.ANULADO;
            db.SaveChanges();
        }

        public void AgregarPago(ModeloFacturaPago modeloPago, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            factura.Detalle_pago_Factura.Add(new Detalle_pago_Factura
            {
                id_form_pago = modeloPago.IdFormaPago,
                Plazo = modeloPago.Plazo,
                Timpo = modeloPago.Tiempo,
                Valor = modeloPago.Valor
            });
            factura.Estado = EnumEstadosComprobante.PAGADO;
            db.SaveChanges();
        }
        public void EliminarPago(int id, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            var detalle = factura.Detalle_pago_Factura.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }
            factura.Detalle_pago_Factura.Remove(detalle);
            db.Detalle_pago_Factura.Remove(detalle);
            if (!factura.Detalle_pago_Factura.Any())
            {
                factura.Estado = EnumEstadosComprobante.PENDIENTE;
            }
            db.SaveChanges();
        }

        public void ActualizarCliente(int idCliente, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            if (db.Clientes.FirstOrDefault(x => x.id == idCliente && x.id_emisor == idEmisor) != null)
            {
                factura.id_cliente = idCliente;
                db.SaveChanges();
            }
        }

        public void ActualizarAConsumidorFinal(int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }
            factura.id_cliente = EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            db.SaveChanges();
        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            factura.Datos_Adicionales_Factura.Add(new Datos_Adicionales_Factura
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idFactura, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            var detalle = factura.Datos_Adicionales_Factura.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Factura.Remove(detalle);
            db.SaveChanges();
        }

        public void CambiarPuntoEmision(int idFactura, int idPuntoEmision, int idEmisor)
        {
            var factura = db.Factura.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }

            if (db.Puntos_emisior.Any(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision))
            {
                factura.id_punto_emison = idPuntoEmision;
                db.SaveChanges();
            }
        }

        public bool GenerarXml(Factura modelo)
        {
            var xml = GenerarXmlFacturaStr(modelo);

            if (xml == null)
            {
                return false;
            }
            var documentoElectronico = new Documentos_Electronicos();
            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.FACTURA);
            documentoElectronico.id_comprobante = modelo.id;
            documentoElectronico.id_tipo_comprobante = tipoDocumento.id;
            documentoElectronico.xml_generado = xml.ToString();
            db.Documentos_Electronicos.Add(documentoElectronico);
            db.SaveChanges();

            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.FACTURA });
            db.SaveChanges();
            return true;
        }

        public bool RegenerarXml(Factura modelo, int idDocumento)
        {
            var documentoElectronico = db.Documentos_Electronicos.Find(idDocumento);

            if (documentoElectronico == null)
            {
                return false;
            }

            // Generar nuevamente el xml
            var xml = GenerarXmlFacturaStr(modelo);

            if (xml == null)
            {
                return false;
            }

            // Modificar xml
            documentoElectronico.xml_generado = xml.ToString();
            db.SaveChanges();

            return true;
        }

        private XDocument GenerarXmlFacturaStr(Factura modelo)
        {
            var emisor = modelo.Emisor;

            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.FACTURA);
            var ivaActual = emisor.Porcentaje_impuesto_producto;
            var ivaCero = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.IvaCeroId);
            var ivaExcento = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.ExcentoIva);
            var ivaNoOnjeto = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.NoObjetoIva);
            var impuestoIva = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IVA);
            var impuestoIce = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.ICE);
            var impuestoIrvpnr = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IRBPNR);

            if (emisor == null || tipoDocumento == null || ivaActual == null || ivaCero == null || ivaExcento == null || ivaNoOnjeto == null)
            {
                return null;
            }
            try
            {
                var xml = new XElement("factura", new XAttribute("id", "comprobante"), new XAttribute("version", "1.1.0"));
                var trib = new XElement("infoTributaria");
                trib.Add(new XElement("ambiente", emisor.Tipo_ambientes.Codigo_ambiente));
                trib.Add(new XElement("tipoEmision", EnumTiposEmision.NORMAL));
                trib.Add(new XElement("razonSocial", CompartidaBusiness.CleanText(emisor.Razon_social)));
                trib.Add(new XElement("nombreComercial", CompartidaBusiness.CleanText(emisor.Nombre_comercial)));
                trib.Add(new XElement("ruc", emisor.Ruc));
                trib.Add(new XElement("claveAcceso", modelo.Clave_de_Acceso));
                trib.Add(new XElement("codDoc", tipoDocumento.Codigo_doc));
                var numero = modelo.Numero.Split('-');
                trib.Add(new XElement("estab", modelo.Puntos_emisior.Numero_establecimiento));
                trib.Add(new XElement("ptoEmi", modelo.Puntos_emisior.Numero_emision));
                trib.Add(new XElement("secuencial", numero[2]));
                trib.Add(new XElement("dirMatriz", CompartidaBusiness.CleanText(emisor.Direccion_matriz)));
                xml.Add(trib);

                var fact = new XElement("infoFactura");
                fact.Add(new XElement("fechaEmision", modelo.Fecha_emision.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("dirEstablecimiento", CompartidaBusiness.CleanText(modelo.Puntos_emisior.Direccion)));
                fact.Add(new XElement("obligadoContabilidad", emisor.Obligado_conta ? "SI" : "NO"));

                fact.Add(new XElement("tipoIdentificacionComprador", modelo.Clientes.Tipo_Identificacion1.Codigo));
                fact.Add(new XElement("razonSocialComprador", CompartidaBusiness.CleanText(modelo.Clientes.nombre_cliente)));
                fact.Add(new XElement("identificacionComprador", modelo.Clientes.identificacion));
                fact.Add(new XElement("direccionComprador", !string.IsNullOrEmpty(modelo.Clientes.Direccion) ? CompartidaBusiness.CleanText(modelo.Clientes.Direccion) : "SIN DIRECCION"));
                fact.Add(new XElement("totalSinImpuestos", modelo.Subtotal_sin_impuestos));
                fact.Add(new XElement("totalDescuento", modelo.Total_descuento));

                var impustosFactura = new XElement("totalConImpuestos");


                if (modelo.Valor_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaActual.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_iva));
                    itemIva.Add(new XElement("valor", modelo.Valor_iva));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_iva_cero > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaCero.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_iva_cero));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_excento_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_excento_iva));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_no_objeto_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaNoOnjeto.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_no_objeto_iva));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }

                //Impuesto ICE
                if (modelo.Valor_ice > 0)
                {
                    var conn = db.Database.Connection;
                    conn.Open();
                    var cmd = conn.CreateCommand();
                    cmd.CommandText = $"select ip.Codigo,i.Codigo,cast(i.Porcentaje as decimal(10,2)),sum(d.Sub_total),sum(d.Valor_ice) from Factura f, Detalle_factura d, Porcentaje_impuesto_producto i, Producto p, Impuestos_producto ip " +
                        $"where f.id = {modelo.id} " +
                        $"and f.id = d.id_Factura " +
                        $"and d.id_producto = p.id " +
                        $"and p.Codigo_ice = i.id " +
                        $"and i.Id_impuesto = ip.id " +
                        $"and d.Valor_ice > 0 " +
                        $"group by ip.Codigo,i.Codigo,i.Porcentaje";
                    // Dictionary<int, string> dict = new Dictionary<int, string>();
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            var itemIce = new XElement("totalImpuesto");
                            itemIce.Add(new XElement("codigo", rdr.GetString(0)));
                            itemIce.Add(new XElement("codigoPorcentaje", rdr.GetString(1)));
                            itemIce.Add(new XElement("baseImponible", rdr.GetDecimal(3)));
                            itemIce.Add(new XElement("valor", rdr.GetDecimal(4)));
                            impustosFactura.Add(itemIce);
                        }
                    }
                }

                /*Impuesto IRBPNR
                if (modelo.Valor_irbpnr > 0)
                {
                    var itemIrbpnr = new XElement("impuesto");
                    itemIrbpnr.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIrbpnr.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                    itemIrbpnr.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                    itemIrbpnr.Add(new XElement("baseImponible", detalleFactura.Sub_total));
                    itemIrbpnr.Add(new XElement("valor", detalleFactura.Total));
                    impustosFactura.Add(itemIrbpnr);
                }

                */
                fact.Add(impustosFactura);

                fact.Add(new XElement("propina", modelo.Propina));
                fact.Add(new XElement("importeTotal", modelo.Total));
                fact.Add(new XElement("moneda", "USD"));

                //Payment
                var pay = new XElement("pagos");
                foreach (var pago in modelo.Detalle_pago_Factura.ToList())
                {
                    var detallePago = new XElement("pago");
                    detallePago.Add(new XElement("formaPago", pago.Formas_de_Pago.Codigo));
                    detallePago.Add(new XElement("total", pago.Valor));
                    pay.Add(detallePago);
                }

                fact.Add(pay);

                xml.Add(fact);

                var items = new XElement("detalles");
                foreach (var detalleFactura in modelo.Detalle_factura.ToList())
                {
                    var detalle = new XElement("detalle");
                    detalle.Add(new XElement("codigoPrincipal", CompartidaBusiness.CleanText(detalleFactura.Producto.Codigo)));

                    // Si es igual a referencia, colocar el texto de adicional
                    if (detalleFactura.Producto.Nombre.Equals("REFERENCIA") && !String.IsNullOrEmpty(detalleFactura.Adicional))
                    {
                        detalle.Add(new XElement("descripcion", CompartidaBusiness.CleanText(detalleFactura.Adicional)));
                    }
                    else
                    {
                        detalle.Add(new XElement("descripcion", CompartidaBusiness.CleanText(detalleFactura.Producto.Nombre)));
                    }

                    detalle.Add(new XElement("cantidad", detalleFactura.Cantidad));
                    detalle.Add(new XElement("precioUnitario", detalleFactura.Precio_unitario));
                    detalle.Add(new XElement("descuento", detalleFactura.Descuento));
                    detalle.Add(new XElement("precioTotalSinImpuesto", detalleFactura.Sub_total));

                    if (detalleFactura.Adicional != null && detalleFactura.Adicional.Trim().Length > 0)
                    {
                        var adicionales = new XElement("detallesAdicionales");
                        adicionales.Add(new XElement("detAdicional", new XAttribute("nombre", "adicional"), new XAttribute("valor", detalleFactura.Adicional)));
                        detalle.Add(adicionales);
                    }

                    var impuestosProducto = new XElement("impuestos");
                    var ivaProducto = detalleFactura.Producto.Porcentaje_impuesto_producto2;
                    var iceProducto = detalleFactura.Producto.Porcentaje_impuesto_producto;
                    var irbpnrProducto = detalleFactura.Producto.Porcentaje_impuesto_producto1;


                    //Impuesto IVA
                    var itemIva = new XElement("impuesto");
                    if (detalleFactura.Valor_iva > 0)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaProducto.Codigo));
                        itemIva.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.IvaCeroId)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaCero.Codigo));
                        itemIva.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.NoObjetoIva)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaNoOnjeto.Codigo));
                        itemIva.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.ExcentoIva)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                        itemIva.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                    }
                    itemIva.Add(new XElement("baseImponible", detalleFactura.Sub_total));
                    itemIva.Add(new XElement("valor", detalleFactura.Valor_iva));
                    impuestosProducto.Add(itemIva);

                    //Impuesto ICE
                    if (detalleFactura.Valor_ice > 0)
                    {
                        var itemIce = new XElement("impuesto");
                        itemIce.Add(new XElement("codigo", impuestoIce.Codigo));
                        itemIce.Add(new XElement("codigoPorcentaje", iceProducto.Codigo));
                        itemIce.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                        itemIce.Add(new XElement("baseImponible", detalleFactura.Sub_total));
                        itemIce.Add(new XElement("valor", detalleFactura.Valor_ice));
                        impuestosProducto.Add(itemIce);
                    }

                    //Impuesto IRBPNR
                    if (detalleFactura.Valor_irbpnr > 0)
                    {
                        var itemIrbpnr = new XElement("impuesto");
                        itemIrbpnr.Add(new XElement("codigo", impuestoIrvpnr.Codigo));
                        itemIrbpnr.Add(new XElement("codigoPorcentaje", irbpnrProducto.Codigo));
                        itemIrbpnr.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                        itemIrbpnr.Add(new XElement("baseImponible", detalleFactura.Sub_total));
                        itemIrbpnr.Add(new XElement("valor", detalleFactura.Valor_irbpnr));
                        impuestosProducto.Add(itemIrbpnr);
                    }

                    detalle.Add(impuestosProducto);

                    items.Add(detalle);
                }

                xml.Add(items);
                var extra = new XElement("infoAdicional");
                foreach (var adicional in modelo.Datos_Adicionales_Factura.ToList())
                {
                    extra.Add(new XElement("campoAdicional", adicional.Descripcion, new XAttribute("nombre", adicional.Nombre)));
                    xml.Add(extra);
                }

                return new XDocument(xml);
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idFactura)
        {
            try
            {
                var envioEmail = false;
                var factura = db.Factura.Find(idFactura);

                if (factura == null)
                {
                    db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar factura electronica, id factura: {idFactura} no existe" });
                    db.SaveChanges();
                    return;
                }

                // Generar xml de factura
                var xmlFacturaCreado = this.RegenerarXml(factura, idDocumento);

                var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == factura.id && x.id_documento_electronico == idDocumento);

                if (factura == null || comprobanteCola == null)
                {
                    return;
                }

                if (comprobanteBusiness.FirmarXml(idDocumento, factura.id_emisor))
                {
                    Documentos_Electronicos documento;
                    try
                    {
                        documento = db.Documentos_Electronicos.Find(idDocumento);
                    }
                    catch
                    {
                        return;
                    }
                    var respuesta = comprobanteBusiness.EnviarXml(factura.id_emisor);
                    if (respuesta.Recibido)
                    {
                        Thread.Sleep(5000);
                        var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(factura.id_emisor, factura.Clave_de_Acceso);
                        if (autorizacion.Autorizado)
                        {
                            documento.xml_retornado = autorizacion.Xml;
                            factura.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                            documento.fecha_modificacion = DateTime.Now;
                            factura.Estado = EnumEstadosComprobante.AUTORIZADO;
                            documento.ride = GenerarRide(factura);
                            if (comprobanteCola != null)
                            {
                                db.Cola_envio_comprobantes.Remove(comprobanteCola);
                            }
                            envioEmail = true;
                        }
                        else
                        {
                            documento.mensajes = autorizacion.Mensaje;
                            documento.fecha_modificacion = DateTime.Now;
                            if (!autorizacion.Estado.Equals("EXCEPCION") && comprobanteCola != null)
                            {
                                db.Cola_envio_comprobantes.Remove(comprobanteCola);
                            }
                        }

                        db.SaveChanges();
                        if (envioEmail)
                        {
                            emailBusiness.EnviarEmailFactura(idFactura, idDocumento);
                        }

                        return;
                    }
                    else
                    {
                        documento.mensajes = respuesta.Mensajes;
                        documento.fecha_modificacion = DateTime.Now;
                        if (!respuesta.Estado.Equals("EXCEPCION") && comprobanteCola != null)
                        {
                            db.Cola_envio_comprobantes.Remove(comprobanteCola);
                        }

                        db.SaveChanges();
                        return;
                    }
                }
            }
            catch (Exception e)
            {
                db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar factura electronica, id factura: {idFactura}, error: {e.Message}" });
                db.SaveChanges();
            }

        }

        public byte[] GenerarRide(Factura factura)
        {
            if (factura == null)
            {
                return new byte[0];
            }

            BaseColor myColor = WebColors.GetRGBColor("#e0e0e0");
            var doc = new Document(PageSize.A4);
            var path = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos) + "Ride.pdf";
            var output = new FileStream(path, FileMode.Create);
            var writer = PdfWriter.GetInstance(doc, output);

            doc.Open();

            var tableHeader = new PdfPTable(2);
            tableHeader.DefaultCell.Border = 0;
            tableHeader.WidthPercentage = 100;

            var subTableHeader = new PdfPTable(1);
            subTableHeader.DefaultCell.Border = 0;
            subTableHeader.WidthPercentage = 100;

            //Adds the logo

            var cellLogo = new PdfPCell { Colspan = 1 };
            cellLogo.BorderColor = BaseColor.WHITE;

            var logoPath = factura.Emisor.Logo;
            if (logoPath != null && !logoPath.IsEmpty())
            {
                try
                {
                    var logo = Image.GetInstance(logoPath);
                    logo.Alignment = Element.ALIGN_CENTER;
                    logo.SetAbsolutePosition(0, 0);
                    logo.ScaleAbsoluteHeight(50);
                    logo.ScaleAbsoluteWidth(50);
                    cellLogo.AddElement(logo);

                }
                catch (Exception)
                {

                }
            }
            subTableHeader.AddCell(cellLogo);
            var cellCompany = new PdfPCell { Colspan = 1 };
            cellCompany.BorderColor = BaseColor.WHITE;
            cellCompany.BackgroundColor = myColor;

            // Company Information
            var companyBussinesNameParagraph =
                new Paragraph(factura.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(factura.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(factura.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companySecundaryAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Sucursal: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(factura.Puntos_emisior.Direccion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companySecundaryAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(factura.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            var companyContrEspecialParagraph = new Paragraph
            {
                new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(factura.Emisor.Cintirbuyente_especial?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyContrEspecialParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (factura.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Numero de Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(factura.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            cellCompany.AddElement(companySecundaryAddressParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(factura.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
            };
            cellCompany.AddElement(adicionalesEmisor);

            cellCompany.AddElement(new Paragraph(" "));

            subTableHeader.AddCell(cellCompany);


            var cellSubTableHeader = new PdfPCell();
            cellSubTableHeader.BorderColor = BaseColor.WHITE;
            cellSubTableHeader.AddElement(subTableHeader);

            tableHeader.AddCell(cellSubTableHeader);

            // Company Invoice
            var cellInvoice = new PdfPCell { Colspan = 1 };
            cellInvoice.BorderColor = BaseColor.WHITE;
            cellInvoice.BackgroundColor = myColor;
            var invoiceTitleParagraph =
                new Paragraph("FACTURA", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceTitleParagraph);

            var invoiceNumberParagraph =
                new Paragraph(factura.Numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceNumberParagraph);

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellInvoice.AddElement(paragraphRuc);

            cellInvoice.AddElement(new Paragraph("Número de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(factura.Clave_de_Acceso, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
            cellInvoice.AddElement(new Paragraph("Fecha y Hora de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(factura.fecha_autorizacion.Value.ToString("dd/MM/yyyy HH:mm:ss"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10)));
            var paragraphEnvironment = new Paragraph
            {
                new Chunk("Ambiente: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Emisor.Tipo_ambientes.Descripcion_ambiente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellInvoice.AddElement(paragraphEnvironment);

            var paragraphEmission = new Paragraph
            {
                new Chunk("Emisión: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk("NORMAL", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellInvoice.AddElement(paragraphEmission);

            cellInvoice.AddElement(new Paragraph(" "));

            //Code Bar with Access Key
            var accessKeyParagraph =
                new Paragraph("CLAVE DE ACCESO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(accessKeyParagraph);
            var barcode39 = new Barcode128 { Code = factura.Clave_de_Acceso };
            var cb = new PdfContentByte(writer);
            var code39Image = barcode39.CreateImageWithBarcode(cb, null, null);
            code39Image.ScaleAbsoluteWidth(200);
            code39Image.Alignment = Element.ALIGN_CENTER;
            cellInvoice.AddElement(code39Image);
            cellInvoice.AddElement(new Paragraph(" "));

            tableHeader.AddCell(cellInvoice);

            doc.Add(tableHeader);

            doc.Add(new Paragraph(" "));

            // Customer Information
            var tableCustomer = new PdfPTable(2);
            tableCustomer.DefaultCell.Border = Rectangle.NO_BORDER;
            tableCustomer.DefaultCell.Border = 0;
            tableCustomer.WidthPercentage = 100;

            var cellCustomer = new PdfPCell();
            cellCustomer.BorderColor = BaseColor.WHITE;
            cellCustomer.BackgroundColor = myColor;
            var paragraphDate = new Paragraph
            {
                new Chunk("Fecha de Emision: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Fecha_emision.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            tableCustomer.AddCell(cellCustomer);

            var cellCustomer2 = new PdfPCell();
            cellCustomer2.BorderColor = BaseColor.WHITE;
            cellCustomer2.BackgroundColor = myColor;


            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(paragraphCustomerAddress);

            var clienteTelefono = new Paragraph
            {
                new Chunk("Telefono: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Clientes.telefono_movil??"SIN NUMERO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteTelefono);

            var clienteCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(factura.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteCorreo);

            tableCustomer.AddCell(cellCustomer2);
            doc.Add(tableCustomer);

            doc.Add(new Paragraph(" "));

            var tableDetails = new PdfPTable(8);
            tableDetails.DefaultCell.Border = 0;
            tableDetails.WidthPercentage = 100;
            tableDetails.SetWidths(new float[] { 15f, 30f, 30f, 30f, 30f, 30f, 30f, 30f });

            var cellIndex = new PdfPCell();
            cellIndex.BorderColor = BaseColor.WHITE;
            cellIndex.BackgroundColor = myColor;
            cellIndex.AddElement(new Paragraph("Orden", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellIndex);

            var cellCode = new PdfPCell();
            cellCode.BorderColor = BaseColor.WHITE;
            cellCode.BackgroundColor = myColor;
            cellCode.AddElement(new Paragraph("Cod. Principal", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellCode);

            var cellDescr = new PdfPCell();
            cellDescr.BorderColor = BaseColor.WHITE;
            cellDescr.BackgroundColor = myColor;
            cellDescr.AddElement(new Paragraph("Descripción", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellDescr);

            var cellAdic = new PdfPCell();
            cellAdic.BorderColor = BaseColor.WHITE;
            cellAdic.BackgroundColor = myColor;
            cellAdic.AddElement(new Paragraph("Adicional", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellAdic);

            var cellPrec = new PdfPCell();
            cellPrec.BorderColor = BaseColor.WHITE;
            cellPrec.BackgroundColor = myColor;
            cellPrec.AddElement(new Paragraph("Precio Unit", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellPrec);

            var cellQty = new PdfPCell();
            cellQty.BorderColor = BaseColor.WHITE;
            cellQty.BackgroundColor = myColor;
            cellQty.AddElement(new Paragraph("Cant", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellQty);

            var cellDesc = new PdfPCell();
            cellDesc.BorderColor = BaseColor.WHITE;
            cellDesc.BackgroundColor = myColor;
            cellDesc.AddElement(new Paragraph("Descuento", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellDesc);

            var cellTotal = new PdfPCell();
            cellTotal.BorderColor = BaseColor.WHITE;
            cellTotal.BackgroundColor = myColor;
            cellTotal.AddElement(new Paragraph("Precio Total", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellTotal);

            int i = 1;
            foreach (var detail in factura.Detalle_factura.ToList())
            {

                var index = new PdfPCell();
                index.BorderColor = BaseColor.WHITE;
                index.BackgroundColor = BaseColor.WHITE; ;
                index.AddElement(new Paragraph(i.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(index);
                i++;

                var code = new PdfPCell();
                code.BorderColor = BaseColor.WHITE;
                code.BackgroundColor = BaseColor.WHITE; ;
                code.AddElement(new Paragraph(detail.Producto.Codigo, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(code);

                // Si es igual a referencia, colocar el texto de adicional
                if (detail.Producto.Nombre.Equals("REFERENCIA") && !String.IsNullOrEmpty(detail.Adicional))
                {
                    var descr = new PdfPCell();
                    descr.BorderColor = BaseColor.WHITE;
                    descr.BackgroundColor = BaseColor.WHITE; ;
                    descr.AddElement(new Paragraph(detail.Adicional, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                    tableDetails.AddCell(descr);

                    var adic = new PdfPCell();
                    adic.BorderColor = BaseColor.WHITE;
                    adic.BackgroundColor = BaseColor.WHITE; ;
                    adic.AddElement(new Paragraph("", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                    tableDetails.AddCell(adic);
                }
                else
                {
                    var descr = new PdfPCell();
                    descr.BorderColor = BaseColor.WHITE;
                    descr.BackgroundColor = BaseColor.WHITE; ;
                    descr.AddElement(new Paragraph(detail.Producto.Nombre, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                    tableDetails.AddCell(descr);

                    var adic = new PdfPCell();
                    adic.BorderColor = BaseColor.WHITE;
                    adic.BackgroundColor = BaseColor.WHITE; ;
                    adic.AddElement(new Paragraph(detail.Adicional ?? "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                    tableDetails.AddCell(adic);
                }

                var price = new PdfPCell();
                price.BorderColor = BaseColor.WHITE;
                price.BackgroundColor = BaseColor.WHITE; ;
                price.AddElement(new Paragraph(detail.Precio_unitario + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(price);

                var qty = new PdfPCell();
                qty.BorderColor = BaseColor.WHITE;
                qty.BackgroundColor = BaseColor.WHITE; ;
                qty.AddElement(new Paragraph(detail.Cantidad.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(qty);

                var discount = new PdfPCell();
                discount.BorderColor = BaseColor.WHITE;
                discount.BackgroundColor = BaseColor.WHITE; ;
                discount.AddElement(new Paragraph(detail.Descuento + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(discount);

                var total = new PdfPCell();
                total.BorderColor = BaseColor.WHITE;
                total.BackgroundColor = BaseColor.WHITE; ;
                total.AddElement(new Paragraph(detail.Sub_total + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tableDetails.AddCell(total);
            }

            doc.Add(tableDetails);
            doc.Add(new Paragraph(" "));

            //Total
            var tableTotal = new PdfPTable(2);
            tableTotal.DefaultCell.Border = 0;
            tableTotal.WidthPercentage = 100;

            //Informacion adicional
            var aditionalCell = new PdfPCell();
            aditionalCell.BorderColor = BaseColor.WHITE;
            aditionalCell.BackgroundColor = myColor;

            aditionalCell.AddElement(new Paragraph(" "));
            aditionalCell.AddElement(new Paragraph("Información Adicional", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            foreach (var adicional in factura.Datos_Adicionales_Factura.ToList())
            {
                var paragraphExtra = new Paragraph
            {
                new Chunk(adicional.Nombre+": ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(adicional.Descripcion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
                aditionalCell.AddElement(paragraphExtra);

            }
            aditionalCell.AddElement(new Paragraph(" "));

            //Payment
            aditionalCell.AddElement(new Paragraph("Forma de Pago", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            foreach (var payemnt in factura.Detalle_pago_Factura.ToList())
            {
                var paragraphPayment = new Paragraph
                {
                    new Chunk(payemnt.Formas_de_Pago.Descripcion_form_pago+": ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(payemnt.Valor+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                aditionalCell.AddElement(paragraphPayment);
            }
            aditionalCell.AddElement(new Paragraph(" "));
            tableTotal.AddCell(aditionalCell);

            var totalTable = new PdfPTable(2);
            totalTable.SetWidths(new float[] { 7f, 3f });

            var totalCellData = new PdfPCell();
            totalCellData.BorderColor = BaseColor.WHITE;
            totalCellData.BackgroundColor = myColor;
            totalCellData.HorizontalAlignment = Element.ALIGN_RIGHT;

            var totalCellLabel = new PdfPCell();
            totalCellLabel.BorderColor = BaseColor.WHITE;
            totalCellLabel.BackgroundColor = BaseColor.WHITE;

            var paragraphSubTaxZero = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA 0%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphSubTaxZero);

            var paragraphSubTaxZeroVal = new Paragraph
                    {
                        new Chunk(factura.Subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(factura.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(factura.Subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(factura.Subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(factura.Subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(factura.Subtotal_sin_impuestos+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphSubWithOutTaxVal);

            var paragraphDiuscount = new Paragraph
            {
                new Chunk("DESCUENTO: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphDiuscount);

            var paragraphDiuscountVal = new Paragraph
            {
                new Chunk(factura.Total_descuento+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            totalCellData.AddElement(paragraphDiuscountVal);


            var paragraphIvaValue = new Paragraph
                {
                    new Chunk("IVA "+Math.Round(factura.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                };
            totalCellLabel.AddElement(paragraphIvaValue);

            var paragraphIvaValueVal = new Paragraph
                {
                   new Chunk(factura.Valor_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIvaValueVal);

            var paragraphIceValue = new Paragraph
                {
                    new Chunk("ICE: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIceValue);

            var paragraphIceValueVal = new Paragraph
                {
                    new Chunk(factura.Valor_ice+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIceValueVal);


            var paragraphIRBPNRValue = new Paragraph
                {
                    new Chunk("IRBPNR: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIRBPNRValue);

            var paragraphIRBPNRValueVal = new Paragraph
                {
                    new Chunk(factura.Valor_irbpnr+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIRBPNRValueVal);


            var paragraphTip = new Paragraph
            {
                new Chunk("PROPINA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTip);

            var paragraphTipVal = new Paragraph
            {
                new Chunk(factura.Propina+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphTipVal);

            var paragraphTotal = new Paragraph
            {
                new Chunk("VALOR TOTAL: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTotal);

            var paragraphTotalVal = new Paragraph
            {
                new Chunk(factura.Total+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphTotalVal);

            totalTable.AddCell(totalCellLabel);
            totalTable.AddCell(totalCellData);

            var totalTableCell = new PdfPCell();
            totalTableCell.BorderColor = BaseColor.WHITE;
            totalTableCell.AddElement(totalTable);

            tableTotal.AddCell(totalTableCell);
            doc.Add(tableTotal);

            doc.Close();
            return File.ReadAllBytes(path);
        }


    }

}