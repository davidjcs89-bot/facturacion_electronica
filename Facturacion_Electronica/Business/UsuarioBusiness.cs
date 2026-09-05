using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Security;

namespace Facturacion_Electronica.Business
{
    public class UsuarioBusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();
        private EmailBusiness emailBusiness = new EmailBusiness();
        private int idCategorioPorDefecto = 4;
        private string cifrarClave(string claveSinCifrar)
        {
            using (SHA512 sha512Hash = SHA512.Create())
            {
                //From String to byte array
                byte[] sourceBytes = Encoding.UTF8.GetBytes(claveSinCifrar);
                byte[] hashBytes = sha512Hash.ComputeHash(sourceBytes);
                string hash = BitConverter.ToString(hashBytes).Replace("-", String.Empty);

                return hash;
            }
        }

        public void registrarUsuario(ModeloNuevoUsuario modelo)
        {
            _db.Usuario.Where(x => x.Nombre_usuario == modelo.NombreUsuario);
            var nuevoUsuario = new Usuario
            {
                Apellido = modelo.Apellido.ToUpper(),
                Ciudad = modelo.Ciudad.ToUpper(),
                Clave = cifrarClave(modelo.Clave),
                Nombre_usuario = modelo.NombreUsuario,
                Correo = modelo.Correo,
                Direccion_Dom_cuenta = modelo.Direccion.ToUpper(),
                Estado = 1,
                Nombre = modelo.Nombre.ToUpper(),
                Numero_telefono = modelo.Numero_telefono,
                Provincia = modelo.Provincia.ToUpper(),
                Notificaciones = modelo.Notificaciones,
                Fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
                Id_Categoria = idCategorioPorDefecto,
                id_rol = EnumRolUsuario.ADMIN_EMPRESA
            };

            _db.Usuario.Add(nuevoUsuario);
            _db.SaveChanges();
        }

        public bool validarCredenciales(ModeloLogin modelo)
        {
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == modelo.Usuario).FirstOrDefault();
            if (usuario == null)
            {
                return false;
            }

