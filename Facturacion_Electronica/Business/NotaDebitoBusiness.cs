using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.NotaDebito;
using iTextSharp.text;
using iTextSharp.text.html;
using iTextSharp.text.pdf;
using System;
using System.CodeDom;
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
    public class NotaDebitoBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private FacturaBusiness facturaBusiness = new FacturaBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        private EmailBusiness emailBusiness = new EmailBusiness();
        private const int IMPUESTO_IVA_12 = 2;

        public List<Nota_debito> BuscarNotas(ModeloBuscarNotaDebito modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Nota_debito>();
            if (ultimos)
            {
                return db.Nota_debito.Where(x => x.id_emisior == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = db.Nota_debito.Where(x=>x.id_emisior == IdEmisor).ToList();
            if (modeloBuscar.BuscarFechaDesde != null && modeloBuscar.BuscarFechaHasta != null)
            {
                var fechaHasta = modeloBuscar.BuscarFechaHasta.Value.AddDays(1);
                listado = listado.Where(x => x.id_emisior == IdEmisor && x.Fecha_creacion >= modeloBuscar.BuscarFechaDesde && x.Fecha_creacion < fechaHasta).ToList();
            }
            if (modeloBuscar.BuscarPorNumero != null && modeloBuscar.BuscarPorNumero.Trim().Length > 0 && !modeloBuscar.BuscarPorNumero.Equals("0000"))
            {
                listado = listado.Where(x => x.id_emisior == IdEmisor && x.Numero.Contains(modeloBuscar.BuscarPorNumero)).ToList();
            }
            if (modeloBuscar.BuscarPorIdCliente != null && modeloBuscar.BuscarPorIdCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisior == IdEmisor && x.Clientes.identificacion == modeloBuscar.BuscarPorIdCliente).ToList();
            }
            else if (modeloBuscar.BuscarPorNombreCliente != null && modeloBuscar.BuscarPorNombreCliente.Trim().Length > 0)
            {
                listado = listado.Where(x => x.id_emisior == IdEmisor && x.Clientes.nombre_cliente.ToUpper().Contains(modeloBuscar.BuscarPorNombreCliente.ToUpper())).ToList();
            }
            return listado;
        }

        public int GuardarNotaDebito(ModeloNotaDebito modeloNotaDebito, int idEmisor)
        {
            var notaDebito = new Nota_debito
            {
                id_emisior = idEmisor,
                id_factura_modifica = modeloNotaDebito.IdFactura,
                Id_cliente = modeloNotaDebito.Factura.Cliente.Id,
                Fecha_emision = modeloNotaDebito.FechaEmison,
                Fecha_creacion = DateTime.Now,
                id_punto_emision = modeloNotaDebito.PuntoEmisionId,
                Numero = "",
                Clave_acceso = "",
                Fecha_modificacion = DateTime.Now,
                id_porcentaje_iva = IMPUESTO_IVA_12,
                estado = EnumEstadosComprobante.PENDIENTE,
                fecha_factura_modifica = modeloNotaDebito.Factura.FechaEmison,
                numero_factura_modifica = modeloNotaDebito.Factura.Numero
            };
            db.Nota_debito.Add(notaDebito);
            db.SaveChanges();
            return notaDebito.id;
        }

        public void FinalizarNotaDebito(ModeloNotaDebito modeloNota, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == modeloNota.Id && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return;
            }
            nota.Fecha_emision = modeloNota.FechaEmison;
            nota.id_punto_emision = modeloNota.PuntoEmisionId;

            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == nota.id_punto_emision && x.Id_Documentos == EnumTipoDocumento.NOTA_DEBITO);
            if (secuencia != null)
            {
                nota.Numero = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            nota.Clave_acceso = comprobanteBusiness.GenerarClaveAcceso(nota.Fecha_emision, nota.Numero, secuencia.Tipo_documento.Codigo_doc, nota.Emisor.Ruc, nota.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            nota.estado = EnumEstadosComprobante.FINALIZADO;
            nota.Fecha_modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(nota);
        }

        public void BorrarNotaDebito(int id, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            if (nota == null && nota.estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Nota_debito.Remove(nota);
            db.SaveChanges();
        }

        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);

            if (punto == null || nota == null)
            {
                return;
            }

            nota.id_punto_emision = idPuntoEmision;
            db.SaveChanges();
        }

        public ModeloNotaDebito GetModeloNotaDebito(int id, int idEmisor)
        {
            var notaDebito = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            if (notaDebito == null)
            {
                return null;
            }
            var modelo = new ModeloNotaDebito
            {
                Id = id,
                Ambiente = notaDebito.Emisor.Tipo_ambientes.Descripcion_ambiente,
                FechaEmison = notaDebito.Fecha_emision,
                ClaveAcceso = notaDebito.Clave_acceso,
                Numero = notaDebito.Numero,
                PuntoEmisionId = notaDebito.Puntos_emisior.id,
                DireccionSucursal = notaDebito.Puntos_emisior.Direccion,
                Emisor = emisorBusiness.BuscarEmisor(notaDebito.id_emisior),
                IdFactura = notaDebito.id_factura_modifica,
                Factura = facturaBusiness.GetModeloFactura(notaDebito.id_factura_modifica, notaDebito.id_emisior),
                IdCliente = notaDebito.Id_cliente,
                Cliente = clienteBusiness.GenerarModeloCliente(notaDebito.Id_cliente),
                SubtotalSinImpuestos = notaDebito.Subtotal_sin_impuestos,
                SubtotalIva = notaDebito.Subtotal_iva,
                SubtotalIvaCero = notaDebito.Subtotal_iva_cero,
                SubtotalIce = notaDebito.Subtotal_ice,
                SubtotalExcentoIva = notaDebito.Subtotal_excento_iva,
                SubtotalNoObjetoIva = notaDebito.Subtotal_no_objeto_iva,
                ValorIva = notaDebito.Valor_iva,
                ValorIce = notaDebito.Valor_ice,
                TotalDescuento = notaDebito.Total_descuento,
                Total = notaDebito.Total,
                Estado = notaDebito.estado,
                IdPorcentajeIva = notaDebito.id_porcentaje_iva,
                Detalles = new List<ModeloDetalleNotaDebito>(),
                Adicionales = new List<ModeloDatoAdicional>(),
                Pagos = new List<ModeloNotaDebitoPago>(),
                PermiteEditarDetalles = notaDebito.estado == EnumEstadosComprobante.PENDIENTE
            };

            foreach (var detalle in notaDebito.Detalle_nota_debito.ToList())
            {
                modelo.Detalles.Add(new ModeloDetalleNotaDebito
                {
                    Id = detalle.id,
                    RazonModificacion = detalle.Razon_modificacion,
                    ValorModificacion = detalle.Valor_modificacion
                });
            }

            foreach (var pago in notaDebito.Detalle_pago_nota_debito.ToList())
            {
                modelo.Pagos.Add(new ModeloNotaDebitoPago
                {
                    Id = pago.id,
                    DescripcionFormaPago = pago.Formas_de_Pago.Descripcion_form_pago,
                    Plazo = pago.Plazo.Value,
                    Tiempo = pago.Timpo,
                    Valor = pago.Valor
                });
            }

            foreach (var dato in notaDebito.Datos_Adicionales_Nota_Debito.ToList())
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

        public void AgregarDetalle(string razon, decimal valor, int id, int idEmisor)
        {
            var notaDebito = db.Nota_debito.FirstOrDefault(x => x.id == id && x.id_emisior == idEmisor);
            if (notaDebito == null)
            {
                return;
            }

            notaDebito.Detalle_nota_debito.Add(new Detalle_nota_debito
            {
                Razon_modificacion = razon,
                Valor_modificacion = valor
            });

            var iva = notaDebito.Porcentaje_impuesto_producto;

            notaDebito.Subtotal_sin_impuestos += valor;
            if (iva.Porcentaje > 0)
            {
                notaDebito.Subtotal_iva += valor;
                notaDebito.Valor_iva += (notaDebito.Subtotal_iva * iva.Porcentaje / 100);
            }
            else if (iva.id == EnumIvaProducto.IvaCeroId)
            {
                notaDebito.Subtotal_iva_cero += valor;
            }
            else if (iva.id == EnumIvaProducto.NoObjetoIva)
            {
                notaDebito.Subtotal_no_objeto_iva += valor;
            }
            else if (iva.id == EnumIvaProducto.ExcentoIva)
            {
                notaDebito.Subtotal_excento_iva += valor;
            }


            notaDebito.Total = notaDebito.Subtotal_sin_impuestos + notaDebito.Valor_iva;

            db.SaveChanges();
        }

        public void EliminarDetalle(int id, int idNotaDebito, int idEmisor)
        {
            var notaDebito = db.Nota_debito.FirstOrDefault(x => x.id == idNotaDebito && x.id_emisior == idEmisor);
            if (notaDebito == null)
            {
                return;
            }

            var detalle = notaDebito.Detalle_nota_debito.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = notaDebito.Porcentaje_impuesto_producto;
            notaDebito.Detalle_nota_debito.Remove(detalle);

            notaDebito.Subtotal_sin_impuestos = 0;
            notaDebito.Subtotal_iva = 0;
            notaDebito.Subtotal_excento_iva = 0;
            notaDebito.Subtotal_iva_cero = 0;
            notaDebito.Subtotal_no_objeto_iva = 0;
            notaDebito.Valor_ice = 0;
            notaDebito.Valor_iva = 0;
            notaDebito.Total = 0;

            foreach (var detalleNota in notaDebito.Detalle_nota_debito.ToList())
            {
                notaDebito.Subtotal_sin_impuestos += detalleNota.Valor_modificacion;
                if (iva.Porcentaje > 0)
                {
                    notaDebito.Subtotal_iva += detalleNota.Valor_modificacion;
                    notaDebito.Valor_iva += (notaDebito.Subtotal_iva * iva.Porcentaje / 100);
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    notaDebito.Subtotal_iva_cero += detalleNota.Valor_modificacion;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    notaDebito.Subtotal_no_objeto_iva += detalleNota.Valor_modificacion;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    notaDebito.Subtotal_excento_iva += detalleNota.Valor_modificacion;
                }
            }
            notaDebito.Total = notaDebito.Subtotal_sin_impuestos + notaDebito.Valor_iva;
            db.Detalle_nota_debito.Remove(detalle);
            db.SaveChanges();
        }

        public bool ActualizarIva(int idNota, int idIva)
        {
            var nota = db.Nota_debito.Find(idNota);
            var iva = db.Porcentaje_impuesto_producto.Find(idIva);

            if (nota == null || iva == null)
            {
                return false;
            }

            nota.Subtotal_iva = 0;
            nota.Subtotal_iva_cero = 0;
            nota.Subtotal_no_objeto_iva = 0;
            nota.Subtotal_excento_iva = 0;
            nota.Valor_iva = 0;

            if (idIva == EnumIvaProducto.Iva12 || idIva == EnumIvaProducto.Iva14)
            {
                nota.Subtotal_iva = nota.Subtotal_sin_impuestos;
                nota.Valor_iva += nota.Subtotal_iva * iva.Porcentaje / 100;
            }
            else if (idIva == EnumIvaProducto.IvaCeroId)
            {
                nota.Subtotal_iva_cero = nota.Subtotal_sin_impuestos;
            }
            else if (idIva == EnumIvaProducto.NoObjetoIva)
            {
                nota.Subtotal_no_objeto_iva = nota.Subtotal_sin_impuestos;
            }
            else if (idIva == EnumIvaProducto.ExcentoIva)
            {
                nota.Subtotal_excento_iva = nota.Subtotal_sin_impuestos;
            }

            nota.Total = nota.Subtotal_sin_impuestos + nota.Valor_iva;
            nota.id_porcentaje_iva = idIva;
            db.SaveChanges();

            return true;
        }

        public void AgregarPago(ModeloNotaDebitoPago modeloPago, int idNota, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == idNota && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return;
            }

            nota.Detalle_pago_nota_debito.Add(new Detalle_pago_nota_debito
            {
                id_forma_pago = modeloPago.IdFormaPago,
                Plazo = modeloPago.Plazo,
                Timpo = modeloPago.Tiempo,
                Valor = modeloPago.Valor
            });
            nota.estado = EnumEstadosComprobante.PAGADO;
            db.SaveChanges();
        }
        public void EliminarPago(int id, int idNota, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == idNota && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return;
            }

            var detalle = nota.Detalle_pago_nota_debito.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }
            nota.Detalle_pago_nota_debito.Remove(detalle);
            db.Detalle_pago_nota_debito.Remove(detalle);
            if (!nota.Detalle_pago_nota_debito.Any())
            {
                nota.estado = EnumEstadosComprobante.PENDIENTE;
            }
            db.SaveChanges();
        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idNota, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == idNota && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return;
            }

            nota.Datos_Adicionales_Nota_Debito.Add(new Datos_Adicionales_Nota_Debito
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idNota, int idEmisor)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == idNota && x.id_emisior == idEmisor);
            if (nota == null)
            {
                return;
            }

            var detalle = nota.Datos_Adicionales_Nota_Debito.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Nota_Debito.Remove(detalle);
            db.SaveChanges();
        }

        public void GenerarXml(Nota_debito modelo)
        {
            var emisor = modelo.Emisor;
            var documentoElectronico = new Documentos_Electronicos();
            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.NOTA_DEBITO);
            var ivaActual = emisor.Porcentaje_impuesto_producto;
            var ivaCero = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.IvaCeroId);
            var ivaExcento = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.ExcentoIva);
            var ivaNoOnjeto = db.Porcentaje_impuesto_producto.FirstOrDefault(x => x.id == EnumIvaProducto.NoObjetoIva);
            var impuestoIva = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IVA);
            var impuestoIce = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.ICE);
            var impuestoIrvpnr = db.Impuestos_producto.FirstOrDefault(x => x.id == EnumImpuestoProducto.IRBPNR);
            if (emisor == null || tipoDocumento == null || ivaActual == null || ivaCero == null || ivaExcento == null || ivaNoOnjeto == null)
            {
                return;
            }
            try
            {
                var xml = new XElement("notaDebito", new XAttribute("id", "comprobante"), new XAttribute("version", "1.0.0"));
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

                var fact = new XElement("infoNotaDebito");
                fact.Add(new XElement("fechaEmision", modelo.Fecha_emision.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("tipoIdentificacionComprador", modelo.Clientes.Tipo_Identificacion1.Codigo));
                fact.Add(new XElement("razonSocialComprador", CompartidaBusiness.CleanText(modelo.Clientes.nombre_cliente)));
                fact.Add(new XElement("identificacionComprador", modelo.Clientes.identificacion));
                fact.Add(new XElement("obligadoContabilidad", emisor.Obligado_conta ? "SI" : "NO"));
                fact.Add(new XElement("codDocModificado", "01"));
                fact.Add(new XElement("numDocModificado", modelo.numero_factura_modifica));
                fact.Add(new XElement("fechaEmisionDocSustento", modelo.fecha_factura_modifica.ToString("dd/MM/yyyy")));

                fact.Add(new XElement("totalSinImpuestos", modelo.Subtotal_sin_impuestos));

                var impustosFactura = new XElement("impuestos");


                if (modelo.Valor_iva > 0)
                {
                    var itemIva = new XElement("impuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaActual.Codigo));
                    itemIva.Add(new XElement("tarifa", ivaActual.Porcentaje));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_iva));
                    itemIva.Add(new XElement("valor", modelo.Valor_iva));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_iva_cero > 0)
                {
                    var itemIva = new XElement("impuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaCero.Codigo));
                    itemIva.Add(new XElement("tarifa", "0"));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_iva_cero));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_excento_iva > 0)
                {
                    var itemIva = new XElement("impuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                    itemIva.Add(new XElement("tarifa", "0"));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_excento_iva));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }
                else if (modelo.Subtotal_no_objeto_iva > 0)
                {
                    var itemIva = new XElement("impuesto");
                    itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                    itemIva.Add(new XElement("codigoPorcentaje", ivaNoOnjeto.Codigo));
                    itemIva.Add(new XElement("tarifa", "0"));
                    itemIva.Add(new XElement("baseImponible", modelo.Subtotal_no_objeto_iva));
                    itemIva.Add(new XElement("valor", 0));
                    impustosFactura.Add(itemIva);
                }

                fact.Add(impustosFactura);

                fact.Add(new XElement("valorTotal", modelo.Total));

                //Payment
                var pay = new XElement("pagos");
                foreach (var pago in modelo.Detalle_pago_nota_debito.ToList())
                {
                    var detallePago = new XElement("pago");
                    detallePago.Add(new XElement("formaPago", pago.Formas_de_Pago.Codigo));
                    detallePago.Add(new XElement("total", pago.Valor));
                    pay.Add(detallePago);
                }

                fact.Add(pay);

                xml.Add(fact);

                var items = new XElement("motivos");
                foreach (var detalleNota in modelo.Detalle_nota_debito.ToList())
                {
                    var detalle = new XElement("motivo");
                    detalle.Add(new XElement("razon", CompartidaBusiness.CleanText(detalleNota.Razon_modificacion)));
                    detalle.Add(new XElement("valor", detalleNota.Valor_modificacion));
                    items.Add(detalle);
                }

                xml.Add(items);

                foreach (var adicional in modelo.Datos_Adicionales_Nota_Debito.ToList())
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


            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.NOTA_DEBITO });
            db.SaveChanges();
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idNota)
        {
            try
            {
                var nota = db.Nota_debito.Find(idNota);
            var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == nota.id && x.id_documento_electronico == idDocumento);
            var envioEmail = false;

            if (nota == null || comprobanteCola == null)
            {
                return;
            }


            if (comprobanteBusiness.FirmarXml(idDocumento, nota.id_emisior))
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
                var respuesta = comprobanteBusiness.EnviarXml(nota.id_emisior);
                if (respuesta.Recibido)
                {
                    Thread.Sleep(5000);
                    var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(nota.id_emisior, nota.Clave_acceso);
                    if (autorizacion.Autorizado)
                    {
                        documento.xml_retornado = autorizacion.Xml;
                        nota.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                        documento.fecha_modificacion = DateTime.Now;
                        nota.estado = EnumEstadosComprobante.AUTORIZADO;
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
                        if (!autorizacion.Estado.Equals("EXCEPCION") && comprobanteCola != null)
                        {
                            db.Cola_envio_comprobantes.Remove(comprobanteCola);

                        }

                    }
                    db.SaveChanges();
                    if (envioEmail)
                    {
                        emailBusiness.EnviarEmailNotaDebito(idNota, idDocumento);
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
                db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar factura electronica, id nota debito: {idNota}, error: {e.Message}" });
                db.SaveChanges();
            }
        }

        public byte[] GenerarRide(Nota_debito nota)
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
                new Paragraph("NOTA DE DÉBITO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
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

            tableReturnedInvoice.AddCell(returnedInvoiceCell);
            doc.Add(tableReturnedInvoice);

            doc.Add(new Paragraph(" "));

            var tableDetails = new PdfPTable(3);
            tableDetails.DefaultCell.Border = 0;
            tableDetails.WidthPercentage = 100;
            tableDetails.SetWidths(new float[] { 15f, 30f, 30f });

            var cellIndex = new PdfPCell();
            cellIndex.BorderColor = BaseColor.WHITE;
            cellIndex.BackgroundColor = myColor;
            cellIndex.AddElement(new Paragraph("Orden", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellIndex);

            var cellCode = new PdfPCell();
            cellCode.BorderColor = BaseColor.WHITE;
            cellCode.BackgroundColor = myColor;
            cellCode.AddElement(new Paragraph("Razón de la Modificación", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellCode);

            var cellDescr = new PdfPCell();
            cellDescr.BorderColor = BaseColor.WHITE;
            cellDescr.BackgroundColor = myColor;
            cellDescr.AddElement(new Paragraph("Valor de la Modificación", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            tableDetails.AddCell(cellDescr);

            int i = 1;
            foreach (var detail in nota.Detalle_nota_debito.ToList())
            {

                var index = new PdfPCell();
                index.BorderColor = BaseColor.WHITE;
                index.BackgroundColor = BaseColor.WHITE; ;
                index.AddElement(new Paragraph(i.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
                i++;

                var code = new PdfPCell();
                code.BorderColor = BaseColor.WHITE;
                code.BackgroundColor = BaseColor.WHITE; ;
                code.AddElement(new Paragraph(detail.Razon_modificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

                var descr = new PdfPCell();
                descr.BorderColor = BaseColor.WHITE;
                descr.BackgroundColor = BaseColor.WHITE; ;
                descr.AddElement(new Paragraph(detail.Valor_modificacion.ToString(), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

               
                tableDetails.AddCell(index);
                tableDetails.AddCell(code);
                tableDetails.AddCell(descr);
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

            foreach (var adicional in nota.Datos_Adicionales_Nota_Debito.ToList())
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
                        new Chunk(nota.Subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(nota.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(nota.Subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(nota.Subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(nota.Subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(nota.Subtotal_sin_impuestos+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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