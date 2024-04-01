using es.mityc.firmaJava.libreria.xades;
using es.mityc.javasign.xml.refs;
using java.io;
using java.security.cert;
using org.w3c.dom;
using Console = System.Console;
using EnumFormatoFirma = es.mityc.javasign.EnumFormatoFirma;

namespace ElectronicBilling.Business.DigitalSign
{
    public class XadEsbesSignature : GenericXmlSignature
    {
        private static string nameFile;
        private static string pathFile;
        private string fileToSign;

        public XadEsbesSignature(string fileToSign)
        {
            this.fileToSign = fileToSign;
        }
         
        public static void Sign(string xmlPath, string pathSignature, string passSignature, string pathOut, string nameFileOut)
        {
            try
            {
                XadEsbesSignature signature = new XadEsbesSignature(xmlPath);
                signature.setPassSignature(passSignature);
                signature.setPathSignature(pathSignature);
                pathFile = pathOut;
                nameFile = nameFileOut;
                signature.execute();
            }
            catch (IOException e)
            {
                Console.WriteLine(e);
                throw;
            }
            catch (CertificateException e)
            {
                Console.WriteLine(e);
                throw;
            }
        }

        protected override DataToSign createDataToSign()
        {
            DataToSign datosAFirmar = new DataToSign();
            datosAFirmar.setXadesFormat(EnumFormatoFirma.XAdES_BES);
            datosAFirmar.setEsquema(XAdESSchemas.XAdES_132);
            datosAFirmar.setXMLEncoding("UTF-8");
            datosAFirmar.setEnveloped(true);
            datosAFirmar.addObject(new ObjectToSign(new InternObjectToSign("comprobante"), "contenido comprobante", null, "text/xml", null));
            datosAFirmar.setParentSignNode("comprobante");

            Document docToSign = null;
            try
            {
                docToSign = getDocument(this.fileToSign);
            }
            catch (IOException ex)
            {
                Console.WriteLine(ex);
            }
            datosAFirmar.setDocument(docToSign);   
            return datosAFirmar;
        }

        protected override string getSignatureFileName()
        {
            return nameFile;
        }

        protected override string getPathOut()
        {
            return pathFile;
        }
    }

}
