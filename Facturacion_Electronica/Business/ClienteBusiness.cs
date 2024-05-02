using Facturacion_Electronica.Models.Cliente;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class ClienteBusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();
        private EmailBusiness emailBusiness = new EmailBusiness();

        public List<Clientes> BuscarClientes(ModeloBuscarClientes modeloBuscar, int IdEmisor)
        {
            if (modeloBuscar.BuscarTodos)
            {
                return _db.Clientes.Where(x => x.id_emisor == IdEmisor && x.id != EnumDatosGenerales.ID_CONSUMIDOR_FINAL).ToList();
            }
            if (modeloBuscar.BuscarPorIdentificacion != null && modeloBuscar.BuscarPorIdentificacion.Trim().Length > 0)
            {
                return _db.Clientes.Where(x => x.id_emisor == IdEmisor && x.identificacion.StartsWith(modeloBuscar.BuscarPorIdentificacion) && x.id != EnumDatosGenerales.ID_CONSUMIDOR_FINAL).ToList();
            }
            if (modeloBuscar.BuscarPorTelefono != null && modeloBuscar.BuscarPorTelefono.Trim().Length > 0)
            {
                return _db.Clientes.Where(x => x.id_emisor == IdEmisor && x.telefono_movil.StartsWith(modeloBuscar.BuscarPorTelefono) && x.id != EnumDatosGenerales.ID_CONSUMIDOR_FINAL).ToList();
            }
            else if (modeloBuscar.BuscarPorRazonSocial != null && modeloBuscar.BuscarPorRazonSocial.Trim().Length > 0)
            {
                return _db.Clientes.Where(x => x.id_emisor == IdEmisor && x.id != EnumDatosGenerales.ID_CONSUMIDOR_FINAL && x.nombre_cliente.ToUpper().Contains(modeloBuscar.BuscarPorRazonSocial.ToUpper())).ToList();
            }
            else
            {
                return new List<Clientes>();
            }
        }

        public void CrearCliente(ModeloCliente modeloCliente, int idEmisor)
        {
            var cliente = new Clientes
            {
                id_emisor = idEmisor,
                nombre_cliente = modeloCliente.RazonSocial.ToUpper(),
                tipo_identificacion = modeloCliente.TipoIdentificacionId,
                tipo_cliente = modeloCliente.TipoClienteId,
                identificacion = modeloCliente.NumeroIdentificacion,
                telefono_fijo = modeloCliente.TelefonoConvencional,
                telefono_movil = modeloCliente.Celular,
                Direccion = modeloCliente.Direccion != null ? modeloCliente.Direccion.ToUpper() : null,
                correo = modeloCliente.Email != null ? modeloCliente.Email.ToUpper() : null,
                fecha_creacion = DateTime.Now,
                fecha_modificacion = DateTime.Now
            };

            _db.Clientes.Add(cliente);
            _db.SaveChanges();
        }

        public ModeloCliente GenerarModeloCliente(int id)
        {
            var cliente = _db.Clientes.Find(id);
            if (cliente == null)
            {
                return null;
            }

            var modeloCliente = new ModeloCliente
            {
                Id = cliente.id,
                IdEmisor = cliente.id_emisor,
                RazonSocial = cliente.nombre_cliente,
                TipoIdentificacionId = cliente.tipo_identificacion,
                TipoClienteId = cliente.tipo_cliente,
                NumeroIdentificacion = cliente.identificacion,
                TelefonoConvencional = cliente.telefono_fijo,
                Celular = cliente.telefono_movil,
                Direccion = cliente.Direccion,
                Email = cliente.correo
            };
            return modeloCliente;

        }

       public ModeloCliente BuscarClienteFactura(string identificacion, int idEmisor)
        {
            var cliente = _db.Clientes.FirstOrDefault(x => x.id_emisor == idEmisor && x.tipo_cliente == EnumTipoCliente.CLIENTE && x.identificacion == identificacion);
            if (cliente == null)
            {
                return null;
            }
            return this.GenerarModeloCliente(cliente.id);
        }

        public List<ModeloCliente> BuscarClientesFacturaByNombre(string nombreCliente, int idEmisor)
        {
            var clientes = _db.Clientes
                .Where(x => x.id_emisor == idEmisor &&
                            x.tipo_cliente == EnumTipoCliente.CLIENTE &&
                            x.nombre_cliente.Contains(nombreCliente))
                .ToList();

            if (clientes == null || clientes.Count == 0)
            {
                return null;
            }

            var modelosClientes = new List<ModeloCliente>();
            foreach (var cliente in clientes)
            {
                modelosClientes.Add(this.GenerarModeloCliente(cliente.id));
            }

            return modelosClientes;
        }

        public ModeloCliente BuscarClienteRetencion(string identificacion, int idEmisor)
        {
            if (identificacion.Equals(EnumDatosGenerales.NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL))
            {
                return null;
            }
            var cliente = _db.Clientes.FirstOrDefault(x => x.id_emisor == idEmisor && x.tipo_cliente == EnumTipoCliente.SUJETO_RETENCION && x.identificacion == identificacion);
            if (cliente == null)
            {
                return null;
            }
            return this.GenerarModeloCliente(cliente.id);
        }

        public ModeloCliente BuscarClienteGuiaRemision(string identificacion, int idEmisor)
        {
            var cliente = _db.Clientes.FirstOrDefault(x => x.id_emisor == idEmisor && x.tipo_cliente == EnumTipoCliente.DESTINATARIO && x.identificacion == identificacion);
            if (cliente == null)
            {
                return null;
            }
            return this.GenerarModeloCliente(cliente.id);
        }

        public void ActualizarCliente(ModeloCliente modeloCliente)
        {
            var cliente = _db.Clientes.Find(modeloCliente.Id);
            if (cliente == null)
            {
                return;
            }

            cliente.nombre_cliente = modeloCliente.RazonSocial.ToUpper();
            cliente.tipo_identificacion = modeloCliente.TipoIdentificacionId;
            cliente.tipo_cliente = modeloCliente.TipoClienteId;
            cliente.identificacion = modeloCliente.NumeroIdentificacion;
            cliente.telefono_fijo = modeloCliente.TelefonoConvencional;
            cliente.telefono_movil = modeloCliente.Celular;
            cliente.Direccion = modeloCliente.Direccion?.ToUpper();
            cliente.correo = modeloCliente.Email?.ToUpper();
            cliente.fecha_modificacion = DateTime.Now;

            _db.SaveChanges();
        }

        public DatosAdicionalesCliente ObtenerDatosAdicionales(int idCliente, int idEmisor)
        {
            var cliente = GenerarModeloCliente(idCliente);
            if (cliente == null || cliente.IdEmisor != idEmisor)
            {
                return null;
            }

            var adicionales = new DatosAdicionalesCliente
            {
                IdCliente = cliente.Id,
                Notas = new List<Datos_Adicionales_Cliente>()
            };

            foreach (var nota in _db.Datos_Adicionales_Cliente.Where(x => x.id_cliente == idCliente).ToList())
            {
                adicionales.Notas.Add(nota);
            }
            return adicionales;
        }

        public void GuardarAdicional(DatosAdicionalesCliente modelo, int idUsuario)
        {
            _db.Datos_Adicionales_Cliente.Add(new Datos_Adicionales_Cliente
            {
                id_cliente = modelo.IdCliente,
                nota = modelo.Nota,
                fecha_creacion = DateTime.Now,
                id_usuario = idUsuario
            });
            _db.SaveChanges();
        }

        public void EliminarAdicional(int id, int idEmisor)
        {
            var adicional = _db.Datos_Adicionales_Cliente.FirstOrDefault(x => x.id == id);
            if (adicional == null || adicional.Clientes.id_emisor != idEmisor)
            {
                return;
            }
            _db.Datos_Adicionales_Cliente.Remove(adicional);
            _db.SaveChanges();
        }

        public void EnviarNotasClientes()
        {
            string notasDescripcion = "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;}</style></style></head><body><table><thead><tr><th>Cliente</th><th>Nota</th><th>Fecha/Hora</th></tr></thead><tbody>";
            foreach (var usuario in _db.Usuario)
            {
                int notas = 0;
                var fechaActual = DateTime.Now.ToString("dd/MM/yyyy");
                foreach (var nota in _db.Datos_Adicionales_Cliente.Where(x => x.fecha_creacion != null && DbFunctions.TruncateTime(x.fecha_creacion) == DbFunctions.TruncateTime(DateTime.Now) && x.Clientes.id_emisor == usuario.id_emisor))
                {
                    notasDescripcion = notasDescripcion + "<tr><td style=\"width:200px\">" + nota.Clientes.identificacion + "<br/>" + nota.Clientes.nombre_cliente + "</td><td style=\"width:250px\">" + nota.nota + "</td><td style=\"width:200px\">" + nota.fecha_creacion.ToString("dd/MM/yyyy HH:mm") + "</td></tr>";
                    notas++;
                }

                notasDescripcion = notasDescripcion + "</tbody></table></body></html>";
                if (notas > 0)
                {
                    emailBusiness.EnviarEmailNotasCliente(usuario.Correo, notasDescripcion);
                }
                notas = 0;
                notasDescripcion = "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;}</style></style></head><body><table><thead><tr><th>Cliente</th><th>Nota</th><th>Fecha/Hora</th></tr></thead><tbody>";
            }


        }
    }
}