            var claveIngresadaCifrada = cifrarClave(modelo.Clave);
            if (claveIngresadaCifrada.Equals(usuario.Clave)) {
                SignIn(modelo.Usuario, false);
                return true;
            }
            else
            {
                return false;
            }
        }

        public bool validarEsAdmin(ModeloLogin modelo)
        {
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == modelo.Usuario).FirstOrDefault();
            if (usuario == null)
            {
                return false;
            }

            return usuario.id_rol == EnumRolUsuario.ADMIN_SISTEMA;

        }

        public bool ValidarEmisorHabilitado(ModeloLogin modelo)
        {
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == modelo.Usuario).FirstOrDefault();
            if (usuario == null)
            {
                return false;
            }

            if (usuario.Estado != 1)
            {
                return false;
            }

            if (usuario.Emisor == null)
            {
                return true;
            }
            var habilitacion = usuario.Emisor.Emisor_habilitacion;
            if (habilitacion == null)
            {
                return true;
            }

            return habilitacion.fecha_desde <= DateTime.Now && habilitacion.fecha_hasta >= DateTime.Now;
        }

        public bool ValidarEmisorCreado(ModeloLogin modelo)
        {
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == modelo.Usuario).FirstOrDefault();
            if (usuario == null)
            {
                return true;
            }

            if (usuario.Estado != 1)
            {
                return true;
            }

            return usuario.Emisor != null;

        }

        public void EnviarEmailInicioSesion(ModeloLogin modelo)
        {
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == modelo.Usuario).FirstOrDefault();
            if (usuario == null)
            {
                return;
            }

            if (usuario.Emisor == null)
            {
                return;
            }

            var dias = usuario.Emisor.Emisor_habilitacion.fecha_hasta - DateTime.Now;
            emailBusiness.EnviarEmailInicioSesion(usuario.Correo, CompartidaBusiness.GetIp(),dias.Days);

        }

        private  void SignIn(string username, bool createPersistentCookie)
        {
            var now = DateTime.UtcNow.ToLocalTime();
            var emisor = _db.Usuario.Where(x => x.Nombre_usuario == username).FirstOrDefault();
 
            var ticket = new FormsAuthenticationTicket(
                1 /*version*/,
                username,
                now,
                now.Add(new TimeSpan(0, 10, 0)),
                createPersistentCookie,
                emisor.id_emisor.ToString(),
                FormsAuthentication.FormsCookiePath);

            var encryptedTicket = FormsAuthentication.Encrypt(ticket);
            FormsAuthentication.SetAuthCookie(username, createPersistentCookie);
            var cookie = new HttpCookie(FormsAuthentication.FormsCookieName, encryptedTicket) { HttpOnly = true };
            if (ticket.IsPersistent)
            {
                cookie.Expires = ticket.Expiration;
            }
            cookie.Secure = FormsAuthentication.RequireSSL;
            cookie.Path = FormsAuthentication.FormsCookiePath;
            if (FormsAuthentication.CookieDomain != null)
            {
                cookie.Domain = FormsAuthentication.CookieDomain;
            }
        }

        public void RecuperarClave(RecuperarClave modelo)
        {
            var usuario = _db.Usuario.FirstOrDefault(x=>x.Correo.ToUpper().Equals(modelo.Correo.ToUpper()));

            if (usuario == null)
            {
                return;
            }
            Random r = new Random();
            string codigo = r.Next(100000, 999999).ToString();

            var codigoSeguridad = new codigos_seguridad { 
                codigo =codigo,
                fecha_generacion = DateTime.Now,
                fecha_caducidad = DateTime.Now.AddDays(1),
                id_usuario = usuario.id
            };
            _db.codigos_seguridad.Add(codigoSeguridad);
            _db.SaveChanges();
            emailBusiness.EnviarEmailRecuperarClave(modelo.Correo, codigo, usuario.Nombre_usuario);
        }

        public void RecuperarUsuario(RecuperarClave modelo)
        {
            var usuario = _db.Usuario.FirstOrDefault(x => x.Correo.ToUpper().Equals(modelo.Correo.ToUpper()));

            if (usuario == null)
            {
                return;
            }
            Random r = new Random();
            string codigo = r.Next(100000, 999999).ToString();

            _db.SaveChanges();
            emailBusiness.EnviarEmailRecuperarUsuario(modelo.Correo, usuario.Nombre_usuario);
        }

        public string ActualizarClave(ActualizarClave modelo)
        {
            var codigoSeguridad = _db.codigos_seguridad.FirstOrDefault(x=>x.codigo == modelo.Codigo && x.fecha_caducidad > DateTime.Now && !x.cambio_clave);
            if (codigoSeguridad == null)
            {
                return "Código de Seguridad Incorrecto o Caducado";
            }

            var usuario = codigoSeguridad.Usuario;
            usuario.Clave = this.cifrarClave(modelo.Clave);

            codigoSeguridad.cambio_clave = true;
            _db.SaveChanges();
            return null;
        }


        public List<Usuario> BuscarUsuarios(ModeloBuscarUsuario modeloBuscar)
        {
            if (modeloBuscar.BuscarTodos)
            {
                return _db.Usuario.Where(x=>x.Estado != 3).OrderByDescending(x => x.id).ToList();
            }
            if (modeloBuscar.BuscarPorNombre != null && modeloBuscar.BuscarPorNombre.Trim().Length > 0)
            {
                return _db.Usuario.Where(x => x.Nombre.ToUpper() == modeloBuscar.BuscarPorNombre.ToUpper() && x.Estado != 3).OrderByDescending(x => x.id).ToList();
            }
            if (modeloBuscar.BuscarPorApellido != null && modeloBuscar.BuscarPorApellido.Trim().Length > 0)
            {
                return _db.Usuario.Where(x => x.Apellido.ToUpper() == modeloBuscar.BuscarPorApellido.ToUpper() && x.Estado != 3).OrderByDescending(x => x.id).ToList();
            }
            else if (modeloBuscar.BuscarPorEmail != null && modeloBuscar.BuscarPorEmail.Trim().Length > 0)
            {
                return _db.Usuario.Where(x => x.Correo.ToUpper() == modeloBuscar.BuscarPorEmail.ToUpper() && x.Estado != 3).OrderByDescending(x => x.id).ToList();
            }
            else if (modeloBuscar.BuscarPorEstado != 0)
            {
                return _db.Usuario.Where(x => x.Estado == modeloBuscar.BuscarPorEstado).OrderByDescending(x => x.id).ToList();
            }
            else
            {
                return new List<Usuario>();
            }
        }
    }
}