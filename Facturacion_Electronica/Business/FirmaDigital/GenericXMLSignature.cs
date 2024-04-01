using es.mityc.firmaJava.libreria.xades;
using ikvm.extensions;
using java.io;
using java.lang;
using java.security;
using java.security.cert;
using java.util;
using javax.xml.parsers;
using javax.xml.transform;
using javax.xml.transform.dom;
using javax.xml.transform.stream;
using org.w3c.dom;
using org.xml.sax;
using Exception = java.lang.Exception;
using File = java.io.File;
using IOException = java.io.IOException;
using X509Certificate = java.security.cert.X509Certificate;

namespace ElectronicBilling.Business.DigitalSign
{
    public abstract class GenericXmlSignature
    {
        private string pathSignature;
        private string passSignature;

        public string getPathSignature()
        {
            return pathSignature;
        }

        public void setPathSignature(string pathSignature)
        {
            this.pathSignature = pathSignature;
        }

        public string getPassSignature()
        {
            return this.passSignature;
        }

        public void setPassSignature(string passSignature)
        {
            this.passSignature = passSignature;
        }

        protected void execute()
        {
            KeyStore keyStore = getKeyStore();
            if (keyStore == null)
            {
                throw new IOException("No se pudo obtener almacen de firma.");
            }
            string alias = getAlias(keyStore);

            X509Certificate certificate = null;
            try
            {
                certificate = (X509Certificate)keyStore.getCertificate(alias);
                if (certificate == null)
                {
                    throw new IOException("No existe ningún certificado para firmar.");
                }
            }
            catch (KeyStoreException e1)
            {
                throw new IOException("Error: " + e1.getMessage());
            }

            PrivateKey privateKey = null;
            KeyStore tmpKs = keyStore;

            try
            {
                privateKey = (PrivateKey)tmpKs.getKey(alias, this.passSignature.toCharArray());
            }
            catch (UnrecoverableKeyException)
            {
                throw new IOException("No existe clave privada para firmar.");
            }
            catch (KeyStoreException)
            {
                throw new IOException("No existe clave privada para firmar.");
            }
            catch (NoSuchAlgorithmException)
            {
                throw new IOException("No existe clave privada para firmar.");
            }

            Provider provider = keyStore.getProvider();
            DataToSign dataToSign = createDataToSign();
            FirmaXML firma = new FirmaXML();
            Document docSigned = null;

            try
            {
                object[] res = firma.signFile(certificate, dataToSign, privateKey, provider);
                docSigned = (Document)res[0];
            }
            catch (Exception ex)
            {
                throw new IOException("Error realizando la firma: " + ex.getMessage());
            }
            string filePath = getPathOut() + File.separatorChar + getSignatureFileName();
            saveDocumenteDisk(docSigned, filePath);
        }

        protected abstract DataToSign createDataToSign();

        protected abstract string getSignatureFileName();

        protected abstract string getPathOut();

        protected Document getDocument(string resource)
        {
            Document doc = null;
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setNamespaceAware(true);
            File file = new File(resource);

            try
            {
                DocumentBuilder db = dbf.newDocumentBuilder();
                doc = db.parse(file);
            }
            catch (ParserConfigurationException ex)
            {
                throw new IOException("Error al parsear el documento: " + ex.getMessage());
            }
            catch (SAXException ex)
            {
                throw new IOException("Error al parsear el documento: " + ex.getMessage());
            }
            catch (IOException ex)
            {
                throw new IOException("Error al parsear el documento: " + ex.getMessage());
            }
            catch (IllegalArgumentException ex)
            {
                throw new IOException("Error al parsear el documento: " + ex.getMessage());
            }
            return doc;
        }

        private KeyStore getKeyStore()
        {
            KeyStore ks = null;

            try
            {
                ks = KeyStore.getInstance("PKCS12");
                ks.load(new FileInputStream(this.pathSignature), this.passSignature.toCharArray());
            }
            catch (KeyStoreException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            catch (NoSuchAlgorithmException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            catch (CertificateException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            catch (IOException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            return ks;
        }

        private static string getAlias(KeyStore keyStore) //throws IOException
        {
            string alias = null;

            try
            {
                Enumeration nombres = keyStore.aliases();
                while (nombres.hasMoreElements())
                {
                    string tmpAlias = (string)nombres.nextElement();
                    if (keyStore.isKeyEntry(tmpAlias))
                    {
                        alias = tmpAlias;
                    }
                }
            }
            catch (KeyStoreException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            return alias;
        }

        public static void saveDocumenteDisk(Document document, string pathXml) //throws IOException
        {
            try
            {
                DOMSource source = new DOMSource(document);
                StreamResult result = new StreamResult(new File(pathXml));
                TransformerFactory transformerFactory = TransformerFactory.newInstance();

                Transformer transformer = transformerFactory.newTransformer();
                transformer.transform(source, result);
            }
            catch (TransformerConfigurationException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
            catch (TransformerException e)
            {
                throw new IOException("Error: " + e.getMessage());
            }
        }
    }
}