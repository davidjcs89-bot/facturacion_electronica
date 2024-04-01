using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.GuiaRemision;
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
    public class GuiaRemisionBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private TransportistaBusiness transportistaBusiness = new TransportistaBusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Guia_remision> BuscarGuias(ModeloBuscarGuiaRemision modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Guia_remision>();

            if (ultimos)
            {
                return db.Guia_remision.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = db.Guia_remision.Where(x=>x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.fecha_creacion < fechaHasta).ToList();
            }
            if (modeloBuscar.BuscarPorNumero != null && modeloBuscar.BuscarPorNumero.Trim().Length > 0 && !modeloBuscar.BuscarPorNumero.Equals("0000"))
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Numero_comprobante.Contains(modeloBuscar.BuscarPorNumero)).ToList();
            }
            if (modeloBuscar.BuscarPorIdCliente != null && modeloBuscar.BuscarPorIdCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Transportistas.Numero_identificacion == modeloBuscar.BuscarPorIdCliente).ToList();
            }
            else if (modeloBuscar.BuscarPorNombreCliente != null && modeloBuscar.BuscarPorNombreCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Transportistas.Nombre.ToUpper().Contains(modeloBuscar.BuscarPorNombreCliente.ToUpper())).ToList();
            }
            return listado;
        }

        public int GuardarGuia(ModeloGuiaRemision modeloGuia, int idEmisor)
        {
            var guia = new Guia_remision
            {
                id_emisor = idEmisor,
                Id_transportista = modeloGuia.Transportista.Id,
                fecha_creacion = DateTime.Now,
                id_punto_emision = modeloGuia.PuntoEmisionId,
                Fecha_inicio_transporte = modeloGuia.FechaInicioTransporte,
                Fecha_fin_transporte = modeloGuia.FechaFinTransporte,
                Numero_comprobante = "",
                Clave_acceso = "",
                fecha_modificacion = DateTime.Now,
                estado = EnumEstadosComprobante.PENDIENTE,
                Direccion_partida = modeloGuia.DireccionPartida ?? "",
                placa = modeloGuia.Transportista.Placa
            };
            db.Guia_remision.Add(guia);
            db.SaveChanges();
            return guia.id;
        }

        public ModeloGuiaRemision GetModeloGuiaRemision(int id, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return null;
            }
            var modelo = new ModeloGuiaRemision
            {
                Id = guia.id,
                Ambiente = guia.Emisor.Tipo_ambientes.Descripcion_ambiente,
                FechaFinTransporte = guia.Fecha_fin_transporte,
                FechaInicioTransporte = guia.Fecha_inicio_transporte,
                ClaveAcceso = guia.Clave_acceso,
                Numero = guia.Numero_comprobante,
                PuntoEmisionId = guia.Puntos_emisior.id,
                DireccionSucursal = guia.Puntos_emisior.Direccion,
                Emisor = emisorBusiness.BuscarEmisor(guia.id_emisor),
                DireccionPartida = guia.Direccion_partida,
                Transportista = transportistaBusiness.BuscarTransportista(guia.Id_transportista, guia.id_emisor),
                Estado = guia.estado,
                Destinatarios = new List<ModeloGuiaDestinatario>()
            };
            modelo.Adicionales = new List<ModeloDatoAdicional>();

            foreach (var destinatario in guia.Guia_remision_destinatario.ToList())
            {
                var registro = new ModeloGuiaDestinatario
                {
                    Id = destinatario.id,
                    IdCliente = destinatario.Clientes.id,
                    Nombres = destinatario.Clientes.nombre_cliente,
                    CodigoEstablecimientoDestino = destinatario.Codigo_estable_destino,
                    DireccionDestino = destinatario.Direccion_destino,
                    DocumentoAduanero = destinatario.Documento_Aduanero,
                    FechaEmisionDocumento = destinatario.Fecha_emision_factura,
                    Identificacion = destinatario.Clientes.identificacion,
                    MotivoTraslado = destinatario.Motivo_traslado,
                    NumeroAutorizacion = destinatario.Numero_Autorizacion_fac,
                    //NumeroComprobante = destinatario.Numero_Factura,
                    Ruta = destinatario.Ruta,
                    Detalles = new List<ModeloDetalleGuiaRemision>()
                };

                foreach (var detalle in destinatario.Detalles_guia_remision.ToList())
                {
                    registro.Detalles.Add(new ModeloDetalleGuiaRemision
                    {
                        Cantidad = detalle.Cantidad,
                        Descripcion = detalle.Producto.Nombre,
                        Codigo = detalle.Producto.Codigo,
                        Id = detalle.id
                    });
                }

                modelo.Destinatarios.Add(registro);
            }

            foreach (var dato in guia.Datos_Adicionales_Guia_Remision.ToList())
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

        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (punto == null || guia == null)
            {
                return;
            }

            guia.id_punto_emision = idPuntoEmision;
            db.SaveChanges();
        }

        public void FinalizarGuiaRemision(ModeloGuiaRemision modeloGuia, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == modeloGuia.Id && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return;
            }
            guia.Fecha_inicio_transporte = modeloGuia.FechaInicioTransporte;
            guia.Fecha_fin_transporte = modeloGuia.FechaFinTransporte;
            guia.id_punto_emision = modeloGuia.PuntoEmisionId;
            guia.Direccion_partida = modeloGuia.DireccionPartida;

            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == guia.id_punto_emision && x.Id_Documentos == EnumTipoDocumento.GUIA_REMISION);
            if (secuencia != null)
            {
                guia.Numero_comprobante = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            guia.Clave_acceso = comprobanteBusiness.GenerarClaveAcceso(guia.Fecha_inicio_transporte, guia.Numero_comprobante, secuencia.Tipo_documento.Codigo_doc, guia.Emisor.Ruc, guia.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            guia.estado = EnumEstadosComprobante.FINALIZADO;
            guia.fecha_modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(guia);
        }

        public void BorrarGuiaRemision(int id, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (guia == null && guia.estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Guia_remision.Remove(guia);
            db.SaveChanges();
        }


        public void ActualizarTransportista(int idTransportista, int idGuia, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return;
            }

            if (db.Transportistas.FirstOrDefault(x => x.id == idTransportista && x.Id_emisor == idEmisor) != null)
            {
                guia.Id_transportista = idTransportista;
                db.SaveChanges();
            }
        }

        public void AgregarDestinatario(ModeloGuiaDestinatario modeloDestinatario, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == modeloDestinatario.IdGuia && x.id_emisor == idEmisor);

            if (guia == null)
            {
                return;
            }

            guia.Guia_remision_destinatario.Add(new Guia_remision_destinatario
            {
                id_cliente = modeloDestinatario.IdCliente,
                Codigo_estable_destino = modeloDestinatario.CodigoEstablecimientoDestino,
                Direccion_destino = modeloDestinatario.DireccionDestino,
                Documento_Aduanero = modeloDestinatario.DocumentoAduanero,
                Fecha_emision_factura = modeloDestinatario.FechaEmisionDocumento,
                Motivo_traslado = modeloDestinatario.MotivoTraslado,
                Numero_Autorizacion_fac = modeloDestinatario.NumeroAutorizacion,
                Numero_Factura = modeloDestinatario.CodigoEstabComprobante + "-" + modeloDestinatario.PuntiEmisComprobante + "-" + modeloDestinatario.NumComprobante,
                Ruta = modeloDestinatario.Ruta
            });

            db.SaveChanges();
        }

        public ModeloGuiaDestinatario ObtenerDestinatario(int idGuia, int idDestinatario, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia && x.id_emisor == idEmisor);

            if (guia == null)
            {
                return null;
            }

            var destinatario = guia.Guia_remision_destinatario.FirstOrDefault(x=>x.id == idDestinatario);
            if (destinatario == null)
            {
                return null;
            }

            var modelo = new ModeloGuiaDestinatario();
            modelo.Id = idDestinatario;
            modelo.IdGuia = idGuia;
            modelo.IdCliente = destinatario.Clientes.id;
            modelo.Identificacion = destinatario.Clientes.identificacion;
            modelo.Nombres = destinatario.Clientes.nombre_cliente;
            modelo.DireccionDestino = destinatario.Direccion_destino;
            modelo.Ruta = destinatario.Ruta;
            modelo.MotivoTraslado = destinatario.Motivo_traslado;
            modelo.DocumentoAduanero = destinatario.Documento_Aduanero;
            modelo.FechaEmisionDocumento = destinatario.Fecha_emision_factura;
            var numeroFactura = destinatario.Numero_Factura.Split('-');
            modelo.CodigoEstabComprobante = numeroFactura[0];
            modelo.PuntiEmisComprobante = numeroFactura[1];
            modelo.NumComprobante = numeroFactura[2];
            modelo.CodigoEstablecimientoDestino = destinatario.Codigo_estable_destino;
            modelo.NumeroAutorizacion = destinatario.Numero_Autorizacion_fac;

            return modelo;
        }

        public void AgregarProducto(int idProducto, int cantidad, int idDestintario, int idGuia, int idEmisor)
        {
            if (db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor) == null)
            {
                return;
            }

            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia && x.id_emisor == idEmisor);

            if (guia == null)
            {
                return;
            }

            var destinatario = guia.Guia_remision_destinatario.FirstOrDefault(x => x.id == idDestintario);

            if (destinatario == null)
            {
                return;
            }

            destinatario.Detalles_guia_remision.Add(new Detalles_guia_remision
            {
                id_producto = idProducto,
                Cantidad = cantidad
            });

            db.SaveChanges();
        }

        public void EliminarProducto(int id, int idDestinatario, int idGuia, int idEmisor)
        {
            var detalle = db.Detalles_guia_remision.FirstOrDefault(x => x.id == id && x.id_destinatario == idDestinatario && x.Guia_remision_destinatario.Guia_remision.id == idGuia && x.Guia_remision_destinatario.Guia_remision.id_emisor == idEmisor);
            if (detalle == null)
            {
                return;
            }

            db.Detalles_guia_remision.Remove(detalle);
            db.SaveChanges();
        }

        public void EliminarDestinatario(int idDestinatario, int idGuia, int idEmisor)
        {
            var destinatario = db.Guia_remision_destinatario.FirstOrDefault(x => x.id == idDestinatario && x.id_guia == idGuia && x.Guia_remision.id_emisor == idEmisor);

            if (destinatario == null)
            {
                return;
            }

            db.Guia_remision_destinatario.Remove(destinatario);
            db.SaveChanges();

        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idGuia, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return;
            }

            guia.Datos_Adicionales_Guia_Remision.Add(new Datos_Adicionales_Guia_Remision
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idGuia, int idEmisor)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia && x.id_emisor == idEmisor);
            if (guia == null)
            {
                return;
            }

            var detalle = guia.Datos_Adicionales_Guia_Remision.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Guia_Remision.Remove(detalle);
            db.SaveChanges();
        }

        public void GenerarXml(Guia_remision modelo)
        {

            var emisor = modelo.Emisor;
            var documentoElectronico = new Documentos_Electronicos();
            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.GUIA_REMISION);

            if (emisor == null || tipoDocumento == null)
            {
                return;
            }
            try
            {
                var xml = new XElement("guiaRemision", new XAttribute("id", "comprobante"), new XAttribute("version", "1.1.0"));
                var trib = new XElement("infoTributaria");
                trib.Add(new XElement("ambiente", emisor.Tipo_ambientes.Codigo_ambiente));
                trib.Add(new XElement("tipoEmision", EnumTiposEmision.NORMAL));
                trib.Add(new XElement("razonSocial", CompartidaBusiness.CleanText(emisor.Razon_social)));
                trib.Add(new XElement("nombreComercial", CompartidaBusiness.CleanText(emisor.Nombre_comercial)));
                trib.Add(new XElement("ruc", emisor.Ruc));
                trib.Add(new XElement("claveAcceso", modelo.Clave_acceso));
                trib.Add(new XElement("codDoc", tipoDocumento.Codigo_doc));
                var numero = modelo.Numero_comprobante.Split('-');
                trib.Add(new XElement("estab", modelo.Puntos_emisior.Numero_establecimiento));
                trib.Add(new XElement("ptoEmi", modelo.Puntos_emisior.Numero_emision));
                trib.Add(new XElement("secuencial", numero[2]));
                trib.Add(new XElement("dirMatriz", CompartidaBusiness.CleanText(emisor.Direccion_matriz)));
                xml.Add(trib);

                var fact = new XElement("infoGuiaRemision");

                fact.Add(new XElement("dirEstablecimiento", CompartidaBusiness.CleanText(modelo.Puntos_emisior.Direccion)));
                fact.Add(new XElement("dirPartida", CompartidaBusiness.CleanText(modelo.Direccion_partida)));
                fact.Add(new XElement("razonSocialTransportista", CompartidaBusiness.CleanText(modelo.Transportistas.Nombre)));
                fact.Add(new XElement("tipoIdentificacionTransportista", modelo.Transportistas.Tipo_Identificacion1.Codigo));
                fact.Add(new XElement("rucTransportista", modelo.Transportistas.Numero_identificacion));
                fact.Add(new XElement("fechaIniTransporte", modelo.Fecha_inicio_transporte.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("fechaFinTransporte", modelo.Fecha_fin_transporte.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("placa", modelo.Transportistas.Placa));


                xml.Add(fact);

                var destinatarios = new XElement("destinatarios");
                foreach (var destinatario in modelo.Guia_remision_destinatario.ToList())
                {
                    var detalle = new XElement("destinatario");
                    detalle.Add(new XElement("identificacionDestinatario", destinatario.Clientes.Tipo_Identificacion1.Codigo));
                    detalle.Add(new XElement("razonSocialDestinatario", CompartidaBusiness.CleanText(destinatario.Clientes.nombre_cliente)));
                    detalle.Add(new XElement("dirDestinatario", destinatario.Clientes.Direccion ?? "SIN DIRECCION"));
                    detalle.Add(new XElement("motivoTraslado", CompartidaBusiness.CleanText(destinatario.Motivo_traslado)));
                    detalle.Add(new XElement("codDocSustento", "01"));
                    detalle.Add(new XElement("numDocSustento", destinatario.Numero_Factura));
                    detalle.Add(new XElement("numAutDocSustento", destinatario.Numero_Autorizacion_fac));
                    detalle.Add(new XElement("fechaEmisionDocSustento", destinatario.Fecha_emision_factura.ToString("dd/MM/yyyy")));

                    var productos = new XElement("detalles");

                    foreach (var detalleDestinatario in destinatario.Detalles_guia_remision.ToList())
                    {
                        var producto = new XElement("detalle");
                        producto.Add(new XElement("codigoInterno", detalleDestinatario.Producto.Codigo));
                        producto.Add(new XElement("descripcion", CompartidaBusiness.CleanText(detalleDestinatario.Producto.Nombre)));
                        producto.Add(new XElement("cantidad", detalleDestinatario.Cantidad));
                        productos.Add(producto);
                    }
                    detalle.Add(productos);
                    destinatarios.Add(detalle);
                }

                xml.Add(destinatarios);

                foreach (var adicional in modelo.Datos_Adicionales_Guia_Remision.ToList())
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

            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.GUIA_REMISION });
            db.SaveChanges();
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idGuia)
        {
            var guia = db.Guia_remision.Find(idGuia);
            var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == guia.id && x.id_documento_electronico == idDocumento);
            var envioEmail = false;

            if (guia == null || comprobanteCola == null)
            {
                return;
            }

            if (comprobanteBusiness.FirmarXml(idDocumento, guia.id_emisor))
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
                var respuesta = comprobanteBusiness.EnviarXml(guia.id_emisor);
                if (respuesta.Recibido)
                {
                    Thread.Sleep(5000);
                    var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(guia.id_emisor, guia.Clave_acceso);
                    if (autorizacion.Autorizado)
                    {
                        documento.xml_retornado = autorizacion.Xml;
                        guia.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                        documento.fecha_modificacion = DateTime.Now;
                        guia.estado = EnumEstadosComprobante.AUTORIZADO;
                        documento.ride = GenerarRide(guia);
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
                        emailBusiness.EnviarEmailGuiaRemision(idGuia, idDocumento);
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

        public byte[] GenerarRide(Guia_remision guia)
        {
            if (guia == null)
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

            var logoPath = guia.Emisor.Logo;
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
                new Paragraph(guia.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(guia.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companySecundaryAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Sucursal: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Puntos_emisior.Direccion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companySecundaryAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            var companyContrEspecialParagraph = new Paragraph
            {
                new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Emisor.Cintirbuyente_especial?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyContrEspecialParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (guia.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Numero de Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(guia.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            cellCompany.AddElement(companySecundaryAddressParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(guia.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
            };
            cellCompany.AddElement(adicionalesEmisor);

            var cellFechaPartidaParagraph = new Paragraph
            {
                new Chunk("Fecha inicio Transporte: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Fecha_inicio_transporte.ToString("dd/MM/yyyy"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(cellFechaPartidaParagraph);

            var cellFechaLLegada = new Paragraph
            {
                new Chunk("Fecha fin Transporte: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(guia.Fecha_fin_transporte.ToString("dd/MM/yyyy"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(cellFechaLLegada);

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
                new Paragraph("GUIA DE REMISIÓN", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceTitleParagraph);

            var invoiceNumberParagraph =
                new Paragraph(guia.Numero_comprobante, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceNumberParagraph);

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellInvoice.AddElement(paragraphRuc);

            cellInvoice.AddElement(new Paragraph("Número de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(guia.Clave_acceso, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
            cellInvoice.AddElement(new Paragraph("Fecha y Hora de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(guia.fecha_autorizacion.Value.ToString("dd/MM/yyyy HH:mm:ss"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10)));
            var paragraphEnvironment = new Paragraph
            {
                new Chunk("Ambiente: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Emisor.Tipo_ambientes.Descripcion_ambiente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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
            var barcode39 = new Barcode128 { Code = guia.Clave_acceso };
            var cb = new PdfContentByte(writer);
            var code39Image = barcode39.CreateImageWithBarcode(cb, null, null);
            code39Image.ScaleAbsoluteWidth(200);
            code39Image.Alignment = Element.ALIGN_CENTER;
            cellInvoice.AddElement(code39Image);
            cellInvoice.AddElement(new Paragraph(" "));

            tableHeader.AddCell(cellInvoice);

            doc.Add(tableHeader);

            doc.Add(new Paragraph(" "));

            var tableTransportista = new PdfPTable(1);
            tableTransportista.DefaultCell.Border = Rectangle.NO_BORDER;
            tableTransportista.DefaultCell.Border = 0;
            tableTransportista.WidthPercentage = 100;

            var cellCustomer = new PdfPCell();
            cellCustomer.BorderColor = BaseColor.WHITE;
            cellCustomer.BackgroundColor = myColor;
            var paragraphDate = new Paragraph
            {
                new Chunk("RUC/CI (Transportista): ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Transportistas.Numero_identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Razón Social / Nombres y Apellidos: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Transportistas.Nombre, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("RPlaca: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Transportistas.Placa, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Punto de Partida: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(guia.Direccion_partida, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerAddress);
            tableTransportista.AddCell(cellCustomer);
            doc.Add(tableTransportista);

            doc.Add(new Paragraph(" "));
            doc.Add(new Paragraph("Destinararios"));

            foreach (var destino in guia.Guia_remision_destinatario.ToList())
            {
                var tablaDest = new PdfPTable(1);
                tablaDest.DefaultCell.Border = Rectangle.NO_BORDER;
                tablaDest.DefaultCell.Border = 0;
                tablaDest.WidthPercentage = 100;

                var cellDest = new PdfPCell();
                cellDest.BorderColor = BaseColor.WHITE;
                cellDest.BackgroundColor = myColor;
                var paragraphCompVenta = new Paragraph{
                    new Chunk("Comprobante de Venta: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Numero_Factura, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellDest.AddElement(paragraphCompVenta);
                tablaDest.AddCell(cellDest);

                var cellFecha = new PdfPCell();
                cellFecha.BorderColor = BaseColor.WHITE;
                cellFecha.BackgroundColor = myColor;
                var paragraphFecha = new Paragraph{
                    new Chunk("Fecha de Emisión:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Fecha_emision_factura.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellFecha.AddElement(paragraphFecha);
                tablaDest.AddCell(cellFecha);

                var cellAuto = new PdfPCell();
                cellAuto.BorderColor = BaseColor.WHITE;
                cellAuto.BackgroundColor = myColor;
                var paragraphAuto = new Paragraph{
                    new Chunk("Número de Autorización: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Numero_Autorizacion_fac, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellAuto.AddElement(paragraphAuto);
                tablaDest.AddCell(cellAuto);

                var cellMotivo = new PdfPCell();
                cellMotivo.BorderColor = BaseColor.WHITE;
                cellMotivo.BackgroundColor = myColor;
                var paragraphMotivo = new Paragraph{
                    new Chunk("Motivo Traslado: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Motivo_traslado, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellMotivo.AddElement(paragraphMotivo);
                tablaDest.AddCell(cellMotivo);


                var cellLlegada = new PdfPCell();
                cellLlegada.BorderColor = BaseColor.WHITE;
                cellLlegada.BackgroundColor = myColor;
                var paragraphLlegada = new Paragraph{
                    new Chunk("Destino (Punto de Llegada): ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Direccion_destino, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellLlegada.AddElement(paragraphLlegada);
                tablaDest.AddCell(cellLlegada);

                var cellRuc = new PdfPCell();
                cellRuc.BorderColor = BaseColor.WHITE;
                cellRuc.BackgroundColor = myColor;
                var paragraphRcu = new Paragraph{
                    new Chunk("RUC/CI (Destinatario): ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellRuc.AddElement(paragraphRcu);
                tablaDest.AddCell(cellRuc);

                var cellNom = new PdfPCell();
                cellNom.BorderColor = BaseColor.WHITE;
                cellNom.BackgroundColor = myColor;
                var paragraphNom = new Paragraph{
                    new Chunk("Razón Social/Nombres Apellidos: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                cellNom.AddElement(paragraphNom);
                tablaDest.AddCell(cellNom);

                var celEmail = new PdfPCell();
                celEmail.BorderColor = BaseColor.WHITE;
                celEmail.BackgroundColor = myColor;
                var paragraphEmail = new Paragraph{
                    new Chunk("Email: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Clientes.correo, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                celEmail.AddElement(paragraphEmail);
                tablaDest.AddCell(celEmail);


                var celTelf = new PdfPCell();
                celTelf.BorderColor = BaseColor.WHITE;
                celTelf.BackgroundColor = myColor;
                var paragraphTelf = new Paragraph{
                    new Chunk("Telefono: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    new Chunk(destino.Clientes.telefono_movil, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
                celTelf.AddElement(paragraphTelf);
                tablaDest.AddCell(celTelf);

                doc.Add(tablaDest);

                doc.Add(new Paragraph(" "));

                var tablaProductos = new PdfPTable(4);
                tablaProductos.DefaultCell.Border = Rectangle.NO_BORDER;
                tablaProductos.DefaultCell.Border = 0;
                tablaProductos.WidthPercentage = 100;
                tablaProductos.SetWidths(new float[] { 15f, 30f, 30f, 30f});

                var cellIndex = new PdfPCell();
                cellIndex.BorderColor = BaseColor.WHITE;
                cellIndex.BackgroundColor = myColor;
                cellIndex.AddElement(new Paragraph("Orden", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
                tablaProductos.AddCell(cellIndex);

                var cellCode = new PdfPCell();
                cellCode.BorderColor = BaseColor.WHITE;
                cellCode.BackgroundColor = myColor;
                cellCode.AddElement(new Paragraph("Cod. Principal", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
                tablaProductos.AddCell(cellCode);

                var cellDescr = new PdfPCell();
                cellDescr.BorderColor = BaseColor.WHITE;
                cellDescr.BackgroundColor = myColor;
                cellDescr.AddElement(new Paragraph("Descripción", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
                tablaProductos.AddCell(cellDescr);


                var cellQty = new PdfPCell();
                cellDescr.BorderColor = BaseColor.WHITE;
                cellDescr.BackgroundColor = myColor;
                cellDescr.AddElement(new Paragraph("Cantidad", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
                tablaProductos.AddCell(cellDescr);

                int i = 1;
                foreach (var producto in destino.Detalles_guia_remision.ToList())
                {
                    var index = new PdfPCell();
                    index.BorderColor = BaseColor.WHITE;
                    index.BackgroundColor = BaseColor.WHITE;
                    index.AddElement(new Paragraph(i.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                    i++;

                    var code = new PdfPCell();
                    code.BorderColor = BaseColor.WHITE;
                    code.BackgroundColor = BaseColor.WHITE;
                    code.AddElement(new Paragraph(producto.Producto.Codigo, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                    var descr = new PdfPCell();
                    descr.BorderColor = BaseColor.WHITE;
                    descr.BackgroundColor = BaseColor.WHITE;
                    descr.AddElement(new Paragraph(producto.Producto.Nombre, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                    var qty = new PdfPCell();
                    qty.BorderColor = BaseColor.WHITE;
                    qty.BackgroundColor = BaseColor.WHITE;
                    qty.AddElement(new Paragraph(producto.Cantidad.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                    tablaProductos.AddCell(index);
                    tablaProductos.AddCell(code);
                    tablaProductos.AddCell(descr);
                    tablaProductos.AddCell(qty);
                }

                doc.Add(tablaProductos);
            }

            doc.Add(new Paragraph(" "));

            var aditionalCell = new PdfPCell();
            aditionalCell.BorderColor = BaseColor.WHITE;
            aditionalCell.BackgroundColor = myColor;

            aditionalCell.AddElement(new Paragraph(" "));
            aditionalCell.AddElement(new Paragraph("Información Adicional", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));

            foreach (var adicional in guia.Datos_Adicionales_Guia_Remision.ToList())
            {
                var paragraphExtra = new Paragraph
            {
                new Chunk(adicional.Nombre+": ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(adicional.Descripcion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
                aditionalCell.AddElement(paragraphExtra);

            }
            doc.Add(aditionalCell);


            doc.Close();
            return File.ReadAllBytes(path);
        }


    }
}