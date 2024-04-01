using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Web;
using System.Xml;

namespace Facturacion_Electronica.Business
{
    public class EmailBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        public void EnviarEmailFactura(int idFactura, int idComprobante)
        {
            var factura = db.Factura.FirstOrDefault(x=>x.id == idFactura);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x=>x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (factura != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(factura.Clientes.correo))
            {
                string asunto = $"{factura.Emisor.Nombre_comercial} Factura #"+factura.Numero;
                string cuerpo = $"<p>Te saluda {factura.Emisor.Nombre_comercial}.<p> Estimado(a) {factura.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{factura.Emisor.Razon_social}</p></br>Valor Total: {factura.Total}";
                this.EnviarEmail(cuentaEmail,factura.Clientes.correo,asunto,cuerpo,documentoElectronico.xml_retornado,documentoElectronico.ride,factura.Clave_de_Acceso+".xml",factura.Clave_de_Acceso+".pdf");
                var usuarioEmisor = db.Usuario.FirstOrDefault(x => x.id_emisor == factura.id_emisor);
                if (usuarioEmisor !=null && !string.IsNullOrEmpty(usuarioEmisor.Correo))
                {
                    this.EnviarEmail(cuentaEmail, usuarioEmisor.Correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, factura.Clave_de_Acceso + ".xml", factura.Clave_de_Acceso + ".pdf");
                }
            }
        }

        public void EnviarEmailNotaCredito(int idNota, int idComprobante)
        {
            var nota = db.Nota_credito.FirstOrDefault(x => x.id == idNota);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x => x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (nota != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(nota.Clientes.correo))
            {
                string asunto = $"{nota.Emisor.Nombre_comercial} Nota Credito #" + nota.Numero;
                string cuerpo = $"<p>Te saluda {nota.Emisor.Nombre_comercial}.<p> Estimado(a) {nota.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{nota.Emisor.Razon_social}</p></br>Valor Total: {nota.Total}";
                this.EnviarEmail(cuentaEmail, nota.Clientes.correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, nota.Clave_acceso + ".xml", nota.Clave_acceso + ".pdf");
            }
        }

        public void EnviarEmailNotaDebito(int idNota, int idComprobante)
        {
            var nota = db.Nota_debito.FirstOrDefault(x => x.id == idNota);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x => x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (nota != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(nota.Clientes.correo))
            {
                string asunto = $"{nota.Emisor.Nombre_comercial} Nota Debito #" + nota.Numero;
                string cuerpo = $"<p>Te saluda {nota.Emisor.Nombre_comercial}.<p> Estimado(a) {nota.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{nota.Emisor.Razon_social}</p></br>Valor Total: {nota.Total}";
                this.EnviarEmail(cuentaEmail, nota.Clientes.correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, nota.Clave_acceso + ".xml", nota.Clave_acceso + ".pdf");
            }
        }

        public void EnviarEmailLiquidacionCompra(int idLIquidacion, int idComprobante)
        {
            var liquidacion = db.Liquidacion_Compra.FirstOrDefault(x => x.id == idLIquidacion);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x => x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (liquidacion != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(liquidacion.Clientes.correo))
            {
                string asunto = $"{liquidacion.Emisor.Nombre_comercial} Liquidacion de Compra #" + liquidacion.Numero;
                string cuerpo = $"<p>Te saluda {liquidacion.Emisor.Nombre_comercial}.<p> Estimado(a) {liquidacion.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{liquidacion.Emisor.Razon_social}</p></br>Valor Total: {liquidacion.Total}";
                this.EnviarEmail(cuentaEmail, liquidacion.Clientes.correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, liquidacion.Clave_de_Acceso + ".xml", liquidacion.Clave_de_Acceso + ".pdf");
            }
        }

        public void EnviarEmailGuiaRemision(int idGuia, int idComprobante)
        {
            var guia = db.Guia_remision.FirstOrDefault(x => x.id == idGuia);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x => x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            foreach (var dest in guia.Guia_remision_destinatario.ToList())
            {
                if (guia != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(dest.Clientes.correo))
                {
                    string asunto = $"{guia.Emisor.Nombre_comercial} Guia de Remision";
                    string cuerpo = $"<p>Te saluda {guia.Emisor.Nombre_comercial}.<p> Estimado(a) {dest.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{guia.Emisor.Razon_social}</p>";
                    this.EnviarEmail(cuentaEmail, dest.Clientes.correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, guia.Clave_acceso + ".xml", guia.Clave_acceso + ".pdf");
                }
            }

        }

        public void EnviarEmailRetencion(int idRetencion, int idComprobante)
        {
            var retencion = db.Retencion.FirstOrDefault(x => x.id == idRetencion);
            var documentoElectronico = db.Documentos_Electronicos.FirstOrDefault(x => x.id == idComprobante);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (retencion != null && documentoElectronico != null && cuentaEmail != null && !string.IsNullOrEmpty(retencion.Clientes.correo))
            {
                string asunto = $"{retencion.Emisor.Nombre_comercial} Comprobante de Retencion#" + retencion.numero;
                string cuerpo = $"<p>Te saluda {retencion.Emisor.Nombre_comercial}.<p> Estimado(a) {retencion.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{retencion.Emisor.Razon_social}</p>";
                this.EnviarEmail(cuentaEmail, retencion.Clientes.correo, asunto, cuerpo, documentoElectronico.xml_retornado, documentoElectronico.ride, retencion.Clave_acceso + ".xml", retencion.Clave_acceso + ".pdf");
            }
        }

