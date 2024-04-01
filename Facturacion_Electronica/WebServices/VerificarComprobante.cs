using System;
using System.IO;
using System.Net;
using System.Text;
using System.Xml;


namespace ElectronicBilling.WebServices
{
    public class VerificarComprobante
    {



        public RespuestaAutorizacion Verificar(string wsdl, string claveAcceso)
        {
            try
            {
                var result = string.Empty;
                var url = wsdl;
                var xml =
                    "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ec=\"http://ec.gob.sri.ws.autorizacion\">"
                    + "<soapenv:Header/>"
                    + "<soapenv:Body>"
                    + "<ec:autorizacionComprobante>"
                    + "<claveAccesoComprobante>" + claveAcceso + "</claveAccesoComprobante>"
                    + "</ec:autorizacionComprobante>"
                    + "</soapenv:Body>"
                    + "</soapenv:Envelope>";

                var bytes = Encoding.ASCII.GetBytes(xml);
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
                        result = reader.ReadToEnd();
                    }

                    result = WebUtility.HtmlDecode(result);
                    response.Close();
                    var mainCharacter = result.IndexOf('?') - 1;
                    var lastCharacter = result.LastIndexOf('?') + 2;
                    result = result.Remove(mainCharacter, (lastCharacter - mainCharacter));
                    result = "<documento>" + result + "</documento>";
                    var doc = new XmlDocument();
                    doc.LoadXml(result);
                    RespuestaAutorizacion datosTributarios;
                    var state = doc.GetElementsByTagName("estado")[0].InnerText;
                    if (state.Equals(WebServiceResults.Autorizado))
                    {
                        datosTributarios = new RespuestaAutorizacion
                        {
                            Autorizado = true,
                            NumeroAutorizacion = doc.GetElementsByTagName("numeroAutorizacion")[0].InnerText,
                            FechaAutorizacion = doc.GetElementsByTagName("fechaAutorizacion")[0].InnerText,
                            Ambiente = doc.GetElementsByTagName("ambiente")[0].InnerText,
                            Estado = doc.GetElementsByTagName("estado")[0].InnerText,
                            Xml = "<?xml version=" + "\"1.0\"" + " encoding=" + "\"UTF-8\"" + "?>" + doc.GetElementsByTagName("autorizacion")[0].InnerXml
                        };
                    }
                    else
                    {
                        datosTributarios = new RespuestaAutorizacion
                        {
                            Autorizado = false,
                            Estado = "ERROR",
                            Mensaje = doc.GetElementsByTagName("mensaje")[0].InnerText
                        };
                    }
                    response.Close();
                    return datosTributarios;
                }
                response.Close();
                return null;
            }
            catch (Exception ex)
            {
                return new RespuestaAutorizacion { Autorizado = false, Estado = "EXCEPCION",Mensaje= ex.Message};
            }
        }
    }
}
