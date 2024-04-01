using ElectronicBilling.Business.DigitalSign;
using ElectronicBilling.WebServices;
using Facturacion_Electronica.Models.Comprobantes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using System.Xml;
using System.Xml.Linq;

namespace Facturacion_Electronica.Business
{
    public class ComprobanteBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        public string GenerarClaveAcceso(DateTime fecha, string numero, string codigoDocumento, string ruc, string codigoAmbiente, string tipoEmision)
        {
            var key = fecha.ToString("dd/MM/yyyy").Replace("/", ""); //Date without division 
            key += codigoDocumento;//The document code
            key += ruc; //The ruc of the company
            key += codigoAmbiente; //the code of the environment
            key += numero.Replace("-", ""); //The number without division
            key += GetNumericCode(); //The numeric code
            key += tipoEmision; //The code of the emissionType
            key += GetCheckDigit(key); //The check digit
            return key;
        }
        private string GetCheckDigit(string line)
        {
            var cont = 2;
            var acum = 0;
            for (var i = (line.Length - 1); i >= 0; i--)
            {
                switch (cont)
                {
                    case 2:
                        acum += int.Parse(line.Substring(i, 1)) * 2;
                        cont++;
                        break;
                    case 3:
                        acum += int.Parse(line.Substring(i, 1)) * 3;
                        cont++;
                        break;
                    case 4:
                        acum += int.Parse(line.Substring(i, 1)) * 4;
                        cont++;
                        break;
                    case 5:
                        acum += int.Parse(line.Substring(i, 1)) * 5;
                        cont++;
                        break;
                    case 6:
                        acum += int.Parse(line.Substring(i, 1)) * 6;
                        cont++;
                        break;
                    case 7:
                        acum += int.Parse(line.Substring(i, 1)) * 7;
                        cont = 2;
                        break;
                }
            }
            acum = acum % 11;
            var ver = 11 - acum;
            switch (ver)
            {
                case 11:
                    return ("0");
                case 10:
                    return ("1");
                default:
                    return ver.ToString();
            }
        }
        private string GetNumericCode()
        {
            var cod = "";
            var r = new Random();
            for (var i = 0; i < 4; i++)
            {
                var random = r.Next(10, 99);
                cod = cod + "" + random;
            }
            return cod;
        }

        public bool FirmarXml(int idComprobante, int idEmisor)
        {
            try
            {
                string ubicacionXml = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos) + "ComprobanteGenerado.xml";
                string ubicacionXmlFirmado = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos);

                var emisor = db.Emisor.Find(idEmisor);
                var comprobante = db.Documentos_Electronicos.Find(idComprobante);
                if (emisor == null || comprobante == null || string.IsNullOrEmpty(emisor.Archivo_firma))
                {
                    if (emisor == null)
                    {
                        comprobante.mensajes =  "Emisor no existe";
                    }
                    if (comprobante == null)
                    {
                        comprobante.mensajes = "Comprobante no existe";
                    }
                    if (string.IsNullOrEmpty(emisor.Archivo_firma))
                    {
                        comprobante.mensajes = "Documento firma no existe";
                    }

                    comprobante.fecha_modificacion = DateTime.Now;
                    db.SaveChanges();
                    return false;
                }

                try
                {
                    //Guardar xml en carpeta local
                    XmlDocument doc = new XmlDocument();
                    doc.LoadXml(comprobante.xml_generado);
                    doc.Save(ubicacionXml);

                    XadEsbesSignature.Sign(ubicacionXml, emisor.Archivo_firma, emisor.Contrasena, ubicacionXmlFirmado, "ComprobanteFirmado.xml");

                    // XmlDocument doc = new XmlDocument();
                    //doc.Load();

                    // comprobante.xml_firmado = System.IO.File.ReadAllText(ubicacionXmlFirmado + "ComprobanteFirmado.xml");
                    comprobante.fecha_modificacion = DateTime.Now;
                    db.SaveChanges();
                    return true;
                }
                catch (Exception e)
                {
                    comprobante.mensajes = comprobante.mensajes + "\n" + e.Message;
                    comprobante.fecha_modificacion = DateTime.Now;
                    db.SaveChanges();
                    return false;
                }
            }
            catch (Exception e)
            {
                db.Log.Add(new Log { fecha=DateTime.Now, mensaje = $"Error al firmar documento xml, id documento: {idComprobante}, id emisor: {idEmisor}, error: {e.Message}"});
                db.SaveChanges();
                return false;
            }
        }

        public RespuestaEnvioComprobante EnviarXml(int idEmisor)
        {
            EnvioComprobantes envio = new EnvioComprobantes();

            var emisor = db.Emisor.Find(idEmisor);

            if (emisor == null)
            {
                return new RespuestaEnvioComprobante { Estado = null, Recibido = false, Mensajes = "Emisor no encontrado" };
            }
            return envio.Enviar(emisor.Tipo_ambientes.Url_servicio_recepcion);
        }

        public RespuestaAutorizacion VarificarAutorizacionComprobante(int idEmisor, string claveAcceso)
        {
            VerificarComprobante verificacion = new VerificarComprobante();

            var emisor = db.Emisor.Find(idEmisor);

            if (emisor == null)
            {
                return new RespuestaAutorizacion { Estado = "ERROR", Autorizado = false, Mensaje = "Emisor no encontrado" };
            }
            return verificacion.Verificar(emisor.Tipo_ambientes.Url_servicio_Autorizacion, claveAcceso);
        }

        public void ProcesarComprobantesElectronico()
        {

            foreach (var comprobante in db.Cola_envio_comprobantes.ToList())
            {
                switch (comprobante.id_tipo_comprobante)
                {
                    case 1:
                        {
                            new FacturaBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);
                            break;
                        }

                    case 2:
                        {
                            new LiquidacionCompraBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);
                            break;
                        }

                    case 3:
                        {

                            new NotaCreditoBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);
                            break;
                        }

                    case 4:
                        {
                            new NotaDebitoBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);

                            break;
                        }

                    case 5:
                        {

                            new GuiaRemisionBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);

                            break;
                        }

                    case 6:
                        {

                            new RetencionBusiness().GenerarComprobanteElectronico(comprobante.id_documento_electronico, comprobante.id_comprobante);

                            break;
                        }

                }

            }
        }
   
    
    }
}