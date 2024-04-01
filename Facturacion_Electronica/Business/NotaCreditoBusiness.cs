using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.NotaCredito;
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
    public class NotaCreditoBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Nota_credito> BuscarNotas(ModeloBuscarNotaCredito modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Nota_credito>();

            if (ultimos)
            {
                return db.Nota_credito.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = listado = db.Nota_credito.Where(x=>x.id_emisor == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisor == IdEmisor && x.Fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.Fecha_creacion < fechaHasta).ToList();
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

        public ModeloNotaCredito GetModeloNotaCredito(int id, int idEmisor)
        {
            var notaCredito = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (notaCredito == null)
            {
                return null;
            }
            var modelo = new ModeloNotaCredito();
            modelo.Id = id;
            modelo.Ambiente = notaCredito.Emisor.Tipo_ambientes.Descripcion_ambiente;
            modelo.FechaEmison = notaCredito.Fecha_emision;
            modelo.ClaveAcceso = notaCredito.Clave_acceso;
            modelo.Numero = notaCredito.Numero;
            modelo.PuntoEmisionId = notaCredito.Puntos_emisior.id;
            modelo.DireccionSucursal = notaCredito.Puntos_emisior.Direccion;
            modelo.Emisor = emisorBusiness.BuscarEmisor(notaCredito.id_emisor);
            modelo.IdFactura = notaCredito.id_factura_devolver;
            modelo.Factura = facturaBusiness.GetModeloFactura(notaCredito.id_factura_devolver, notaCredito.id_emisor);
            modelo.IdCliente = notaCredito.id_cliente;
            modelo.Cliente = clienteBusiness.GenerarModeloCliente(notaCredito.id_cliente);
            modelo.SubtotalSinImpuestos = notaCredito.sumtota_sin_impuesto;
            modelo.SubtotalIva = notaCredito.subtotal_iva;
            modelo.SubtotalIvaCero = notaCredito.subtotal_iva_cero;
            modelo.SubtotalIce = notaCredito.subtotal_ice;
            modelo.SubtotalIrbpnr = notaCredito.subtotal_irbpnr;
            modelo.SubtotalExcentoIva = notaCredito.subtotal_excento_iva;
            modelo.SubtotalNoObjetoIva = notaCredito.subtotal_no_objeto_iva;
            modelo.ValorIva = notaCredito.Valor_iva;
            modelo.ValorIce = notaCredito.Valor_ice;
            modelo.ValorIrbpnr = notaCredito.Valor_irbpnr;
            modelo.TotalDescuento = notaCredito.Total_descuento;
            modelo.Total = notaCredito.Total;
            modelo.Estado = notaCredito.Estado;
            modelo.Detalles = new List<ModeloNotaCreditoDetalle>();
            modelo.Adicionales = new List<ModeloDatoAdicional>();

            foreach (var detalle in notaCredito.Detalle_nota_credito.ToList())
            {
                modelo.Detalles.Add(new ModeloNotaCreditoDetalle
                {
                    Id = detalle.id,
                    Producto = productobusiness.GenerarModeloProducto(detalle.id_producto),
                    Cantidad = detalle.Cantidad,
                    Descuento = detalle.Descuento,
                    PrecioUnitario = detalle.Precio,
                    ValorIva = detalle.Valor_iva,
                    ValorIce = detalle.Valor_ice,
                    ValorIrbpnr = detalle.Valor_irbpnr,
                    Subtotal = detalle.Subtotal,
                    Total = detalle.Total
                });
            }

            foreach (var dato in notaCredito.Datos_Adicionales_Nota_Credito.ToList())
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

        public int GuardarNotaCredito(ModeloNotaCredito modeloNotaCredito, int idEmisor)
        {
            var notaCretido = new Nota_credito
            {
                id_emisor = idEmisor,
                id_factura_devolver = modeloNotaCredito.IdFactura,
                id_cliente = modeloNotaCredito.Factura.Cliente.Id,
                Fecha_emision = modeloNotaCredito.FechaEmison,
                Fecha_creacion = DateTime.Now,
                id_punto_emision = modeloNotaCredito.PuntoEmisionId,
                Numero = "",
                Clave_acceso = "",
                Fecha_modificacion = DateTime.Now,
                Estado = EnumEstadosComprobante.PENDIENTE,
                fecha_emision_fc_mod = modeloNotaCredito.Factura.FechaEmison,
                motivo = ".",
                Numero_fc_mod = modeloNotaCredito.Factura.Numero
            };
            db.Nota_credito.Add(notaCretido);
            db.SaveChanges();
            return notaCretido.id;
        }

        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (punto == null || nota == null)
            {
                return;
            }

            nota.id_punto_emision = idPuntoEmision;
            db.SaveChanges();
        }

        public void FinalizarNotaCredito(ModeloNotaCredito modeloNotaCredito, int idEmisor)
        {
            var notaCredito = db.Nota_credito.FirstOrDefault(x => x.id == modeloNotaCredito.Id && x.id_emisor == idEmisor);
            if (notaCredito == null)
            {
                return;
            }
            notaCredito.id_punto_emision = modeloNotaCredito.PuntoEmisionId;
            notaCredito.Fecha_emision = modeloNotaCredito.FechaEmison;
            notaCredito.motivo = modeloNotaCredito.Motivo;

            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == notaCredito.id_punto_emision && x.Id_Documentos == EnumTipoDocumento.NOTA_CREDITO);
            if (secuencia != null)
            {
                notaCredito.Numero = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            foreach (var detalleNotaCredito in modeloNotaCredito.Detalles.Where(x => x.Seleccionar).ToList())
            {
                var detalleFactura = db.Detalle_factura.Find(detalleNotaCredito.IdDetalleFactura);
                var detalle = new Detalle_nota_credito
                {
                    id_producto = detalleFactura.id_producto,
                    Cantidad = detalleNotaCredito.Cantidad,
                    Precio = detalleFactura.Precio_unitario,
                    Subtotal = decimal.Round(detalleNotaCredito.Cantidad * detalleFactura.Precio_unitario, 2),
                    Descuento = decimal.Round((detalleFactura.Descuento / detalleFactura.Cantidad) * detalleNotaCredito.Cantidad, 2),
                    Valor_ice = decimal.Round((detalleFactura.Valor_ice / detalleFactura.Cantidad) * detalleNotaCredito.Cantidad, 2),
                    Valor_irbpnr = decimal.Round((detalleFactura.Valor_irbpnr / detalleFactura.Cantidad) * detalleNotaCredito.Cantidad, 2),
                    Valor_iva = decimal.Round((detalleFactura.Valor_iva / detalleFactura.Cantidad) * detalleNotaCredito.Cantidad, 2),
                    Total = decimal.Round((detalleFactura.Total / detalleFactura.Cantidad) * detalleNotaCredito.Cantidad, 2)
                };
                detalle.Subtotal -= detalle.Descuento;
                notaCredito.Detalle_nota_credito.Add(detalle);
                notaCredito.sumtota_sin_impuesto += detalle.Subtotal - detalle.Descuento;
                var iva = detalleFactura.Producto.Porcentaje_impuesto_producto2;
                //notaCredito.subtotal_ice += detall
                if (detalle.Valor_iva == 0)
                {
                    if (iva.id == EnumIvaProducto.IvaCeroId)
                    {
                        notaCredito.subtotal_iva_cero += detalle.Subtotal;
                    }
                    else if (iva.id == EnumIvaProducto.NoObjetoIva)
                    {
                        notaCredito.subtotal_no_objeto_iva += detalle.Subtotal;
                    }
                    else if (iva.id == EnumIvaProducto.ExcentoIva)
                    {
                        notaCredito.subtotal_excento_iva += detalle.Subtotal;
                    }
                }
                else
                {
                    notaCredito.subtotal_iva += detalle.Subtotal;
                }

                notaCredito.Valor_iva += detalle.Valor_iva;
                notaCredito.Valor_ice += detalle.Valor_ice;
                notaCredito.Valor_irbpnr += detalle.Valor_irbpnr;

                notaCredito.Total_descuento += detalle.Descuento;
                notaCredito.Total += detalle.Total;
            }

            notaCredito.Clave_acceso = comprobanteBusiness.GenerarClaveAcceso(notaCredito.Fecha_emision, notaCredito.Numero, secuencia.Tipo_documento.Codigo_doc, notaCredito.Emisor.Ruc, notaCredito.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            notaCredito.Estado = EnumEstadosComprobante.FINALIZADO;
            notaCredito.Fecha_modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(notaCredito);
        }

        public void BorrarNotaCredito(int id, int idEmisor)
        {
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (nota == null && nota.Estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Nota_credito.Remove(nota);
            db.SaveChanges();
        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idRetencion, int idEmisor)
        {
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == idRetencion && x.id_emisor == idEmisor);
            if (nota == null)
            {
                return;
            }

            nota.Datos_Adicionales_Nota_Credito.Add(new Datos_Adicionales_Nota_Credito
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idNotaCredito, int idEmisor)
        {
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == idNotaCredito && x.id_emisor == idEmisor);
            if (nota == null)
            {
                return;
            }

            var detalle = nota.Datos_Adicionales_Nota_Credito.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Nota_Credito.Remove(detalle);
            db.SaveChanges();
        }

        public void GenerarXml(Nota_credito modelo)
        {
            var documentoElectronico = new Documentos_Electronicos();

            var emisor = modelo.Emisor;

            var tipoDocumentoFactura = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.FACTURA);
            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.NOTA_CREDITO);
            var ivaActual = emisor.Porcentaje_impuesto_producto;
            var ivaCero = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.IvaCeroId);
            var ivaExcento = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.ExcentoIva);
            var ivaNoOnjeto = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.NoObjetoIva);
            var impuestoIva = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IVA);
            var impuestoIce = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.ICE);
            var impuestoIrvpnr = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IRBPNR);
            string contenidoXml = "";
            if (emisor == null || tipoDocumento == null || ivaActual == null || ivaCero == null || ivaExcento == null || ivaNoOnjeto == null)
            {
                return;
            }
            try
            {
                var xml = new XElement("notaCredito", new XAttribute("id", "comprobante"), new XAttribute("version", "1.1.0"));
                var trib = new XElement("infoTributaria");
                trib.Add(new XElement("ambiente", emisor.Tipo_ambientes.Codigo_ambiente));
                trib.Add(new XElement("tipoEmision", EnumTiposEmision.NORMAL));
                trib.Add(new XElement("razonSocial", CompartidaBusiness.CleanText(emisor.Razon_social)));
                trib.Add(new XElement("nombreComercial", CompartidaBusiness.CleanText(emisor.Nombre_comercial)));
                trib.Add(new XElement("ruc", emisor.Ruc));
                trib.Add(new XElement("claveAcceso", modelo.Clave_acceso));
                trib.Add(new XElement("codDoc", tipoDocumento.Codigo_doc));
                var numero = modelo.Numero.Split('-');
                trib.Add(new XElement("estab", modelo.Puntos_emisior.Numero_establecimiento));
                trib.Add(new XElement("ptoEmi", modelo.Puntos_emisior.Numero_emision));
                trib.Add(new XElement("secuencial", numero[2]));
                trib.Add(new XElement("dirMatriz", CompartidaBusiness.CleanText(emisor.Direccion_matriz)));
                xml.Add(trib);

                var nota = new XElement("infoNotaCredito");
                nota.Add(new XElement("fechaEmision", modelo.Fecha_emision.ToString("dd/MM/yyyy")));
                nota.Add(new XElement("dirEstablecimiento", CompartidaBusiness.CleanText(modelo.Puntos_emisior.Direccion)));
                nota.Add(new XElement("tipoIdentificacionComprador", modelo.Clientes.Tipo_Identificacion1.Codigo));
                nota.Add(new XElement("razonSocialComprador", CompartidaBusiness.CleanText(modelo.Clientes.nombre_cliente)));
                nota.Add(new XElement("identificacionComprador", modelo.Clientes.identificacion));
                nota.Add(new XElement("obligadoContabilidad", emisor.Obligado_conta ? "SI" : "NO"));

                nota.Add(new XElement("codDocModificado", tipoDocumentoFactura.Codigo_doc));
                nota.Add(new XElement("numDocModificado", modelo.Factura.Numero));
                nota.Add(new XElement("fechaEmisionDocSustento", modelo.Factura.Fecha_emision.ToString("dd/MM/yyyy")));
                nota.Add(new XElement("totalSinImpuestos", modelo.sumtota_sin_impuesto));
                nota.Add(new XElement("valorModificacion", modelo.Total));
                nota.Add(new XElement("moneda", "USD"));

                var impustosNotaCredito = new XElement("totalConImpuestos");

                if (modelo.Valor_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaActual.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.subtotal_iva));
                    itemIva.Add(new XElement("valor", modelo.Valor_iva));
                    impustosNotaCredito.Add(itemIva);
                }
                else if (modelo.subtotal_iva_cero > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaCero.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.subtotal_iva_cero));
                    itemIva.Add(new XElement("valor", 0));
                    impustosNotaCredito.Add(itemIva);
                }
                else if (modelo.subtotal_excento_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.subtotal_excento_iva));
                    itemIva.Add(new XElement("tarifa", 0));
                    impustosNotaCredito.Add(itemIva);
                }
                else if (modelo.subtotal_no_objeto_iva > 0)
                {
                    var itemIva = new XElement("totalImpuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaNoOnjeto.Codigo));
                    itemIva.Add(new XElement("baseImponible", modelo.subtotal_no_objeto_iva));
                    itemIva.Add(new XElement("tarifa", 0));
                    impustosNotaCredito.Add(itemIva);
                }

                nota.Add(impustosNotaCredito);
                nota.Add(new XElement("motivo", modelo.motivo));
                xml.Add(nota);

                var items = new XElement("detalles");
                foreach (var detalle in modelo.Detalle_nota_credito.ToList())
                {
                    var detail = new XElement("detalle");
                    detail.Add(new XElement("codigoInterno", CompartidaBusiness.CleanText(detalle.Producto.Codigo)));
                    detail.Add(new XElement("descripcion", CompartidaBusiness.CleanText(detalle.Producto.Nombre)));
                    detail.Add(new XElement("cantidad", detalle.Cantidad));
                    detail.Add(new XElement("precioUnitario", detalle.Precio));
                    detail.Add(new XElement("descuento", detalle.Descuento));
                    detail.Add(new XElement("precioTotalSinImpuesto", detalle.Subtotal));

                    var impuestosProducto = new XElement("impuestos");
                    var ivaProducto = detalle.Producto.Porcentaje_impuesto_producto2;
                    var iceProducto = detalle.Producto.Porcentaje_impuesto_producto;
                    var irbpnrProducto = detalle.Producto.Porcentaje_impuesto_producto1;

                    //Impuesto IVA
                    var itemIva = new XElement("impuesto");
                    if (detalle.Valor_iva > 0)
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
                    itemIva.Add(new XElement("baseImponible", detalle.Subtotal));
                    itemIva.Add(new XElement("valor", detalle.Valor_iva));
                    impuestosProducto.Add(itemIva);

                    //Impuesto ICE
                    if (detalle.Valor_ice > 0)
                    {
                        var itemIce = new XElement("impuesto");
                        itemIce.Add(new XElement("codigo", impuestoIce.Codigo));
                        itemIce.Add(new XElement("codigoPorcentaje", iceProducto.Codigo));
                        itemIce.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                        itemIce.Add(new XElement("baseImponible", detalle.Subtotal));
                        itemIce.Add(new XElement("valor", detalle.Valor_ice));
                        impuestosProducto.Add(itemIce);
                    }

                    //Impuesto IRBPNR
                    if (detalle.Valor_irbpnr > 0)
                    {
                        var itemIrbpnr = new XElement("impuesto");
                        itemIrbpnr.Add(new XElement("codigo", impuestoIrvpnr.Codigo));
                        itemIrbpnr.Add(new XElement("codigoPorcentaje", irbpnrProducto.Codigo));
                        itemIrbpnr.Add(new XElement("tarifa", ivaProducto.Porcentaje));
                        itemIrbpnr.Add(new XElement("baseImponible", detalle.Subtotal));
                        itemIrbpnr.Add(new XElement("valor", detalle.Valor_irbpnr));
                        impuestosProducto.Add(itemIrbpnr);
                    }
                    detail.Add(impuestosProducto);
                    items.Add(detail);
                }

                xml.Add(items);

                foreach (var adicional in modelo.Datos_Adicionales_Nota_Credito.ToList())
                {
                    var extra = new XElement("infoAdicional");
                    extra.Add(new XElement("campoAdicional", adicional.Descripcion, new XAttribute("nombre", adicional.Nombre)));
                    xml.Add(extra);
                }

                var documento = new XDocument(xml);
                documentoElectronico.id_comprobante = modelo.id;
                documentoElectronico.id_tipo_comprobante = tipoDocumento.id;
                documentoElectronico.xml_generado = documento.ToString();
                contenidoXml = documento.ToString();
                db.Documentos_Electronicos.Add(documentoElectronico);
                db.SaveChanges();
            }
            catch (Exception ex)
            {
                documentoElectronico.mensajes = ex.ToString();
            }

            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.NOTA_CREDITO });
            db.SaveChanges();
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idNota)
        {
            try
            {
                var nota = db.Nota_credito.Find(idNota);
            var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == nota.id && x.id_documento_electronico == idDocumento);
            var envioEmail = false;

            if (nota == null || comprobanteCola == null)
            {
                return;
            }

            if (comprobanteBusiness.FirmarXml(idDocumento, nota.id_emisor))
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
                var respuesta = comprobanteBusiness.EnviarXml(nota.id_emisor);
                if (respuesta.Recibido)
                {
                    Thread.Sleep(5000);
                    var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(nota.id_emisor, nota.Clave_acceso);
                    if (autorizacion.Autorizado)
                    {
                        documento.xml_retornado = autorizacion.Xml;
                        nota.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                        documento.fecha_modificacion = DateTime.Now;
                        nota.Estado = EnumEstadosComprobante.AUTORIZADO;
                        documento.ride = GenerarRide(nota);
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
                        if (autorizacion.Estado != null && !autorizacion.Estado.Equals("EXCEPCION") && comprobanteCola != null)
                        {
                            db.Cola_envio_comprobantes.Remove(comprobanteCola);
                        }
                    }

                    db.SaveChanges();
                    if (envioEmail)
                    {
                        emailBusiness.EnviarEmailNotaCredito(idNota, idDocumento);
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
                db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar factura electronica, id nota credito: {idNota}, error: {e.Message}" });
                db.SaveChanges();
            }
        }

        public byte[] GenerarRide(Nota_credito nota)
        {
            if (nota == null)
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

            var logoPath = nota.Emisor.Logo;
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
                new Paragraph(nota.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(nota.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(nota.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companySecundaryAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Sucursal: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(nota.Puntos_emisior.Direccion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companySecundaryAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(nota.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            var companyContrEspecialParagraph = new Paragraph
            {
                new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(nota.Emisor.Cintirbuyente_especial?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyContrEspecialParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (nota.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Numero de Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(nota.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            cellCompany.AddElement(companySecundaryAddressParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(nota.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
            };
            cellCompany.AddElement(adicionalesEmisor);
            cellCompany.AddElement(new Paragraph(" "));

            subTableHeader.AddCell(cellCompany);


            var cellSubTableHeader = new PdfPCell();
            cellSubTableHeader.BorderColor = BaseColor.WHITE;
            cellSubTableHeader.AddElement(subTableHeader);

            tableHeader.AddCell(cellSubTableHeader);

            // Company Invoice
            var cellNota = new PdfPCell { Colspan = 1 };
            cellNota.BorderColor = BaseColor.WHITE;
            cellNota.BackgroundColor = myColor;
            var invoiceTitleParagraph =
                new Paragraph("NOTA DE CRÉDITO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellNota.AddElement(invoiceTitleParagraph);

            var invoiceNumberParagraph =
                new Paragraph(nota.Numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellNota.AddElement(invoiceNumberParagraph);

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellNota.AddElement(paragraphRuc);

            cellNota.AddElement(new Paragraph("Número de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellNota.AddElement(new Paragraph(nota.Clave_acceso, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
            cellNota.AddElement(new Paragraph("Fecha y Hora de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellNota.AddElement(new Paragraph(nota.fecha_autorizacion.Value.ToString("dd/MM/yyyy HH:mm:ss"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10)));
            var paragraphEnvironment = new Paragraph
            {
                new Chunk("Ambiente: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Emisor.Tipo_ambientes.Descripcion_ambiente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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
            var barcode39 = new Barcode128 { Code = nota.Clave_acceso };
            var cb = new PdfContentByte(writer);
            var code39Image = barcode39.CreateImageWithBarcode(cb, null, null);
            code39Image.ScaleAbsoluteWidth(200);
            code39Image.Alignment = Element.ALIGN_CENTER;
            cellNota.AddElement(code39Image);
            cellNota.AddElement(new Paragraph(" "));

            tableHeader.AddCell(cellNota);

            doc.Add(tableHeader);

            doc.Add(new Paragraph(" "));

            // Customer Information
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
                new Chunk(nota.Fecha_emision.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            tableCustomer.AddCell(cellCustomer);

            var cellCustomer2 = new PdfPCell();
            cellCustomer2.BorderColor = BaseColor.WHITE;
            cellCustomer2.BackgroundColor = myColor;


            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(paragraphCustomerAddress);

            var clienteTelefono = new Paragraph
            {
                new Chunk("Telefono: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Clientes.telefono_movil??"SIN NUMERO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteTelefono);

            var clienteCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteCorreo);
            doc.Add(tableCustomer);

            var tableReturnedInvoice = new PdfPTable(1);
            tableReturnedInvoice.DefaultCell.Border = Rectangle.NO_BORDER;
            tableReturnedInvoice.DefaultCell.Border = 0;
            tableReturnedInvoice.WidthPercentage = 100;

            var returnedInvoiceCell = new PdfPCell();
            returnedInvoiceCell.BorderColor = BaseColor.WHITE;
            returnedInvoiceCell.BackgroundColor = myColor;
            var paragraphNumber = new Paragraph
            {
                new Chunk("Comprobante que se modifica: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Factura.Numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            returnedInvoiceCell.AddElement(paragraphNumber);
            var paragraphReturnedInvoiceDate = new Paragraph
            {
                new Chunk("Fecha Emisión (Comprobante a modificar): ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.Factura.Fecha_emision.ToString("dd/MM/yyyy"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            returnedInvoiceCell.AddElement(paragraphReturnedInvoiceDate);
            var paragraphReason = new Paragraph
            {
                new Chunk("Razón de Modificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(nota.motivo, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            returnedInvoiceCell.AddElement(paragraphReason);
            tableReturnedInvoice.AddCell(returnedInvoiceCell);
            doc.Add(tableReturnedInvoice);

            doc.Add(new Paragraph(" "));

            var tableDetails = new PdfPTable(7);
            tableDetails.DefaultCell.Border = 0;
            tableDetails.WidthPercentage = 100;
            tableDetails.SetWidths(new float[] { 15f, 30f, 30f, 30f, 30f, 30f, 30f});

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
            foreach (var detail in nota.Detalle_nota_credito.ToList())
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

                var price = new PdfPCell();
                price.BorderColor = BaseColor.WHITE;
                price.BackgroundColor = BaseColor.WHITE; ;
                price.AddElement(new Paragraph(detail.Precio + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

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
                total.AddElement(new Paragraph(detail.Subtotal + "", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                tableDetails.AddCell(index);
                tableDetails.AddCell(code);
                tableDetails.AddCell(descr);
                tableDetails.AddCell(price);
                tableDetails.AddCell(qty);
                tableDetails.AddCell(discount);
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

            foreach (var adicional in nota.Datos_Adicionales_Nota_Credito.ToList())
            {
                var paragraphExtra = new Paragraph
            {
                new Chunk(adicional.Nombre+": ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(adicional.Descripcion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
                aditionalCell.AddElement(paragraphExtra);

            }
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
                        new Chunk(nota.subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(nota.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(nota.subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(nota.subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(nota.subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(nota.sumtota_sin_impuesto+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphSubWithOutTaxVal);

            var paragraphDiuscount = new Paragraph
            {
                new Chunk("DESCUENTO: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphDiuscount);

            var paragraphDiuscountVal = new Paragraph
            {
                new Chunk(nota.Total_descuento+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            totalCellData.AddElement(paragraphDiuscountVal);


            var paragraphIvaValue = new Paragraph
                {
                    new Chunk("IVA "+Math.Round(nota.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                };
            totalCellLabel.AddElement(paragraphIvaValue);

            var paragraphIvaValueVal = new Paragraph
                {
                   new Chunk(nota.Valor_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIvaValueVal);

            var paragraphIceValue = new Paragraph
                {
                    new Chunk("ICE: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIceValue);

            var paragraphIceValueVal = new Paragraph
                {
                    new Chunk(nota.Valor_ice+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIceValueVal);


            var paragraphIRBPNRValue = new Paragraph
                {
                    new Chunk("IRBPNR: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIRBPNRValue);

            var paragraphIRBPNRValueVal = new Paragraph
                {
                    new Chunk(nota.Valor_irbpnr+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIRBPNRValueVal);

            var paragraphTotal = new Paragraph
            {
                new Chunk("VALOR TOTAL: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTotal);

            var paragraphTotalVal = new Paragraph
            {
                new Chunk(nota.Total+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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