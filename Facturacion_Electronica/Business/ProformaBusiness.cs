using Facturacion_Electronica;
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Proforma;
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

namespace Proformacion_Electronica.Business
{
    public class ProformaBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Proforma> BuscarProformas(ModeloBuscarProforma modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Proforma>();

            if (ultimos)
            {
                return db.Proforma.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = db.Proforma.Where(x => x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.fecha_creacion < fechaHasta).ToList();
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

        public int GuardarProforma(ModeloProforma modeloProforma, int idEmisor)
        {
            var numero = 1;
            try
            {
                numero = db.Proforma.Where(x => x.id_emisor == idEmisor).Max(x => x.numero) + 1;
            }
            catch (Exception e)
            {
                numero = 1;
            }

            var proforma = new Proforma
            {
                id_emisor = idEmisor,
                id_cliente = modeloProforma.Cliente.Id,
                fecha_emision = modeloProforma.FechaEmison,
                fecha_creacion = DateTime.Now,
                numero = numero,
                observaiones = " "
            };
            db.Proforma.Add(proforma);
            db.SaveChanges();
            return proforma.id;
        }

        public void BorrarProforma(int id, int idEmisor)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }
            db.Proforma.Remove(proforma);
            db.SaveChanges();
        }

        public ModeloProforma GetModeloProforma(int id, int idEmisor)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return null;
            }
            var modelo = new ModeloProforma
            {
                Id = proforma.id,
                Numero = proforma.numero,
                FechaEmison = proforma.fecha_creacion,
                Emisor = emisorBusiness.BuscarEmisor(proforma.id_emisor),
                Cliente = clienteBusiness.GenerarModeloCliente(proforma.id_cliente),
                SubtotalSinImpuestos = proforma.subtotal_sin_impuesto,
                SubtotalIva = proforma.subtotal_iva,
                SubtotalIvaCero = proforma.subtotal_iva_cero,
                SubtotalIce = proforma.subtotal_ice,
                SubtotalIrbpnr = proforma.subtotal_irbpnr,
                SubtotalExcentoIva = proforma.subtotal_excento_iva,
                SubtotalNoObjetoIva = proforma.subtotal_no_objeto_iva,
                ValorIva = proforma.valor_iva,
                ValorIce = proforma.valor_ice,
                ValorIrbpnr = proforma.valor_irbpnr,
                TotalDescuento = proforma.total_descuento,
                Total = proforma.total,
                Observaciones = proforma.observaiones,
                Detalles = new List<ModeloProformaDetalle>(),
                PermiteEditarCliente = true
            };

            foreach (var detalle in proforma.Detalle_Proforma.ToList())
            {
                modelo.Detalles.Add(new ModeloProformaDetalle
                {
                    Id = detalle.Id,
                    Cantidad = detalle.cantidad,
                    Descuento = detalle.descuento,
                    IdProducto = detalle.id_producto,
                    Producto = productobusiness.GenerarModeloProducto(detalle.id_producto),
                    PrecioUnitario = detalle.precio,
                    ValorIva = detalle.valor_iva,
                    ValorIce = detalle.valor_ice,
                    ValorIrbpnr = detalle.valor_irbpnr,
                    Subtotal = detalle.sub_total,
                    Total = detalle.total,
                    Adicional = detalle.adicional
                });
            }

            return modelo;

        }

        public void AgregarProducto(int idProforma, int idProducto, int idEmisor)
        {
            var producto = db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor);

            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (producto == null || proforma == null)
            {
                return;
            }

            var iva = producto.Porcentaje_impuesto_producto2;
            var ice = producto.Porcentaje_impuesto_producto;
            var irbpnr = producto.Porcentaje_impuesto_producto1;

            var detalle = new Detalle_Proforma
            {
                id_producto = idProducto,
                cantidad = 1,
                precio = producto.Precio,
                sub_total = producto.Precio,
                descuento = 0
            };
            detalle.valor_ice = (detalle.sub_total * ice.Porcentaje / 100);
            detalle.valor_irbpnr = (detalle.sub_total * irbpnr.Porcentaje / 100);
            detalle.valor_iva = (detalle.sub_total * iva.Porcentaje / 100);
            detalle.total = detalle.sub_total + detalle.valor_ice + detalle.valor_irbpnr + detalle.valor_iva;

            proforma.subtotal_sin_impuesto += detalle.sub_total;
            proforma.total_descuento += detalle.descuento;
            if (detalle.valor_iva > 0)
            {
                proforma.subtotal_iva += detalle.sub_total;
            }
            else if (iva.id == EnumIvaProducto.IvaCeroId)
            {
                proforma.subtotal_iva_cero += detalle.sub_total;
            }
            else if (iva.id == EnumIvaProducto.NoObjetoIva)
            {
                proforma.subtotal_no_objeto_iva += detalle.sub_total;
            }
            else if (iva.id == EnumIvaProducto.ExcentoIva)
            {
                proforma.subtotal_excento_iva += detalle.sub_total;
            }


            if (detalle.valor_ice > 0)
            {
                proforma.subtotal_ice += detalle.sub_total;
            }

            if (detalle.valor_irbpnr > 0)
            {
                proforma.subtotal_irbpnr += detalle.sub_total;
            }

            proforma.valor_iva += detalle.valor_iva;
            proforma.valor_ice += detalle.valor_ice;
            proforma.valor_irbpnr += detalle.valor_irbpnr;

            proforma.total_descuento += detalle.descuento;
            proforma.total += detalle.total;

            proforma.Detalle_Proforma.Add(detalle);
            db.SaveChanges();
        }

        public void ActualizarAdicionalDetalle(int id, int idProforma, int idEmisor, string adicional)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }

            var detalle = proforma.Detalle_Proforma.FirstOrDefault(x => x.Id == id);
            if (detalle == null && adicional != null)
            {
                return;
            }
            detalle.adicional = adicional;

            db.SaveChanges();
        }

        public void ActualizarPrecioDetalle(int id, int idProforma, int idEmisor, decimal nuevoPrecio)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }

            var detalle = proforma.Detalle_Proforma.FirstOrDefault(x => x.Id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.precio = nuevoPrecio;
            detalle.sub_total = detalle.precio * detalle.cantidad;
            detalle.descuento = detalle.sub_total * (detalle.descuento_porcentaje / 100);
            detalle.sub_total -= detalle.descuento;
            detalle.valor_ice = (detalle.sub_total * ice.Porcentaje / 100);
            detalle.valor_irbpnr = (detalle.sub_total * irbpnr.Porcentaje / 100);
            detalle.valor_iva = (detalle.sub_total * iva.Porcentaje / 100);
            detalle.total = detalle.sub_total + detalle.valor_iva;


            /*detalle.precio = (decimal)Convert.ToDouble(nuevoPrecio) / (decimal)Convert.ToDouble(1.12);
            detalle.sub_total = detalle.precio * detalle.cantidad;
            detalle.valor_iva = (detalle.sub_total * iva.Porcentaje / 100);
            detalle.total = detalle.sub_total + detalle.valor_iva;*/

            Actutalizartotales(proforma);
            db.SaveChanges();
        }

        public void ActualizarObservacionesProforma(int idProforma, int idEmisor, string observaciones)
        {
            var proforma = db.Proforma.FirstOrDefault(x=>x.id == idProforma && x.id_emisor == idEmisor);

            if (proforma == null)
            {
                return;
            }

            proforma.observaiones = observaciones;
            db.SaveChanges();
        }

        public void ActualizarCantidadDetalle(int id, int idProforma, int idEmisor, int nuevacantidad)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }

            var detalle = proforma.Detalle_Proforma.FirstOrDefault(x => x.Id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.cantidad = nuevacantidad;
            detalle.sub_total = detalle.precio * detalle.cantidad;
            detalle.descuento = detalle.sub_total * (detalle.descuento_porcentaje / 100);
            detalle.sub_total -= detalle.descuento;
            detalle.valor_ice = (detalle.sub_total * ice.Porcentaje / 100);
            detalle.valor_irbpnr = (detalle.sub_total * irbpnr.Porcentaje / 100);
            detalle.valor_iva = (detalle.sub_total * iva.Porcentaje / 100);
            detalle.total = detalle.sub_total + detalle.valor_ice + detalle.valor_irbpnr + detalle.valor_iva;
            Actutalizartotales(proforma);
            db.SaveChanges();
        }

        public void ActualizarPorcentajeDescuentoDetalle(int id, int idProforma, int idEmisor, decimal porcentaje)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }

            var detalle = proforma.Detalle_Proforma.FirstOrDefault(x => x.Id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.descuento_porcentaje = porcentaje;
            detalle.descuento = detalle.sub_total * (porcentaje / 100);
            detalle.sub_total = detalle.precio * detalle.cantidad;
            detalle.sub_total -= detalle.descuento;
            detalle.valor_ice = (detalle.sub_total * ice.Porcentaje / 100);
            detalle.valor_irbpnr = (detalle.sub_total * irbpnr.Porcentaje / 100);
            detalle.valor_iva = (detalle.sub_total * iva.Porcentaje / 100);
            detalle.total = detalle.sub_total + detalle.valor_ice + detalle.valor_irbpnr + detalle.valor_iva;
            Actutalizartotales(proforma);
            db.SaveChanges();
        }

        public void EliminarDetalle(int id, int idProforma, int idEmisor)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (proforma == null)
            {
                return;
            }

            var detalle = proforma.Detalle_Proforma.FirstOrDefault(x => x.Id == id);
            if (detalle == null)
            {
                return;
            }
            db.Detalle_Proforma.Remove(detalle);
            Actutalizartotales(proforma);
            db.SaveChanges();
        }

        private void Actutalizartotales(Proforma proforma)
        {
            proforma.subtotal_sin_impuesto = 0;
            proforma.subtotal_iva_cero = 0;
            proforma.subtotal_iva = 0;
            proforma.subtotal_no_objeto_iva = 0;
            proforma.subtotal_excento_iva = 0;
            proforma.subtotal_ice = 0;
            proforma.subtotal_irbpnr = 0;
            proforma.valor_iva = 0;
            proforma.valor_ice = 0;
            proforma.valor_irbpnr = 0;

            proforma.total_descuento = 0;
            proforma.total = 0;

            foreach (var detalle in proforma.Detalle_Proforma.ToList())
            {
                var iva = detalle.Producto.Porcentaje_impuesto_producto2;
                proforma.subtotal_sin_impuesto += detalle.sub_total;

                if (detalle.valor_iva > 0)
                {
                    proforma.subtotal_iva += detalle.sub_total;
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    proforma.subtotal_iva_cero += detalle.sub_total;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    proforma.subtotal_no_objeto_iva += detalle.sub_total;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    proforma.subtotal_excento_iva += detalle.sub_total;
                }
                if (detalle.valor_ice > 0)
                {
                    proforma.subtotal_ice += detalle.sub_total;
                }

                if (detalle.valor_irbpnr > 0)
                {
                    proforma.subtotal_irbpnr += detalle.sub_total;
                }
                proforma.valor_iva += detalle.valor_iva;
                proforma.valor_ice += detalle.valor_ice;
                proforma.valor_irbpnr += detalle.valor_irbpnr;

                proforma.total_descuento += detalle.descuento;
                proforma.total += detalle.total;
            }
        }

        public void ActualizarCliente(int idCliente, int idProforma, int idEmisor)
        {
            var factura = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
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

        public void ActualizarAConsumidorFinal(int idProforma, int idEmisor)
        {
            var factura = db.Proforma.FirstOrDefault(x => x.id == idProforma && x.id_emisor == idEmisor);
            if (factura == null)
            {
                return;
            }
            factura.id_cliente = EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            db.SaveChanges();
        }

        public void EnviarPorEmail(int id)
        {
            var proforma = db.Proforma.FirstOrDefault(x => x.id == id);
            if (proforma == null)
            {
                return;
            }
            var documento = this.GenerarDocumentoPdf(proforma);
            emailBusiness.EnviarEmailProforma(id, documento);
        }

        private byte[] GenerarDocumentoPdf(Proforma proforma)
        {
            if (proforma == null)
            {
                return new byte[0];
            }

            BaseColor myColor = WebColors.GetRGBColor("#e0e0e0");
            var doc = new Document(PageSize.A4);
            var path = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos) + "Ride.pdf";
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

            var logoPath = proforma.Emisor.Logo;
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
            new Paragraph("PROFORMA #"+proforma.numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
            {
            Alignment = Element.ALIGN_CENTER
            };
            cellCompany.AddElement(invoiceTitleParagraph);

            // Company Information
            var companyBussinesNameParagraph =
                new Paragraph(proforma.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(proforma.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellCompany.AddElement(paragraphRuc);

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(proforma.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(proforma.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (proforma.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(proforma.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            var aditionalDataParagraph = new Paragraph
            {
                new Chunk("Observaciones: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(proforma.observaiones??" ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(aditionalDataParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(proforma.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
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
                new Chunk(proforma.fecha_emision.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerAddress);

            var paragraphCustomerCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerCorreo);

            var paragraphCustomerTelefono = new Paragraph
            {
                new Chunk("Numero Celular: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(proforma.Clientes.telefono_movil??"SIN TELEFONO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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
            foreach (var detail in proforma.Detalle_Proforma.ToList())
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
                adic.AddElement(new Paragraph(detail.adicional ?? "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var price = new PdfPCell();
                price.BorderColor = BaseColor.WHITE;
                price.BackgroundColor = BaseColor.WHITE; ;
                price.AddElement(new Paragraph(detail.precio + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var qty = new PdfPCell();
                qty.BorderColor = BaseColor.WHITE;
                qty.BackgroundColor = BaseColor.WHITE; ;
                qty.AddElement(new Paragraph(detail.cantidad.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var discount = new PdfPCell();
                discount.BorderColor = BaseColor.WHITE;
                discount.BackgroundColor = BaseColor.WHITE; ;
                discount.AddElement(new Paragraph(detail.descuento + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var total = new PdfPCell();
                total.BorderColor = BaseColor.WHITE;
                total.BackgroundColor = BaseColor.WHITE; ;
                total.AddElement(new Paragraph(detail.sub_total + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

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
                        new Chunk(proforma.subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(proforma.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(proforma.subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(proforma.subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(proforma.subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(proforma.subtotal_sin_impuesto+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphSubWithOutTaxVal);

            var paragraphDiuscount = new Paragraph
            {
                new Chunk("DESCUENTO: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphDiuscount);

            var paragraphDiuscountVal = new Paragraph
            {
                new Chunk(proforma.total_descuento+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            totalCellData.AddElement(paragraphDiuscountVal);


            var paragraphIvaValue = new Paragraph
                {
                    new Chunk("IVA "+Math.Round(proforma.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                };
            totalCellLabel.AddElement(paragraphIvaValue);

            var paragraphIvaValueVal = new Paragraph
                {
                   new Chunk(proforma.valor_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIvaValueVal);

            var paragraphIceValue = new Paragraph
                {
                    new Chunk("ICE: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIceValue);

            var paragraphIceValueVal = new Paragraph
                {
                    new Chunk(proforma.valor_ice+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIceValueVal);


            var paragraphIRBPNRValue = new Paragraph
                {
                    new Chunk("IRBPNR: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIRBPNRValue);

            var paragraphIRBPNRValueVal = new Paragraph
                {
                    new Chunk(proforma.valor_irbpnr+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIRBPNRValueVal);

            var paragraphTotal = new Paragraph
            {
                new Chunk("VALOR TOTAL: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTotal);

            var paragraphTotalVal = new Paragraph
            {
                new Chunk(proforma.total+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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