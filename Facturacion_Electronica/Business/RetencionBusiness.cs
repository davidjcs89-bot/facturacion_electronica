using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.Retencion;
using iTextSharp.text;
using iTextSharp.text.html;
using iTextSharp.text.pdf;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Web;
using System.Web.Hosting;
using System.Web.WebPages;
using System.Xml.Linq;

namespace Facturacion_Electronica.Business
{
    public class RetencionBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Retencion> BuscarRetenciones(ModeloBuscarRetencion modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Retencion>();

            if (ultimos)
            {
                return db.Retencion.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }
            listado = db.Retencion.Where(x=>x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.Fecha_creacion < fechaHasta).ToList();
            }
            if (modeloBuscar.BuscarPorNumero != null && modeloBuscar.BuscarPorNumero.Trim().Length > 0 && !modeloBuscar.BuscarPorNumero.Equals("0000"))
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.numero.Contains(modeloBuscar.BuscarPorNumero)).ToList();
            }
            if (modeloBuscar.BuscarPorIdCliente != null && modeloBuscar.BuscarPorIdCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes.identificacion == modeloBuscar.BuscarPorIdCliente).ToList();
            }
            else if (modeloBuscar.BuscarPorNombreCliente != null && modeloBuscar.BuscarPorNombreCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Clientes != null && x.Clientes.nombre_cliente.ToUpper().Contains(modeloBuscar.BuscarPorNombreCliente.ToUpper())).ToList();
            }
            return listado;
        }

        public int GuardarRetencion(ModeloRetencion modeloRetencion, int idEmisor)
        {
            var retencion = new Retencion
            {
                id_emisor = idEmisor,
                Id_cliente = null,
                fecha_emision = modeloRetencion.FechaEmison,
                Fecha_creacion = DateTime.Now,
                id_punto_emision = modeloRetencion.PuntoEmisionId,
                numero = "",
                Clave_acceso = "",
                Fecha_Modificacion = DateTime.Now,
                estado = EnumEstadosComprobante.PENDIENTE
            };
            db.Retencion.Add(retencion);
            db.SaveChanges();
            return retencion.id;
        }

        public void ActualizarCliente(int idCliente, int idRetencion, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == idRetencion && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }

            if (db.Clientes.FirstOrDefault(x => x.id == idCliente && x.id_emisor == idEmisor) != null)
            {
                retencion.Id_cliente = idCliente;
                db.SaveChanges();
            }
        }

        public ModeloRetencion GenerarModeloRetencion(int id, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return null;
            }

            var modeloRetencion = new ModeloRetencion
            {
                Id = retencion.id,
                Ambiente = retencion.Emisor.Tipo_ambientes.Descripcion_ambiente,
                ClaveAcceso = retencion.Clave_acceso,
                Cliente = retencion.Id_cliente != null ? clienteBusiness.GenerarModeloCliente(retencion.Id_cliente.Value) : null,
                Emisor = emisorBusiness.BuscarEmisor(idEmisor),
                FechaEmison = retencion.fecha_emision,
                Numero = retencion.numero,
                PuntoEmisionId = retencion.id_punto_emision,
                DireccionSucursal = retencion.Puntos_emisior.Direccion,
                Estado = retencion.estado,
                Detalles = new List<ModeloDetalleImpuesto>(),
                Adicionales = new List<ModeloDatoAdicional>()
            };

            foreach (var detalle in retencion.Detalle_retencion.ToList())
            {
                modeloRetencion.Detalles.Add(new ModeloDetalleImpuesto
                {
                    Id = detalle.id,
                    BaseImponible = detalle.Base_imponible,
                    CodigoImpuesto = detalle.Impuesto_porcentaje_retencion.Codigo,
                    DescripcionImpuesto = detalle.Impuesto_porcentaje_retencion.Descripcion,
                    FechaEmision = detalle.Fecha_emision,
                    NombreImpuesto = detalle.Impuesto_porcentaje_retencion.Impuestos_retencion.Descripcion,
                    Porcentaje = detalle.Porcentaje_retencion,
                    TipoDocumento = db.Tipo_documento.Find(detalle.id_tipo_documento).Descripcion_doc,
                    Total = detalle.Valor_retenido
                });
            }

            foreach (var adicional in retencion.Datos_Adicionales_Retencion.ToList())
            {
                modeloRetencion.Adicionales.Add(new ModeloDatoAdicional
                {
                    Id = adicional.id,
                    Nombre = adicional.Nombre,
                    Descripcion = adicional.Descripcion
                });
            }

            return modeloRetencion;
        }
        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (punto == null || retencion == null)
            {
                return;
            }

            retencion.id_punto_emision = idPuntoEmision;
            db.SaveChanges();
        }
        public void FinalizarRetencion(ModeloRetencion modeloRetencion, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == modeloRetencion.Id && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }
            retencion.fecha_emision = modeloRetencion.FechaEmison;
            retencion.id_punto_emision = modeloRetencion.PuntoEmisionId;

            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == retencion.id_punto_emision && x.Id_Documentos == EnumTipoDocumento.RETENCION);
            if (secuencia != null)
            {
                retencion.numero = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            retencion.Clave_acceso = comprobanteBusiness.GenerarClaveAcceso(retencion.fecha_emision, retencion.numero, secuencia.Tipo_documento.Codigo_doc, retencion.Emisor.Ruc, retencion.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            retencion.estado = EnumEstadosComprobante.FINALIZADO;
            retencion.Fecha_Modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(retencion);
        }

        public void BorrarRetencion(int id, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (retencion == null && retencion.estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Retencion.Remove(retencion);
            db.SaveChanges();
        }

        public void AgregarDetalleImpuesto(ModeloRetencion modeloRetencion, int idEmisor, decimal porcentaje)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == modeloRetencion.Id && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }
            var porcentajeImpuesto = db.Impuesto_porcentaje_retencion.FirstOrDefault(x => x.id_impuesto == modeloRetencion.IdImpuesto && x.id == modeloRetencion.IdPorcentajeImpuesto);
            if (porcentajeImpuesto == null)
            {
                return;
            }

            decimal valorRetenido = 0;
            decimal porcentajeDetalle = 0;

            if (porcentajeImpuesto.porcentaje_fijo)
            {
                valorRetenido = modeloRetencion.BaseImponible * (porcentajeImpuesto.Porcentaje / 100);
                porcentajeDetalle = porcentajeImpuesto.Porcentaje;
            }
            else
            {
                valorRetenido = modeloRetencion.BaseImponible * (porcentaje / 100);
                porcentajeDetalle = porcentaje;
            }


            retencion.Detalle_retencion.Add(new Detalle_retencion
            {
                id_impuesto = modeloRetencion.IdImpuesto,
                id_Porcentajes_retenccion = modeloRetencion.IdPorcentajeImpuesto,
                Base_imponible = modeloRetencion.BaseImponible,
                id_tipo_documento = modeloRetencion.IdTipoDocumento,
                numero_documento_ret = modeloRetencion.NumeroComprobante,
                Porcentaje_retencion = porcentajeDetalle,
                Valor_retenido = valorRetenido,
                Fecha_emision = modeloRetencion.FechaEmisionComprobante,
                periodo_fiscal = modeloRetencion.FechaEmisionComprobante.ToString("yyyy/MM")
            });

            db.SaveChanges();
        }

        public void EliminarDetalle(int id, int idRetencion, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == idRetencion && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }

            var detalle = retencion.Detalle_retencion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }
            db.Detalle_retencion.Remove(detalle);
            db.SaveChanges();
        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idRetencion, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == idRetencion && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }

            retencion.Datos_Adicionales_Retencion.Add(new Datos_Adicionales_Retencion
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idRetencion, int idEmisor)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == idRetencion && x.id_emisor == idEmisor);
            if (retencion == null)
            {
                return;
            }

            var detalle = retencion.Datos_Adicionales_Retencion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Retencion.Remove(detalle);
            db.SaveChanges();
        }

        public void GenerarXml(Retencion modelo)
        {
            var documentoElectronico = new Documentos_Electronicos();
            try
            {
                var emisor = modelo.Emisor;
                var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.RETENCION);
                var xml = new XElement("comprobanteRetencion", new XAttribute("id", "comprobante"), new XAttribute("version", "1.0.0"));
                var trib = new XElement("infoTributaria");
                trib.Add(new XElement("ambiente", emisor.Tipo_ambientes.Codigo_ambiente));
                trib.Add(new XElement("tipoEmision", EnumTiposEmision.NORMAL));
                trib.Add(new XElement("razonSocial", CompartidaBusiness.CleanText(emisor.Razon_social)));
                trib.Add(new XElement("nombreComercial", CompartidaBusiness.CleanText(emisor.Nombre_comercial)));
                trib.Add(new XElement("ruc", emisor.Ruc));
                trib.Add(new XElement("claveAcceso", modelo.Clave_acceso));
                trib.Add(new XElement("codDoc", tipoDocumento.Codigo_doc));
                var numero = modelo.numero.Split('-');
                trib.Add(new XElement("estab", modelo.Puntos_emisior.Numero_establecimiento));
                trib.Add(new XElement("ptoEmi", modelo.Puntos_emisior.Numero_emision));
                trib.Add(new XElement("secuencial", numero[2]));
                trib.Add(new XElement("dirMatriz", CompartidaBusiness.CleanText(emisor.Direccion_matriz)));
                xml.Add(trib);

                var fact = new XElement("infoCompRetencion");
                fact.Add(new XElement("fechaEmision", modelo.fecha_emision.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("dirEstablecimiento", CompartidaBusiness.CleanText(modelo.Puntos_emisior.Direccion)));
                fact.Add(new XElement("obligadoContabilidad", emisor.Obligado_conta ? "SI" : "NO"));
                fact.Add(new XElement("tipoIdentificacionSujetoRetenido", modelo.Clientes.Tipo_Identificacion1.Codigo));
                fact.Add(new XElement("razonSocialSujetoRetenido", CompartidaBusiness.CleanText(modelo.Clientes.nombre_cliente)));
                fact.Add(new XElement("identificacionSujetoRetenido", modelo.Clientes.identificacion));
                fact.Add(new XElement("periodoFiscal", modelo.fecha_emision.ToString("MM/yyyy")));
                xml.Add(fact);

                var items = new XElement("impuestos");
                foreach (var item in modelo.Detalle_retencion.ToList())
                {
                    var detail = new XElement("impuesto");
                    detail.Add(new XElement("codigo", CompartidaBusiness.CleanText(item.Impuestos_retencion.Codigo)));
                    detail.Add(new XElement("codigoRetencion", CompartidaBusiness.CleanText(item.Impuesto_porcentaje_retencion.Codigo)));
                    detail.Add(new XElement("baseImponible", item.Base_imponible));
                    detail.Add(new XElement("porcentajeRetener", item.Impuesto_porcentaje_retencion.Porcentaje));
                    detail.Add(new XElement("valorRetenido", item.Valor_retenido));
                    detail.Add(new XElement("codDocSustento", "01"));
                    detail.Add(new XElement("numDocSustento", item.numero_documento_ret.Replace("-", "")));
                    detail.Add(new XElement("fechaEmisionDocSustento", item.Fecha_emision.ToString("dd/MM/yyyy")));
                    items.Add(detail);
                }

                xml.Add(items);

                foreach (var adicional in modelo.Datos_Adicionales_Retencion.ToList())
                {
                    var extra = new XElement("infoAdicional");
                    extra.Add(new XElement("campoAdicional", adicional.Descripcion, new XAttribute("nombre", adicional.Nombre)));
                    xml.Add(extra);
                }

                var documento = new XDocument(xml);
                documentoElectronico.id_comprobante = modelo.id;
                documentoElectronico.id_tipo_comprobante = tipoDocumento.id;
                documentoElectronico.xml_generado = documento.ToString();
                db.Documentos_Electronicos.Add(documentoElectronico);
                db.SaveChanges();
            }
            catch (Exception ex)
            {
                documentoElectronico.mensajes = ex.ToString();
            }

            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.RETENCION });
            db.SaveChanges();
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idRetencion)
        {
            try
            {
                var retencion = db.Retencion.Find(idRetencion);
                var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == retencion.id && x.id_documento_electronico == idDocumento);
                var envioEmail = false;

                if (retencion == null || comprobanteCola == null)
                {
                    return;
                }

                if (comprobanteBusiness.FirmarXml(idDocumento, retencion.id_emisor))
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
                    var respuesta = comprobanteBusiness.EnviarXml(retencion.id_emisor);
                    if (respuesta.Recibido)
                    {
                        Thread.Sleep(5000);
                        var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(retencion.id_emisor, retencion.Clave_acceso);
                        if (autorizacion.Autorizado)
                        {
                            documento.xml_retornado = autorizacion.Xml;
                            retencion.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                            documento.fecha_modificacion = DateTime.Now;
                            retencion.estado = EnumEstadosComprobante.AUTORIZADO;
                            documento.ride = GenerarRide(retencion);
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
                            emailBusiness.EnviarEmailRetencion(idRetencion, idDocumento);
                            return;
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
                db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar retencion electronica, id retencion: {idRetencion}, error: {e.Message}" });
                db.SaveChanges();
            }
        }

        public byte[] GenerarRide(Retencion retencion)
        {

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

            var logoPath = retencion.Emisor.Logo;
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
                new Paragraph(retencion.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(retencion.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(retencion.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companySecundaryAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Sucursal: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(retencion.Puntos_emisior.Direccion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companySecundaryAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(retencion.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            var companyContrEspecialParagraph = new Paragraph
            {
                new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(retencion.Emisor.Cintirbuyente_especial?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyContrEspecialParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (retencion.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Numero de Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(retencion.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            cellCompany.AddElement(companySecundaryAddressParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(retencion.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
            };
            cellCompany.AddElement(adicionalesEmisor);
            cellCompany.AddElement(new Paragraph(" "));

            subTableHeader.AddCell(cellCompany);

            var cellNota = new PdfPCell { Colspan = 1 };
            cellNota.BorderColor = BaseColor.WHITE;
            cellNota.BackgroundColor = myColor;
            var invoiceTitleParagraph =
                new Paragraph("COMPROBANTE DE RETENCIÓN", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellNota.AddElement(invoiceTitleParagraph);

            var invoiceNumberParagraph =
                new Paragraph(retencion.numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellNota.AddElement(invoiceNumberParagraph);

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellNota.AddElement(paragraphRuc);

            cellNota.AddElement(new Paragraph("Número de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellNota.AddElement(new Paragraph(retencion.Clave_acceso, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
            cellNota.AddElement(new Paragraph("Fecha y Hora de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellNota.AddElement(new Paragraph(retencion.fecha_autorizacion.Value.ToString("dd/MM/yyyy HH:mm:ss"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10)));
            var paragraphEnvironment = new Paragraph
            {
                new Chunk("Ambiente: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Emisor.Tipo_ambientes.Descripcion_ambiente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellNota.AddElement(paragraphEnvironment);

            var paragraphEmission = new Paragraph
            {
                new Chunk("Emisión: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk("NORMAL", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellNota.AddElement(paragraphEmission);

            cellNota.AddElement(new Paragraph(" "));

            //Code Bar with Access Key
            var accessKeyParagraph =
                new Paragraph("CLAVE DE ACCESO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellNota.AddElement(accessKeyParagraph);
            var barcode39 = new Barcode128 { Code = retencion.Clave_acceso };
            var cb = new PdfContentByte(writer);
            var code39Image = barcode39.CreateImageWithBarcode(cb, null, null);
            code39Image.ScaleAbsoluteWidth(200);
            code39Image.Alignment = Element.ALIGN_CENTER;
            cellNota.AddElement(code39Image);
            cellNota.AddElement(new Paragraph(" "));

            var cellSubTableHeader = new PdfPCell();
            cellSubTableHeader.BorderColor = BaseColor.WHITE;
            cellSubTableHeader.AddElement(subTableHeader);


            tableHeader.AddCell(cellSubTableHeader);
            tableHeader.AddCell(cellNota);
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
                new Chunk(retencion.fecha_emision.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            tableCustomer.AddCell(cellCustomer);

            var cellCustomer2 = new PdfPCell();
            cellCustomer2.BorderColor = BaseColor.WHITE;
            cellCustomer2.BackgroundColor = myColor;


            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(paragraphCustomerAddress);

            var clienteTelefono = new Paragraph
            {
                new Chunk("Telefono: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Clientes.telefono_movil??"SIN NUMERO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteTelefono);

            var clienteCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(retencion.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteCorreo);
            doc.Add(tableCustomer);

            var tableDetails = new PdfPTable(9);
            tableDetails.DefaultCell.Border = 0;
            tableDetails.WidthPercentage = 100;
            tableDetails.SetWidths(new float[] { 15f, 30f, 30f, 30f, 30f, 30f, 30f, 30f, 30f });

            var cellIndex = new PdfPCell();
            cellIndex.AddElement(new Paragraph("Orden", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellIndex.BorderColor = BaseColor.WHITE;
            cellIndex.BackgroundColor = myColor;
            tableDetails.AddCell(cellIndex);

            var cellCode = new PdfPCell();
            cellCode.AddElement(new Paragraph("Comprobante", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellCode.BorderColor = BaseColor.WHITE;
            cellCode.BackgroundColor = myColor;
            tableDetails.AddCell(cellCode);

            var cellQty = new PdfPCell();
            cellQty.AddElement(new Paragraph("Número", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellQty.BorderColor = BaseColor.WHITE;
            cellQty.BackgroundColor = myColor;
            tableDetails.AddCell(cellQty);

            var cellDescr = new PdfPCell();
            cellDescr.AddElement(new Paragraph("Fecha Emision", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellDescr.BorderColor = BaseColor.WHITE;
            cellDescr.BackgroundColor = myColor;
            tableDetails.AddCell(cellDescr);

            var cellPrec = new PdfPCell();
            cellPrec.AddElement(new Paragraph("Ejercicio Fiscal", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellPrec.BorderColor = BaseColor.WHITE;
            cellPrec.BackgroundColor = myColor;
            tableDetails.AddCell(cellPrec);

            var cellDesc = new PdfPCell();
            cellDesc.AddElement(new Paragraph("Base Imponible para la Retención", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellDesc.BorderColor = BaseColor.WHITE;
            cellDesc.BackgroundColor = myColor;
            tableDetails.AddCell(cellDesc);

            var cellTotal = new PdfPCell();
            cellTotal.AddElement(new Paragraph("Impuesto", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellTotal.BorderColor = BaseColor.WHITE;
            cellTotal.BackgroundColor = myColor;
            tableDetails.AddCell(cellTotal);

            var cellPercentage = new PdfPCell();
            cellPercentage.AddElement(new Paragraph("Porcentaje Retención", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellPercentage.BorderColor = BaseColor.WHITE;
            cellPercentage.BackgroundColor = myColor;
            tableDetails.AddCell(cellPercentage);

            var cellValue = new PdfPCell();
            cellValue.AddElement(new Paragraph("Valor Retenido", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellValue.BorderColor = BaseColor.WHITE;
            cellValue.BackgroundColor = myColor;
            tableDetails.AddCell(cellValue);

            int i = 1;
            foreach (var detail in retencion.Detalle_retencion.ToList())
            {
                var index = new PdfPCell();
                index.AddElement(new Paragraph(i.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                index.BorderColor = BaseColor.WHITE;
                index.BackgroundColor = BaseColor.WHITE; ;
                i++;

                var comp = new PdfPCell();
                comp.AddElement(new Paragraph("Otro", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                comp.BorderColor = BaseColor.WHITE;
                comp.BackgroundColor = BaseColor.WHITE; ;

                var num = new PdfPCell();
                num.AddElement(new Paragraph(detail.numero_documento_ret.Replace("-", ""), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                num.BorderColor = BaseColor.WHITE;
                num.BackgroundColor = BaseColor.WHITE; ;

                var dateInv = new PdfPCell();
                dateInv.AddElement(new Paragraph(detail.Fecha_emision.ToString("dd/MM/yyyy"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                dateInv.BorderColor = BaseColor.WHITE;
                dateInv.BackgroundColor = BaseColor.WHITE; ;

                var fiscalPer = new PdfPCell();
                fiscalPer.AddElement(new Paragraph(detail.periodo_fiscal, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                fiscalPer.BorderColor = BaseColor.WHITE;
                fiscalPer.BackgroundColor = BaseColor.WHITE; ;

                var taxBase = new PdfPCell();
                taxBase.AddElement(new Paragraph(detail.Base_imponible + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                taxBase.BorderColor = BaseColor.WHITE;
                taxBase.BackgroundColor = BaseColor.WHITE; ;

                var tax = new PdfPCell();
                tax.AddElement(new Paragraph(detail.Impuestos_retencion.Descripcion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                tax.BorderColor = BaseColor.WHITE;
                tax.BackgroundColor = BaseColor.WHITE; ;

                var taxPercent = new PdfPCell();
                taxPercent.AddElement(new Paragraph(Math.Round(detail.Impuesto_porcentaje_retencion.Porcentaje,2) + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                taxPercent.BorderColor = BaseColor.WHITE;
                taxPercent.BackgroundColor = BaseColor.WHITE; 

                var taxValue = new PdfPCell();
                taxValue.AddElement(new Paragraph(detail.Valor_retenido + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                taxValue.BorderColor = BaseColor.WHITE;
                taxValue.BackgroundColor = BaseColor.WHITE; ;

                tableDetails.AddCell(index);
                tableDetails.AddCell(comp);
                tableDetails.AddCell(num);
                tableDetails.AddCell(dateInv);
                tableDetails.AddCell(fiscalPer);
                tableDetails.AddCell(taxBase);
                tableDetails.AddCell(tax);
                tableDetails.AddCell(taxPercent);
                tableDetails.AddCell(taxValue);
            }
            doc.Add(tableDetails);
            doc.Add(new Paragraph(" "));

            //Total
            var tableTotal = new PdfPTable(1);
            tableTotal.DefaultCell.Border = 0;
            tableTotal.WidthPercentage = 100;

            var aditionalCell = new PdfPCell();
            aditionalCell.BorderColor = BaseColor.WHITE;
            aditionalCell.BackgroundColor = myColor;

            aditionalCell.AddElement(new Paragraph(" "));
            aditionalCell.AddElement(new Paragraph("Información Adicional", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));

            foreach (var adicional in retencion.Datos_Adicionales_Retencion.ToList())
            {
                var paragraphExtra = new Paragraph
            {
                new Chunk(adicional.Nombre+": ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(adicional.Descripcion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
                aditionalCell.AddElement(paragraphExtra);

            }
            tableTotal.AddCell(aditionalCell);

            doc.Add(tableTotal);

            doc.Close();
            return File.ReadAllBytes(path);
        }

    }
}