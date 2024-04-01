using Facturacion_Electronica.Models.Factura;
using Facturacion_Electronica.Models.LiquidacionCompra;
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
    public class LiquidacionCompraBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private ComprobanteBusiness comprobanteBusiness = new ComprobanteBusiness();
        private EmisorBusiness emisorBusiness = new EmisorBusiness();
        private ClienteBusiness clienteBusiness = new ClienteBusiness();
        private Productobusiness productobusiness = new Productobusiness();
        public List<string> tiemposPago = new List<string>() { "NINGUNO", "DIAS", "MESES", "AÑOS" };
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Liquidacion_Compra> BuscarLiquidaciones(ModeloBuscarLiquidacion modeloBuscar, int IdEmisor, bool ultimos = false)
        {
            var listado = new List<Liquidacion_Compra>();

            if (ultimos)
            {
                return db.Liquidacion_Compra.Where(x => x.id_emisor == IdEmisor).OrderByDescending(x => x.id).Take(10).ToList();
            }

            listado = db.Liquidacion_Compra.Where(x=>x.id_emisor == IdEmisor).ToList();
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

        public ModeloLiquidacion GetModeloLiquidacion(int id, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return null;
            }
            var modelo = new ModeloLiquidacion();
            modelo.Id = liquidacion.id;
            modelo.Ambiente = liquidacion.Emisor.Tipo_ambientes.Descripcion_ambiente;
            modelo.FechaEmison = liquidacion.Fecha_emision;
            modelo.ClaveAcceso = liquidacion.Clave_de_Acceso;
            modelo.Numero = liquidacion.Numero;
            modelo.PuntoEmisionId = liquidacion.Puntos_emisior.id;
            modelo.GuiaRemision = liquidacion.Guia_de_remision;
            modelo.DireccionSucursal = liquidacion.Puntos_emisior.Direccion;
            modelo.Emisor = emisorBusiness.BuscarEmisor(liquidacion.id_emisor);
            modelo.Cliente = clienteBusiness.GenerarModeloCliente(liquidacion.id_cliente);
            modelo.SubtotalSinImpuestos = liquidacion.Subtotal_sin_impuestos;
            modelo.SubtotalIva = liquidacion.Subtotal_iva;
            modelo.SubtotalIvaCero = liquidacion.Subtotal_iva_cero;
            modelo.SubtotalIce = liquidacion.Subtotal_ice;
            modelo.SubtotalIrbpnr = liquidacion.Subtotal_irbpnr;
            modelo.SubtotalExcentoIva = liquidacion.Subtotal_excento_iva;
            modelo.SubtotalNoObjetoIva = liquidacion.Subtotal_no_objeto_iva;
            modelo.ValorIva = liquidacion.Valor_iva;
            modelo.ValorIce = liquidacion.Valor_ice;
            modelo.ValorIrbpnr = liquidacion.Valor_irbpnr;
            modelo.TotalDescuento = liquidacion.Total_descuento;
            modelo.Total = liquidacion.Total;
            modelo.Estado = liquidacion.Estado;
            modelo.Detalles = new List<ModeloLiquidacionDetalle>();
            modelo.Pagos = new List<ModeloLiquidacionPago>();
            modelo.Adicionales = new List<ModeloDatoAdicional>();
            modelo.PermiteEditarCliente = liquidacion.Estado == EnumEstadosComprobante.PENDIENTE;
            modelo.PermiteEditarDetalles = liquidacion.Estado == EnumEstadosComprobante.PENDIENTE;

            foreach (var detalle in liquidacion.Detalle_Liquidacion.ToList())
            {
                modelo.Detalles.Add(new ModeloLiquidacionDetalle
                {
                    Id = detalle.id,
                    Cantidad = detalle.Cantidad,
                    Descuento = detalle.Descuento,
                    IdProducto = detalle.id_producto,
                    Producto = productobusiness.GenerarModeloProducto(detalle.id_producto),
                    PrecioUnitario = detalle.Precio_unitario,
                    ValorIva = detalle.Valor_iva,
                    ValorIce = detalle.Valor_ice,
                    ValorIrbpnr = detalle.Valor_irbpnr,
                    Subtotal = detalle.Sub_total,
                    Total = detalle.Total,
                    Adicional = detalle.Adicional
                });
            }

            foreach (var pago in liquidacion.Detalle_pago_Liquidacion.ToList())
            {
                modelo.Pagos.Add(new ModeloLiquidacionPago
                {
                    Id = pago.id,
                    DescripcionFormaPago = pago.Formas_de_Pago.Descripcion_form_pago,
                    Plazo = pago.Plazo.Value,
                    Tiempo = pago.Timpo,
                    Valor = pago.Valor
                });
            }

            foreach (var dato in liquidacion.Datos_Adicionales_Liquidacion.ToList())
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

        public int GuardarLiquidacion(ModeloLiquidacion modeloLiquidacion, int idEmisor)
        {
            var Liquidacion = new Liquidacion_Compra
            {
                id_emisor = idEmisor,
                id_cliente = modeloLiquidacion.Cliente.Id,
                Guia_de_remision = modeloLiquidacion.GuiaRemision,
                Fecha_emision = modeloLiquidacion.FechaEmison,
                fecha_creacion = DateTime.Now,
                id_punto_emison = modeloLiquidacion.PuntoEmisionId,
                Numero = "",
                Clave_de_Acceso = "",
                fecha_modificacion = DateTime.Now,
                Estado = EnumEstadosComprobante.PENDIENTE
            };
            db.Liquidacion_Compra.Add(Liquidacion);
            db.SaveChanges();
            return Liquidacion.id;
        }

        public void CambiarPuntoEstablecimiento(int id, int idPuntoEmision, int idEmisor)
        {
            var punto = db.Puntos_emisior.FirstOrDefault(x => x.Id_emisor == idEmisor && x.id == idPuntoEmision);
            var luquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);

            if (punto == null || luquidacion == null)
            {
                return;
            }

            luquidacion.id_punto_emison = idPuntoEmision;
            db.SaveChanges();
        }

        public void AgregarProducto(int idLiquidacion, int idProducto, int idEmisor)
        {
            var producto = db.Producto.FirstOrDefault(x => x.id == idProducto && x.id_emisor == idEmisor);

            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (producto == null || liquidacion == null)
            {
                return;
            }

            var iva = producto.Porcentaje_impuesto_producto2;
            var ice = producto.Porcentaje_impuesto_producto;
            var irbpnr = producto.Porcentaje_impuesto_producto1;

            var detalle = new Detalle_Liquidacion
            {
                id_producto = idProducto,
                Cantidad = 1,
                Precio_unitario = producto.Precio,
                Sub_total = producto.Precio,
                Descuento = 0
            };
            detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
            detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
            detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
            detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;

            liquidacion.Subtotal_sin_impuestos += detalle.Sub_total;
            liquidacion.Total_descuento += detalle.Descuento;
            if (detalle.Valor_iva > 0)
            {
                liquidacion.Subtotal_iva += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.IvaCeroId)
            {
                liquidacion.Subtotal_iva_cero += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.NoObjetoIva)
            {
                liquidacion.Subtotal_no_objeto_iva += detalle.Sub_total;
            }
            else if (iva.id == EnumIvaProducto.ExcentoIva)
            {
                liquidacion.Subtotal_excento_iva += detalle.Sub_total;
            }


            if (detalle.Valor_ice > 0)
            {
                liquidacion.Subtotal_ice += detalle.Sub_total;
            }

            if (detalle.Valor_irbpnr > 0)
            {
                liquidacion.Subtotal_irbpnr += detalle.Sub_total;
            }

            liquidacion.Valor_iva += detalle.Valor_iva;
            liquidacion.Valor_ice += detalle.Valor_ice;
            liquidacion.Valor_irbpnr += detalle.Valor_irbpnr;

            liquidacion.Total_descuento += detalle.Descuento;
            liquidacion.Total += detalle.Total;

            liquidacion.Detalle_Liquidacion.Add(detalle);
            db.SaveChanges();
        }


        public void BorrarLiquidacion(int id, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == id && x.id_emisor == idEmisor);
            if (liquidacion == null && liquidacion.Estado == EnumEstadosComprobante.PENDIENTE)
            {
                return;
            }
            db.Liquidacion_Compra.Remove(liquidacion);
            db.SaveChanges();
        }

        public void ActualizarAdicionalDetalle(int id, int idLiquidacion, int idEmisor, string adicional)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null && adicional != null)
            {
                return;
            }
            detalle.Adicional = adicional;

            db.SaveChanges();
        }

        public void ActualizarPrecioDetalle(int id, int idLiquidacion, int idEmisor, decimal nuevoPrecio)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.Precio_unitario = nuevoPrecio;
            detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
            detalle.Descuento = detalle.Sub_total * (detalle.Decuento_porcentaje / 100);
            detalle.Sub_total -= detalle.Descuento;
            detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
            detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
            detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
            detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
            ActutalizarTotales(liquidacion);
            db.SaveChanges();
        }

        public void ActualizarCantidadDetalle(int id, int idLiquidacion, int idEmisor, int nuevaCantidad)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.Cantidad = nuevaCantidad;
            detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
            detalle.Descuento = detalle.Sub_total * (detalle.Decuento_porcentaje / 100);
            detalle.Sub_total -= detalle.Descuento;
            detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
            detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
            detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
            detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
            ActutalizarTotales(liquidacion);
            db.SaveChanges();
        }

        public void ActualizarPorcentajeDescuentoDetalle(int id, int idLiquidacion, int idEmisor, decimal porcentaje)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            var iva = detalle.Producto.Porcentaje_impuesto_producto2;
            var ice = detalle.Producto.Porcentaje_impuesto_producto;
            var irbpnr = detalle.Producto.Porcentaje_impuesto_producto1;

            detalle.Decuento_porcentaje = porcentaje;
            detalle.Descuento = detalle.Sub_total * (porcentaje / 100);
            detalle.Sub_total = detalle.Precio_unitario * detalle.Cantidad;
            detalle.Sub_total -= detalle.Descuento;
            detalle.Valor_ice = (detalle.Sub_total * ice.Porcentaje / 100);
            detalle.Valor_irbpnr = (detalle.Sub_total * irbpnr.Porcentaje / 100);
            detalle.Valor_iva = (detalle.Sub_total * iva.Porcentaje / 100);
            detalle.Total = detalle.Sub_total + detalle.Valor_ice + detalle.Valor_irbpnr + detalle.Valor_iva;
            ActutalizarTotales(liquidacion);
            db.SaveChanges();
        }

        public void EliminarDetalle(int id, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }
            db.Detalle_Liquidacion.Remove(detalle);
            ActutalizarTotales(liquidacion);
            db.SaveChanges();
        }

        private void ActutalizarTotales(Liquidacion_Compra liquidacion)
        {
            liquidacion.Subtotal_sin_impuestos = 0;
            liquidacion.Subtotal_iva_cero = 0;
            liquidacion.Subtotal_iva = 0;
            liquidacion.Subtotal_no_objeto_iva = 0;
            liquidacion.Subtotal_excento_iva = 0;
            liquidacion.Subtotal_ice = 0;
            liquidacion.Subtotal_irbpnr = 0;
            liquidacion.Valor_iva = 0;
            liquidacion.Valor_ice = 0;
            liquidacion.Valor_irbpnr = 0;

            liquidacion.Total_descuento = 0;
            liquidacion.Total = 0;

            foreach (var detalle in liquidacion.Detalle_Liquidacion.ToList())
            {
                var iva = detalle.Producto.Porcentaje_impuesto_producto2;
                liquidacion.Subtotal_sin_impuestos += detalle.Sub_total;

                if (detalle.Valor_iva > 0)
                {
                    liquidacion.Subtotal_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.IvaCeroId)
                {
                    liquidacion.Subtotal_iva_cero += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.NoObjetoIva)
                {
                    liquidacion.Subtotal_no_objeto_iva += detalle.Sub_total;
                }
                else if (iva.id == EnumIvaProducto.ExcentoIva)
                {
                    liquidacion.Subtotal_excento_iva += detalle.Sub_total;
                }
                if (detalle.Valor_ice > 0)
                {
                    liquidacion.Subtotal_ice += detalle.Sub_total;
                }

                if (detalle.Valor_irbpnr > 0)
                {
                    liquidacion.Subtotal_irbpnr += detalle.Sub_total;
                }
                liquidacion.Valor_iva += detalle.Valor_iva;
                liquidacion.Valor_ice += detalle.Valor_ice;
                liquidacion.Valor_irbpnr += detalle.Valor_irbpnr;

                liquidacion.Total_descuento += detalle.Descuento;
                liquidacion.Total += detalle.Total;
            }
        }

        public void ActualizarAConsumidorFinal(int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }
            liquidacion.id_cliente = EnumDatosGenerales.ID_CONSUMIDOR_FINAL;
            db.SaveChanges();
        }

        public void ActualizarCliente(int idCliente, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            if (db.Clientes.FirstOrDefault(x => x.id == idCliente && x.id_emisor == idEmisor) != null)
            {
                liquidacion.id_cliente = idCliente;
                db.SaveChanges();
            }
        }

        public void AgregarPago(ModeloLiquidacionPago modeloPago, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            liquidacion.Detalle_pago_Liquidacion.Add(new Detalle_pago_Liquidacion
            {
                id_form_pago = modeloPago.IdFormaPago,
                Plazo = modeloPago.Plazo,
                Timpo = modeloPago.Tiempo,
                Valor = modeloPago.Valor
            });
            liquidacion.Estado = EnumEstadosComprobante.PAGADO;
            db.SaveChanges();
        }
        public void EliminarPago(int id, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Detalle_pago_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }
            liquidacion.Detalle_pago_Liquidacion.Remove(detalle);
            db.Detalle_pago_Liquidacion.Remove(detalle);
            if (!liquidacion.Detalle_pago_Liquidacion.Any())
            {
                liquidacion.Estado = EnumEstadosComprobante.PENDIENTE;
            }
            db.SaveChanges();
        }

        public void AgregarDatoAcional(ModeloDatoAdicional modeloDatoAdicional, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            liquidacion.Datos_Adicionales_Liquidacion.Add(new Datos_Adicionales_Liquidacion
            {
                Nombre = modeloDatoAdicional.Nombre,
                Descripcion = modeloDatoAdicional.Descripcion
            });
            db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLiquidacion && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            var detalle = liquidacion.Datos_Adicionales_Liquidacion.FirstOrDefault(x => x.id == id);
            if (detalle == null)
            {
                return;
            }

            db.Datos_Adicionales_Liquidacion.Remove(detalle);
            db.SaveChanges();
        }

        public void FinalizarLiquidacion(ModeloLiquidacion modeloLiquidacion, int idEmisor)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == modeloLiquidacion.Id && x.id_emisor == idEmisor);
            if (liquidacion == null)
            {
                return;
            }

            liquidacion.Fecha_emision = modeloLiquidacion.FechaEmison;
            liquidacion.id_punto_emison = modeloLiquidacion.PuntoEmisionId;

            var secuencia = db.Secuencias.FirstOrDefault(x => x.Id_punto_emision == liquidacion.id_punto_emison && x.Id_Documentos == EnumTipoDocumento.LIQUIDACION_COMPRA);
            if (secuencia != null)
            {
                liquidacion.Numero = secuencia.Puntos_emisior.Numero_establecimiento + "-" + secuencia.Puntos_emisior.Numero_emision + "-" + secuencia.Secuencial.ToString("D9"); //completar con 9 ceros a la derecha
                secuencia.Secuencial++;
            }
            db.SaveChanges();

            liquidacion.Clave_de_Acceso = comprobanteBusiness.GenerarClaveAcceso(liquidacion.Fecha_emision, liquidacion.Numero, secuencia.Tipo_documento.Codigo_doc, liquidacion.Emisor.Ruc, liquidacion.Emisor.Tipo_ambientes.Codigo_ambiente, EnumTiposEmision.NORMAL);
            liquidacion.Estado = EnumEstadosComprobante.FINALIZADO;
            liquidacion.fecha_modificacion = DateTime.Now;
            db.SaveChanges();
            this.GenerarXml(liquidacion);
        }

        public void GenerarXml(Liquidacion_Compra modelo)
        {
            var emisor = modelo.Emisor;
            var documentoElectronico = new Documentos_Electronicos();
            var tipoDocumento = db.Tipo_documento.FirstOrDefault(x => x.id == EnumTipoDocumento.LIQUIDACION_COMPRA);
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
                var xml = new XElement("liquidacionCompra", new XAttribute("id", "comprobante"), new XAttribute("version", "1.1.0"));
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

                var fact = new XElement("infoLiquidacionCompra");
                fact.Add(new XElement("fechaEmision", modelo.Fecha_emision.ToString("dd/MM/yyyy")));
                fact.Add(new XElement("dirEstablecimiento", CompartidaBusiness.CleanText(modelo.Puntos_emisior.Direccion)));
                fact.Add(new XElement("obligadoContabilidad", emisor.Obligado_conta ? "SI" : "NO"));

                fact.Add(new XElement("tipoIdentificacionProveedor", modelo.Clientes.Tipo_Identificacion1.Codigo));
                fact.Add(new XElement("razonSocialProveedor", CompartidaBusiness.CleanText(modelo.Clientes.nombre_cliente)));
                fact.Add(new XElement("identificacionProveedor", modelo.Clientes.identificacion));
                fact.Add(new XElement("direccionProveedor", !string.IsNullOrEmpty(modelo.Clientes.Direccion) ? CompartidaBusiness.CleanText(modelo.Clientes.Direccion) : "SIN DIRECCION"));
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
                    Dictionary<int, string> dict = new Dictionary<int, string>();
                    using (var rdr = cmd.ExecuteReader())
                    {
                        while (rdr.Read())
                        {
                            var itemIce = new XElement("impuesto");
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
                fact.Add(new XElement("importeTotal", modelo.Total));
                fact.Add(new XElement("moneda", "USD"));

                //Payment
                var pay = new XElement("pagos");
                foreach (var pago in modelo.Detalle_pago_Liquidacion.ToList())
                {
                    var detallePago = new XElement("pago");
                    detallePago.Add(new XElement("formaPago", pago.Formas_de_Pago.Codigo));
                    detallePago.Add(new XElement("total", pago.Valor));
                    pay.Add(detallePago);
                }

                fact.Add(pay);

                xml.Add(fact);

                var items = new XElement("detalles");
                foreach (var detalleFactura in modelo.Detalle_Liquidacion.ToList())
                {
                    var detalle = new XElement("detalle");
                    detalle.Add(new XElement("codigoPrincipal", CompartidaBusiness.CleanText(detalleFactura.Producto.Codigo)));
                    detalle.Add(new XElement("descripcion", CompartidaBusiness.CleanText(detalleFactura.Producto.Nombre)));
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
                        itemIva.Add(new XElement("tarifa", decimal.Round(ivaProducto.Porcentaje, 2)));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.IvaCeroId)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaCero.Codigo));
                        itemIva.Add(new XElement("tarifa", "0"));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.NoObjetoIva)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaNoOnjeto.Codigo));
                        itemIva.Add(new XElement("tarifa", "0"));
                    }
                    else if (ivaProducto.id == EnumIvaProducto.ExcentoIva)
                    {
                        itemIva.Add(new XElement("codigo", impuestoIva.Codigo));
                        itemIva.Add(new XElement("codigoPorcentaje", ivaExcento.Codigo));
                        itemIva.Add(new XElement("tarifa", "0"));
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
                        itemIce.Add(new XElement("tarifa", decimal.Round(iceProducto.Porcentaje, 2)));
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
                        itemIrbpnr.Add(new XElement("tarifa", decimal.Round(irbpnrProducto.Porcentaje, 2)));
                        itemIrbpnr.Add(new XElement("baseImponible", detalleFactura.Sub_total));
                        itemIrbpnr.Add(new XElement("valor", detalleFactura.Valor_irbpnr));
                        impuestosProducto.Add(itemIrbpnr);
                    }

                    detalle.Add(impuestosProducto);
                    items.Add(detalle);
                }

                xml.Add(items);

                foreach (var adicional in modelo.Datos_Adicionales_Liquidacion.ToList())
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


            db.Cola_envio_comprobantes.Add(new Cola_envio_comprobantes { id_comprobante = modelo.id, id_documento_electronico = documentoElectronico.id, id_tipo_comprobante = EnumTipoDocumento.LIQUIDACION_COMPRA });
            db.SaveChanges();
        }

        public void GenerarComprobanteElectronico(int idDocumento, int idLiquidacion)
        {
            try
            {
                var liquidacion = db.Liquidacion_Compra.Find(idLiquidacion);
            var comprobanteCola = db.Cola_envio_comprobantes.FirstOrDefault(x => x.id_comprobante == liquidacion.id && x.id_documento_electronico == idDocumento);
            var envioEmail = false;

            if (liquidacion == null || comprobanteCola == null)
            {
                return;
            }

            if (comprobanteBusiness.FirmarXml(idDocumento, liquidacion.id_emisor))
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

                var respuesta = comprobanteBusiness.EnviarXml(liquidacion.id_emisor);
                if (respuesta.Recibido)
                {
                    Thread.Sleep(5000);
                    var autorizacion = comprobanteBusiness.VarificarAutorizacionComprobante(liquidacion.id_emisor, liquidacion.Clave_de_Acceso);
                    if (autorizacion.Autorizado)
                    {
                        documento.xml_retornado = autorizacion.Xml;
                        liquidacion.fecha_autorizacion = DateTime.Parse(autorizacion.FechaAutorizacion.Substring(0, 19));
                        documento.fecha_modificacion = DateTime.Now;
                        liquidacion.Estado = EnumEstadosComprobante.AUTORIZADO;
                        documento.ride = GenerarRide(liquidacion);
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
                        emailBusiness.EnviarEmailLiquidacionCompra(idLiquidacion, idDocumento);
                        return;
                    }
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
                db.Log.Add(new Log { fecha = DateTime.Now, mensaje = $"Error al generar factura electronica, id liquidacion: {idLiquidacion}, error: {e.Message}" });
                db.SaveChanges();
            }
        }

        public byte[] GenerarRide(Liquidacion_Compra liquidacion)
        {
            if (liquidacion == null)
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

            var logoPath = liquidacion.Emisor.Logo;
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
                new Paragraph(liquidacion.Emisor.Razon_social, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyBussinesNameParagraph);

            var companyCommercialNameParagraph =
                new Paragraph(liquidacion.Emisor.Nombre_comercial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 11))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellCompany.AddElement(companyCommercialNameParagraph);

            cellCompany.AddElement(new Paragraph(" "));

            var companyAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Matriz: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(liquidacion.Emisor.Direccion_matriz, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAddressParagraph);

            var companySecundaryAddressParagraph = new Paragraph
            {
                new Chunk("Dirección Sucursal: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(liquidacion.Puntos_emisior.Direccion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companySecundaryAddressParagraph);

            var companyAccountingParagraph = new Paragraph
            {
                new Chunk("Obligado a Llevar Contabilidad: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(liquidacion.Emisor.Obligado_conta?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyAccountingParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            var companyContrEspecialParagraph = new Paragraph
            {
                new Chunk("Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                new Chunk(liquidacion.Emisor.Cintirbuyente_especial?"Si":"No", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
            };
            cellCompany.AddElement(companyContrEspecialParagraph);
            cellCompany.VerticalAlignment = Element.ALIGN_LEFT;

            if (liquidacion.Emisor.Cintirbuyente_especial)
            {
                var specialTaxPayerNumberParagraph = new Paragraph
                {
                    new Chunk("Numero de Contribuyente Especial: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
                    new Chunk(liquidacion.Emisor.Numero_con_especial, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9))
                };
                cellCompany.AddElement(specialTaxPayerNumberParagraph);
            }

            cellCompany.AddElement(companySecundaryAddressParagraph);

            var adicionalesEmisor = new Paragraph
            {
                new Chunk(liquidacion.Emisor.adicionales_comprobantes??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9, Font.BOLD)),
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
                new Paragraph("LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceTitleParagraph);

            var invoiceNumberParagraph =
                new Paragraph(liquidacion.Numero, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 12, Font.BOLD))
                {
                    Alignment = Element.ALIGN_CENTER
                };
            cellInvoice.AddElement(invoiceNumberParagraph);

            var paragraphRuc = new Paragraph
            {
                new Chunk("R.U.C: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Emisor.Ruc, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            cellInvoice.AddElement(paragraphRuc);

            cellInvoice.AddElement(new Paragraph("Número de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(liquidacion.Clave_de_Acceso, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));
            cellInvoice.AddElement(new Paragraph("Fecha y Hora de Autorización:", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            cellInvoice.AddElement(new Paragraph(liquidacion.fecha_autorizacion.Value.ToString("dd/MM/yyyy HH:mm:ss"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10)));
            var paragraphEnvironment = new Paragraph
            {
                new Chunk("Ambiente: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Emisor.Tipo_ambientes.Descripcion_ambiente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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
            var barcode39 = new Barcode128 { Code = liquidacion.Clave_de_Acceso };
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
                new Chunk(liquidacion.Fecha_emision.ToString("dd/MM/yyyy HH:mm"), FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphDate);
            var paragraphCustomerDni = new Paragraph
            {
                new Chunk("Identificación: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Clientes.identificacion, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerDni);
            var paragraphCustomerName = new Paragraph
            {
                new Chunk("Razón Social / Apellidos y Nombres: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Clientes.nombre_cliente, FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer.AddElement(paragraphCustomerName);
            tableCustomer.AddCell(cellCustomer);

            var cellCustomer2 = new PdfPCell();
            cellCustomer2.BorderColor = BaseColor.WHITE;
            cellCustomer2.BackgroundColor = myColor;


            var paragraphCustomerAddress = new Paragraph
            {
                new Chunk("Dirección: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Clientes.Direccion??"SIN DIRECCION", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(paragraphCustomerAddress);

            var clienteTelefono = new Paragraph
            {
                new Chunk("Telefono: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Clientes.telefono_movil??"SIN NUMERO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteTelefono);

            var clienteCorreo = new Paragraph
            {
                new Chunk("Correo: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                new Chunk(liquidacion.Clientes.correo??"SIN CORREO", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            cellCustomer2.AddElement(clienteCorreo);
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
            foreach (var detail in liquidacion.Detalle_Liquidacion.ToList())
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
                adic.AddElement(new Paragraph(detail.Adicional??"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 9)));

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
            var tableTotal = new PdfPTable(2);
            tableTotal.DefaultCell.Border = 0;
            tableTotal.WidthPercentage = 100;

            //Informacion adicional
            var aditionalCell = new PdfPCell();
            aditionalCell.BorderColor = BaseColor.WHITE;
            aditionalCell.BackgroundColor = myColor;

            aditionalCell.AddElement(new Paragraph(" "));
            aditionalCell.AddElement(new Paragraph("Información Adicional", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)));
            foreach (var adicional in liquidacion.Datos_Adicionales_Liquidacion.ToList())
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
            foreach (var payemnt in liquidacion.Detalle_pago_Liquidacion.ToList())
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
                        new Chunk(liquidacion.Subtotal_iva_cero+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxZeroVal);

            var paragraphSubTax = new Paragraph
                    {
                        new Chunk("SUBTOTAL IVA "+Math.Round(liquidacion.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphSubTax);

            var paragraphSubTaxVal = new Paragraph
                    {
                        new Chunk(liquidacion.Subtotal_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphSubTaxVal);

            var paragraphNoObjetoIva = new Paragraph
                    {
                        new Chunk("Subtotal No Objeto IVA:  ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                    };
            totalCellLabel.AddElement(paragraphNoObjetoIva);


            var paragraphNoObjetoIvaVal = new Paragraph
                    {
                       new Chunk(liquidacion.Subtotal_no_objeto_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphNoObjetoIvaVal);

            var paragraphExcentoIva = new Paragraph
                    {
                        new Chunk("Subtotal Excento IVA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                    };
            totalCellLabel.AddElement(paragraphExcentoIva);

            var paragraphExcentoIvaVal = new Paragraph
                    {
                       new Chunk(liquidacion.Subtotal_excento_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                    };
            totalCellData.AddElement(paragraphExcentoIvaVal);

            var paragraphSubWithOutTax = new Paragraph
            {
                new Chunk("SUBTOTAL SIN IMPUESTOS: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphSubWithOutTax);

            var paragraphSubWithOutTaxVal = new Paragraph
            {
                new Chunk(liquidacion.Subtotal_sin_impuestos+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphSubWithOutTaxVal);

            var paragraphDiuscount = new Paragraph
            {
                new Chunk("DESCUENTO: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphDiuscount);

            var paragraphDiuscountVal = new Paragraph
            {
                new Chunk(liquidacion.Total_descuento+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };

            totalCellData.AddElement(paragraphDiuscountVal);


            var paragraphIvaValue = new Paragraph
                {
                    new Chunk("IVA "+Math.Round(liquidacion.Emisor.Porcentaje_impuesto_producto.Porcentaje,2)+"%: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD)),
                };
            totalCellLabel.AddElement(paragraphIvaValue);

            var paragraphIvaValueVal = new Paragraph
                {
                   new Chunk(liquidacion.Valor_iva+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIvaValueVal);

            var paragraphIceValue = new Paragraph
                {
                    new Chunk("ICE: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIceValue);

            var paragraphIceValueVal = new Paragraph
                {
                    new Chunk(liquidacion.Valor_ice+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIceValueVal);


            var paragraphIRBPNRValue = new Paragraph
                {
                    new Chunk("IRBPNR: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
                };
            totalCellLabel.AddElement(paragraphIRBPNRValue);

            var paragraphIRBPNRValueVal = new Paragraph
                {
                    new Chunk(liquidacion.Valor_irbpnr+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
                };
            totalCellData.AddElement(paragraphIRBPNRValueVal);


            var paragraphTip = new Paragraph
            {
                new Chunk("PROPINA: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTip);

            var paragraphTipVal = new Paragraph
            {
                new Chunk(liquidacion.Propina+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
            };
            totalCellData.AddElement(paragraphTipVal);

            var paragraphTotal = new Paragraph
            {
                new Chunk("VALOR TOTAL: ", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10, Font.BOLD))
            };
            totalCellLabel.AddElement(paragraphTotal);

            var paragraphTotalVal = new Paragraph
            {
                new Chunk(liquidacion.Total+"", FontFactory.GetFont(FontFactory.TIMES_ROMAN, 10))
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