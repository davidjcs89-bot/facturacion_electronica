using Facturacion_Electronica.Business;
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Hosting;
using System.Xml;

namespace ElectronicBilling.WebServices
{
    public class EnvioComprobantes
    {
        private string ConvertToBase64(string filePath)
        {
            var array = File.ReadAllBytes(filePath);
            return Convert.ToBase64String(array);
        }

        public RespuestaEnvioComprobante Enviar(string wsdl)
        {
            try
            {
                string ubicacionXmlFirmado = HostingEnvironment.MapPath(EnumDatosGenerales.DirectorioDocumentos);
                var xmlBase64 = ConvertToBase64(ubicacionXmlFirmado + "ComprobanteFirmado.xml");
                var url = wsdl;
                var xmlParams = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ec='http://ec.gob.sri.ws.recepcion'>"
                                + "<soapenv:Header/>"
                                + "<soapenv:Body>"
                                + "<ec:validarComprobante>"
                                + "<xml>" + xmlBase64 + "</xml>"
                                + "</ec:validarComprobante>"
                                + "</soapenv:Body>"
                                + "</soapenv:Envelope>";

                var bytes = Encoding.ASCII.GetBytes(xmlParams);
                var request = (HttpWebRequest)WebRequest.Create(url);

                request.Method = "POST";
                request.ContentLength = bytes.Length;
                request.ContentType = "text/xml";

                var requestStream = request.GetRequestStream();
                requestStream.Write(bytes, 0, bytes.Length);
                requestStream.Close();

                var response = (HttpWebResponse)request.GetResponse();
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    var responseStream = response.GetResponseStream();
                    if (responseStream != null)
                    {
                        var reader = new StreamReader(responseStream);
                        var result = reader.ReadToEnd();

                        result = WebUtility.HtmlDecode(result);
                        response.Close();
                        result = "<?xml version=" + "\"1.0\"" + " encoding=" + "\"UTF-8\"" + "?>" + result;
                        var doc = new XmlDocument();
                        doc.LoadXml(result);
                        var state = doc.GetElementsByTagName("estado")[0].InnerText;
                        RespuestaEnvioComprobante sendResponse;
                        if (state.Equals(WebServiceResults.Recibida))
                        {
                            sendResponse = new RespuestaEnvioComprobante
                            {
                                Estado = state,
                                Recibido = true
                            };
                        }
                        else
                        {
                            
                            var mensajeError = doc.GetElementsByTagName("mensaje")[0].InnerText;
                            if (mensajeError.Contains("CLAVE ACCESO REGISTRADA"))
                            {
                                sendResponse = new RespuestaEnvioComprobante
                                {
                                    Estado = state,
                                    Recibido = true,
                                };
                            }
                            else
                            {
                                sendResponse = new RespuestaEnvioComprobante
                                {
                                    Estado = state,
                                    Recibido = false,
                                    Mensajes = doc.GetElementsByTagName("mensaje")[0].InnerText
                                };
                            }
                        }
                        response.Close();
                        return sendResponse;
                    }
                    response.Close();
                }
                response.Close();
                return null;
            }
            catch (Exception ex)
            {
                return new RespuestaEnvioComprobante { Estado = "EXCEPCION", Recibido = false, Mensajes = ex.Message};
            }
        }
    }
}
