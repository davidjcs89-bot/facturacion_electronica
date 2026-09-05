using Facturacion_Electronica.Models.Pedido;
using iTextSharp.text;
using iTextSharp.text.html;
using iTextSharp.text.pdf;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using System.Web.WebPages;

namespace Facturacion_Electronica.Business
{
    public class PedidoBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();

        public List<Pedido> BuscarPedidos(ModeloBuscarPedido modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Pedido>();

            if (ultimos)
            {
                return db.Pedido.Where(x => x.id_emisor == IdEmisor && x.Estado == EnumEstadosComprobante.PENDIENTE).OrderByDescending(x => x.id).Take(20).ToList();
            }

            listado = db.Pedido.Where(x => x.id_emisor == IdEmisor).ToList();
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
            if (modeloBuscar.BuscarPorCodigoCliente != null && modeloBuscar.BuscarPorCodigoCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.codigo == modeloBuscar.BuscarPorCodigoCliente).ToList();
            }
            else if (modeloBuscar.BuscarPorNombreCliente != null && modeloBuscar.BuscarPorNombreCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.nombre_cliente.ToUpper().Contains(modeloBuscar.BuscarPorNombreCliente.ToUpper())).ToList();
            }
            return listado;
        }

        public int GuardarPedido(ModeloPedido modelo, int idEmisor)
        {

            var contadorPedidos = db.Pedido.Count(x=>x.id_cliente == modelo.Cliente.Id)+1;

            var cliente = db.Clientes.Find(modelo.Cliente.Id);

            var codigoPedido = "";

            if (cliente == null)
            {
                codigoPedido = contadorPedidos.ToString();
            }
            else
            {
                codigoPedido = cliente.codigo ?? "" + contadorPedidos.ToString();
            }

            var pedido = new Pedido
            {
                id_emisor = idEmisor,
                id_cliente = modelo.Cliente.Id,
                fecha_creacion = DateTime.Now,
                id_punto_emison = modelo.PuntoEmisionId,
                Numero = codigoPedido,
                fecha_modificacion = DateTime.Now,
                Estado = EnumEstadosComprobante.PENDIENTE,
            };
            db.Pedido.Add(pedido);
            db.SaveChanges();
            return pedido.id;
        }

        public ModeloPedido GetModeloPedido(int id, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return null;
            }

            var modelo = new ModeloPedido
            {
                Id = pedido.id,
                Numero = pedido.Numero,
                PuntoEmisionId = pedido.Puntos_emisior.id,
                DireccionSucursal = pedido.Puntos_emisior.Direccion,
                Emisor = emisorBusiness.BuscarEmisor(pedido.id_emisor),
                Cliente = clienteBusiness.GenerarModeloCliente(pedido.id_cliente),
                FechaCreacion = pedido.fecha_creacion.Value.ToString("dd/MM/yyyy HH:mm"),
                FechaModificacion = pedido.fecha_modificacion.Value.ToString("dd/MM/yyyy HH:mm"),
                SubtotalSinImpuestos = pedido.Subtotal_sin_impuestos,
                SubtotalIva = pedido.Subtotal_iva,
                SubtotalIvaCero = pedido.Subtotal_iva_cero,
                SubtotalIce = pedido.Subtotal_ice,
                SubtotalIrbpnr = pedido.Subtotal_irbpnr,
                SubtotalExcentoIva = pedido.Subtotal_excento_iva,
                SubtotalNoObjetoIva = pedido.Subtotal_no_objeto_iva,
                ValorIva = pedido.Valor_iva,
                ValorIce = pedido.Valor_ice,
                ValorIrbpnr = pedido.Valor_irbpnr,
                TotalDescuento = pedido.Total_descuento,
                Total = pedido.Total,
                Estado = pedido.Estado,
                Detalles = new List<ModeloPedidoDetalle>(),
                Abonos = new List<ModeloAbono>(),
                PermiteEditarCliente = pedido.Estado == EnumEstadosComprobante.PENDIENTE,
                PermiteEditarDetalles = pedido.Estado == EnumEstadosComprobante.PENDIENTE
            };

            foreach (var detalle in pedido.Detalle_pedido.ToList())
            {
                var detalleModelo = new ModeloPedidoDetalle
                {
                    Id = detalle.id,
                    Cantidad = detalle.Cantidad,
                    Descuento = detalle.Decuento_porcentaje,
                    ValorDescuento = detalle.Descuento,
                    IdProducto = detalle.id_producto,
                    Producto = productobusiness.GenerarModeloProducto(detalle.id_producto),
                    PrecioUnitario = detalle.Precio_unitario,
                    IvaUnitario = detalle.Valor_iva / detalle.Cantidad,
                    IceUnitrario = detalle.Valor_ice / detalle.Cantidad,
                    IrbpnrUnitario = detalle.Valor_irbpnr / detalle.Cantidad
                };

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

            foreach (var abono in pedido.Abonos_Pedido.ToList())
            {
                modelo.Abonos.Add(new ModeloAbono
                {
                    Id = abono.id,
                    Descripcion = abono.descripcion,
                    Monto = abono.valor,
                    Fecha = abono.fecha.ToString("dd/MM/yyyy HH:mm")
                });
            }

            return modelo;

        }
        public void ActualizarAConsumidorFinal(int id, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return;
            }
            pedido.id_cliente = EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            db.SaveChanges();
        }
        public string AgregarProducto(int idPedido, int idProducto, int cantidad, int idEmisor, bool grabarCambios)
        {
            var producto = db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor);

            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (producto == null || pedido == null)
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

            

            for (int i = 0; i < cantidad; i++)
            {
                var detalle = new Detalle_pedido
                {
                    id_producto = idProducto,
                    Cantidad = 1,
                    Precio_unitario = producto.Precio,
                    Sub_total = producto.Precio * cantidad,
                    Descuento = 0
                };
                detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
                detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
                detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
                detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;

                pedido.Subtotal_sin_impuestos += detalle.Sub_total;
                pedido.Total_descuento += detalle.Descuento;
                if (detalle.Valor_iva > 0)
                {
                    pedido.Subtotal_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    pedido.Subtotal_iva_cero += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    pedido.Subtotal_no_objeto_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    pedido.Subtotal_excento_iva += detalle.Sub_total;
                }

                if (detalle.Valor_ice > 0)
                {
                    pedido.Subtotal_ice += detalle.Sub_total;
                }

                if (detalle.Valor_irbpnr > 0)
                {
                    pedido.Subtotal_irbpnr += detalle.Sub_total;
                }

                pedido.Valor_iva += detalle.Valor_iva;
                pedido.Valor_ice += detalle.Valor_ice;
                pedido.Valor_irbpnr += detalle.Valor_irbpnr;

                pedido.Total_descuento += detalle.Descuento;
                pedido.Total += detalle.Total;

                pedido.Detalle_pedido.Add(detalle);
            }

            if (pedido.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL && pedido.Clientes.identificacion == EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL)
            {
                return $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, permitido a Consumidor Final";
            }

            pedido.fecha_modificacion = DateTime.Now;

            db.SaveChanges();            

            return null;
        }

        public string ActualizarDetalle(int id, int idFactura, int idEmisor, decimal nuevoPrecio, int nuevacantidad, decimal porcentajeDescuento, string adicional)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return "No existe el pedido";
            }

            var detalle = pedido.Detalle_pedido.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return "No existe el detalle del pedido a actualizar";
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

            ActutalizarTotales(pedido);

            if (pedido.Total > EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL && pedido.Clientes.identificacion == EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL)
            {
                return $"El total de la factura sobrepasa los ${EnumDatosGenerales.MONTO_MAXIMO_CONSUMIFOR_FINAL}, permitido a Consumidor Final";
            }

            pedido.fecha_modificacion = DateTime.Now;

            db.SaveChanges();

            return null;
        }

        public void EliminarDetalle(int id, int idPedido, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return;
            }

            var detalle = pedido.Detalle_pedido.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Detalle_pedido.Remove(detalle);
            ActutalizarTotales(pedido);
            db.SaveChanges();
        }
        private void ActutalizarTotales(Pedido pedido)
        {
            pedido.Subtotal_sin_impuestos = 0;
            pedido.Subtotal_iva_cero = 0;
            pedido.Subtotal_iva = 0;
            pedido.Subtotal_no_objeto_iva = 0;
            pedido.Subtotal_excento_iva = 0;
            pedido.Subtotal_ice = 0;
            pedido.Subtotal_irbpnr = 0;
            pedido.Valor_iva = 0;
            pedido.Valor_ice = 0;
            pedido.Valor_irbpnr = 0;

            pedido.Total_descuento = 0;
            pedido.Total = 0;

            foreach (var detalle in pedido.Detalle_pedido.ToList())
            {
                var iva = detalle.Producto.Porcentaje_impuesto_producto2;
                pedido.Subtotal_sin_impuestos += detalle.Sub_total;

                if (detalle.Valor_iva > 0)
                {
                    pedido.Subtotal_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    pedido.Subtotal_iva_cero += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    pedido.Subtotal_no_objeto_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    pedido.Subtotal_excento_iva += detalle.Sub_total;
                }
                if (detalle.Valor_ice > 0)
                {
                    pedido.Subtotal_ice += detalle.Sub_total;
                }

                if (detalle.Valor_irbpnr > 0)
                {
                    pedido.Subtotal_irbpnr += detalle.Sub_total;
                }
                pedido.Valor_iva += detalle.Valor_iva;
                pedido.Valor_ice += detalle.Valor_ice;
                pedido.Valor_irbpnr += detalle.Valor_irbpnr;

                pedido.Total_descuento += detalle.Descuento;
                pedido.Total += detalle.Total;
            }
        }

        public void ActualizarCliente(int idCliente, int idFactura, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idFactura && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return;
            }

            var contadorPedidos = db.Pedido.Count(x => x.id_cliente == idCliente) + 1;

            var cliente = db.Clientes.Find(idCliente);

            var codigoPedido = "";

            if (cliente == null)
            {
                codigoPedido = contadorPedidos.ToString();
            }
            else
            {
                codigoPedido = string.Concat(cliente.codigo ?? "0","-",contadorPedidos.ToString());
            }

            if (db.Clientes.FirstOrDefault(x => x.id == idCliente && x.id_emisor == idEmisor) != null)
            {
                pedido.id_cliente = idCliente;
                pedido.Numero = codigoPedido;
                pedido.fecha_modificacion = DateTime.Now;
                db.SaveChanges();
            }
        }

        public string AgregarAbono(ModeloAbono modelo, int idPedido, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return "No existe el pedido";
            }

            if (modelo.Monto <= 0)
            {
                return "El monto debe ser mayor a cero";
            }

            pedido.Abonos_Pedido.Add(new Abonos_Pedido
            {
                valor = modelo.Monto,
                descripcion = modelo.Descripcion,
                fecha = DateTime.Now
            });

            pedido.fecha_modificacion = DateTime.Now;

            db.SaveChanges();

            return null;
        }

        public void EliminarAbono(int id, int idPedido, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return;
            }

            var detalle = pedido.Abonos_Pedido.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Abonos_Pedido.Remove(detalle);
            pedido.fecha_modificacion = DateTime.Now;
            db.SaveChanges();
        }

        public void FinalizarPedido(int idPedido, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == idPedido && x.id_emisor == idEmisor);
            if (pedido == null)
            {
                return;
            }

            pedido.Estado = EnumEstadosComprobante.FINALIZADO;
            pedido.fecha_modificacion = DateTime.Now;
            db.SaveChanges();

        }

        public void AnularPedido(int id, int idEmisor)
        {
            var pedido = db.Pedido.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (pedido == null || pedido.Estado == EnumEstadosComprobante.ANULADO)
            {
                return;
            }

            pedido.Detalle_pedido = new List<Detalle_pedido>();

            pedido.Estado = EnumEstadosComprobante.ANULADO;
            db.SaveChanges();
        }

        public byte[] GenerarDocumentoPdf(Pedido pedido)
        {
            if (pedido == null)
            {
                return new byte[0];
            }

            BaseColor myColor = WebColors.GetRGBColor("#e0e0e0");
            var doc = new Document(PageSize.A4);
            var path = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos) + "Pedido.pdf";
            var output = new FileStream(path, FileMode.Create);
            var writer = PdfWriter.GetInstance(doc, output);

            doc.Open();

            var tableHeader = new PdfPTable(1);
            tableHeader.DefaultCell.Border = 0;
            tableHeader.WidthPercentage = 100;

            var subTableHeader = new PdfPTable(1);
            subTableHeader.DefaultCell.Border = 0;
            subTableHeader.WidthPercentage = 100;

            //Adds the logo

            var cellLogo = new PdfPCell { Colspan = 1 };
            cellLogo.BorderColor = BaseColor.WHITE;

            var logoPath = pedido.Emisor.Logo;
            if (logoPath != null && !logoPath.IsEmpty())
            {
                try
                {
                    var logo = Image.GetInstance(logoPath);
                    logo.Alignment = Element.ALIGN_CENTER;
                    logo.SetAbsolutePosition(0, 0);
                    logo.ScaleAbsoluteHeight(100);
                    logo.ScaleAbsoluteWidth(100);
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

            var invoiceTitleParagraph =
            new Paragraph("PEDIDO # " + pedido.Numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
            {
                Alignment = Element.ALIGN_CENTER
            };
            cellCompany.AddElement(invoiceTitleParagraph);

            // Company Information
            var companyBussinesNameParagraph =
                new Paragraph(pedido.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(pedido.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellCompany.AddElement(paragraphRuc);

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(pedido.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(pedido.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (pedido.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(pedido.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(pedido.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
            };
            cellCompany.AddElement(adicionalesEmisor);

            cellCompany.AddElement(new Paragraph(" "));

            subTableHeader.AddCell(cellCompany);

            var cellSubTableHeader = new PdfPCell();
            cellSubTableHeader.BorderColor = BaseColor.WHITE;
            cellSubTableHeader.AddElement(subTableHeader);

            tableHeader.AddCell(cellSubTableHeader);

            doc.Add(tableHeader);

            doc.Add(new Paragraph(" "));

            // Customer Information
            var tableCustomer = new PdfPTable(1);
            tableCustomer.DefaultCell.Border = Rectangle.NO_BORDER;
            tableCustomer.DefaultCell.Border = 0;
            tableCustomer.WidthPercentage = 100;

            var cellCustomer = new PdfPCell();
            cellCustomer.BorderColor = BaseColor.WHITE;
            cellCustomer.BackgroundColor = myColor;

            var paragraphDate = new Paragraph
            {
                new Chunk("Fecha de Emision: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.fecha_creacion.Value.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerAddress);

            var paragraphCustomerCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerCorreo);

            var paragraphCustomerTelefono = new Paragraph
            {
                new Chunk("Numero Celular: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(pedido.Clientes.telefono_movil??"SIN TELEFONO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerTelefono);

            tableCustomer.AddCell(cellCustomer);
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
            foreach (var detail in pedido.Detalle_pedido.ToList())
            {

                var index = new PdfPCell();
                index.BorderColor = BaseColor.WHITE;
                index.BackgroundColor = BaseColor.WHITE; ;
                index.AddElement(new Paragraph(i.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                i++;

                var code = new PdfPCell();
                code.BorderColor = BaseColor.WHITE;
                code.BackgroundColor = BaseColor.WHITE; ;
                code.AddElement(new Paragraph(detail.Producto.Codigo, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var descr = new PdfPCell();
                descr.BorderColor = BaseColor.WHITE;
                descr.BackgroundColor = BaseColor.WHITE; ;
                descr.AddElement(new Paragraph(detail.Producto.Nombre, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var adic = new PdfPCell();
                adic.BorderColor = BaseColor.WHITE;
                adic.BackgroundColor = BaseColor.WHITE; ;
                adic.AddElement(new Paragraph(detail.Adicional ?? "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var price = new PdfPCell();
                price.BorderColor = BaseColor.WHITE;
                price.BackgroundColor = BaseColor.WHITE; ;
                price.AddElement(new Paragraph(detail.Precio_unitario + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var qty = new PdfPCell();
                qty.BorderColor = BaseColor.WHITE;
                qty.BackgroundColor = BaseColor.WHITE; ;
                qty.AddElement(new Paragraph(detail.Cantidad.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var discount = new PdfPCell();
                discount.BorderColor = BaseColor.WHITE;
                discount.BackgroundColor = BaseColor.WHITE; ;
                discount.AddElement(new Paragraph(detail.Descuento + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var total = new PdfPCell();
                total.BorderColor = BaseColor.WHITE;
                total.BackgroundColor = BaseColor.WHITE; ;
                total.AddElement(new Paragraph(detail.Sub_total + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                tableDetails.AddCell(index);
                tableDetails.AddCell(code);
                tableDetails.AddCell(descr);
                tableDetails.AddCell(adic);
                tableDetails.AddCell(price);
                tableDetails.AddCell(qty);
                tableDetails.AddCell(discount);
                tableDetails.AddCell(total);
            }
            doc.Add(tableDetails);
            doc.Add(new Paragraph(" "));

            //Total
            var tableTotal = new PdfPTable(1);
            tableTotal.DefaultCell.Border = 0;
            tableTotal.WidthPercentage = 100;

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
                        new Chunk(pedido.Subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(pedido.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(pedido.Subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(pedido.Subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(pedido.Subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(pedido.Subtotal_sin_impuestos+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphSubWithOutTaxVal);

            var paragraphDiuscount = new Paragraph
            {
                new Chunk("DESCUENTO: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphDiuscount);

            var paragraphDiuscountVal = new Paragraph
            {
                new Chunk(pedido.Total_descuento+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            totalCellData.AddElement(paragraphDiuscountVal);


            var paragraphIvaValue = new Paragraph
                {
                    new Chunk("IVA "+Math.Round(pedido.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                };
            totalCellLabel.AddElement(paragraphIvaValue);

            var paragraphIvaValueVal = new Paragraph
                {
                   new Chunk(pedido.Valor_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIvaValueVal);

            var paragraphIceValue = new Paragraph
                {
                    new Chunk("ICE: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIceValue);

            var paragraphIceValueVal = new Paragraph
                {
                    new Chunk(pedido.Valor_ice+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIceValueVal);


            var paragraphIRBPNRValue = new Paragraph
                {
                    new Chunk("IRBPNR: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIRBPNRValue);

            var paragraphIRBPNRValueVal = new Paragraph
                {
                    new Chunk(pedido.Valor_irbpnr+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIRBPNRValueVal);

            var paragraphTotal = new Paragraph
            {
                new Chunk("VALOR TOTAL: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTotal);

            var paragraphTotalVal = new Paragraph
            {
                new Chunk(pedido.Total+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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