        public string EnviarEmailProforma(int idProforma, byte[] documento)
        {
            var proforma = db.Proforma.FirstOrDefault(x=>x.id == idProforma);
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();
            if (proforma != null && documento != null && cuentaEmail != null)
            {
                string asunto = $"{proforma.Emisor.Nombre_comercial}  Proforma";
                string cuerpo = $"<p>Te saluda {proforma.Emisor.Nombre_comercial}.<p> Estimado(a) {proforma.Clientes.nombre_cliente}</p><p>Ha recibido un documento electrónico a través de este medio.</p><p>Adjunto encontrará los documentos pertinentes.</p><p>Atentamente,</p><p>{proforma.Emisor.Razon_social}</p>";
                return this.EnviarEmail(cuentaEmail, proforma.Clientes.correo, asunto, cuerpo, null, documento, null, "Proforma.pdf");
            }
            else
            {
                return "Proforma no existe o no se ha configurado una cuenta de correo";
            }
        }


        public void EnviarEmailNotasCliente(string correo, string cuerpo)
        {
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();

            if (cuentaEmail != null && !string.IsNullOrEmpty(correo) && !string.IsNullOrEmpty(cuerpo))
            {
                string asunto = "Notas Clientes";
                this.EnviarEmail(cuentaEmail, correo, asunto, cuerpo, null, null, null, null);
            }
        }

        public void EnviarEmailRecuperarClave(string correo, string codigo, string usuario)
        {
            string asunto = "Sistema de Facturacion Electronica Recuperación de clave";
            string cuerpo = $"<p>Sistema de Facturacion Electronica</p><p>Su nombre de usuario es: <h2>{usuario}</h2></p><p> EL código para recuperar su contraseña es: <h2>{codigo}</h2></p><p>El codigo caduca en 24 horas</p>";
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();
            this.EnviarEmail(cuentaEmail, correo, asunto, cuerpo, null, null, null, null);
        }

        public void EnviarEmailRecuperarUsuario(string correo, string usuario)
        {
            string asunto = "Sistema de Facturacion Electronica Recuperación de usuario";
            string cuerpo = $"<p>Sistema de Facturacion Electronica</p><p>Su nombre de usuario es: <h2>{usuario}</h2>";
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();
            this.EnviarEmail(cuentaEmail, correo, asunto, cuerpo, null, null, null, null);
        }

        public void EnviarEmailInicioSesion(string correo,  string ip, int diasRestantes)
        {
            string asunto = "Sistema de Facturacion Electronica - Nuevo Incio de Sesión";
            string cuerpo = $"<p>Sistema de Facturacion Electronica</p><p>Se ha registrado un nuevo inicio de sesión con su usuario <p>Fecha: {DateTime.Now.ToString("dd/MM/yyyy HH:mm")}</p><p>Terminal: {ip}</p><p>Dias Disponibles: {diasRestantes}";
            var cuentaEmail = db.Cuentas_correo.FirstOrDefault();
            //this.EnviarEmail(cuentaEmail, correo, asunto, cuerpo, null, null, null, null);
        }

        private string EnviarEmail(Cuentas_correo cuenta, string destino, string asunto, string cuerpo, string xml, byte[]ride, string nombreXml, string nombreRide)
        {
            try
            {
                var message = new MailMessage
                {
                    //from, to, reply to
                    From = new MailAddress(cuenta.direccion, cuenta.nombre_mostrar)
                };
                message.To.Add(new MailAddress(destino));

                //content
                message.Subject = asunto;
                message.Body = cuerpo;
                message.IsBodyHtml = true;

                if (!string.IsNullOrEmpty(xml))
                {
                    Stream stream = new MemoryStream(Encoding.UTF8.GetBytes(xml));

                    var attachment = new Attachment(stream, nombreXml);
                    attachment.ContentDisposition.CreationDate = DateTime.Now;
                    attachment.ContentDisposition.ModificationDate = DateTime.Now;
                    attachment.ContentDisposition.ReadDate = DateTime.Now;
                    message.Attachments.Add(attachment);
                }

                if (ride != null && ride.Length > 0)
                {
                    Stream stream = new MemoryStream(ride);

                    var attachment = new Attachment(stream, nombreRide);
                    attachment.ContentDisposition.CreationDate = DateTime.Now;
                    attachment.ContentDisposition.ModificationDate = DateTime.Now;
                    attachment.ContentDisposition.ReadDate = DateTime.Now;
                    message.Attachments.Add(attachment);
                }

                //send email
                using (var smtpClient = new SmtpClient())
                {
                    smtpClient.UseDefaultCredentials = false;
                    smtpClient.Host = cuenta.servidor;
                    smtpClient.Port = cuenta.puerto;
                    smtpClient.EnableSsl = cuenta.ssl;
                    smtpClient.Credentials = new NetworkCredential(cuenta.direccion, cuenta.clave);
                    smtpClient.Send(message);
                }
                return null;
            }
            catch (Exception ex)
            {
                return ex.ToString();
            }
        }
    }
}