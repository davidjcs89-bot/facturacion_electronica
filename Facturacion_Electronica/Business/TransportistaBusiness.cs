using Facturacion_Electronica.Models.Transportista;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class TransportistaBusiness
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();

        public List<Transportistas> BuscarTransportistas(ModeloBuscarTransportista modeloBuscar, int IdEmisor)
        {
            if (modeloBuscar.BuscarTodos)
            {
                return db.Transportistas.Where(x => x.Id_emisor == IdEmisor).ToList();
            }
            if (modeloBuscar.BuscarPorIdentificacion != null && modeloBuscar.BuscarPorIdentificacion.Trim().Length > 0)
            {
                return db.Transportistas.Where(x => x.Id_emisor == IdEmisor && x.Numero_identificacion == modeloBuscar.BuscarPorIdentificacion).ToList();
            }
            else if (modeloBuscar.BuscarPorRazonSocial != null && modeloBuscar.BuscarPorRazonSocial.Trim().Length > 0)
            {
                return db.Transportistas.Where(x => x.Id_emisor == IdEmisor && x.Nombre.ToUpper().Contains(modeloBuscar.BuscarPorRazonSocial.ToUpper())).ToList();
            }
            else
            {
                return new List<Transportistas>();
            }
        }

        public void CrearNuevoTransportista(ModeloTransportista modeloTransportista, int idemisor)
        {
            var transportista = new Transportistas { 
                Id_emisor = idemisor,
                Correo = modeloTransportista.Correo.ToUpper(),
                Nombre = modeloTransportista.Nombre.ToUpper(),
                Tipo_identificacion = modeloTransportista.TipoidentificacionId,
                Numero_identificacion = modeloTransportista.NumerdeIdentificacion,
                Placa = modeloTransportista.Placa.ToUpper(),
                fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
              
            };
            db.Transportistas.Add(transportista);
            db.SaveChanges();
        }
        public ModeloTransportista BuscarTransportista(int id, int idEmisor)
        {
            var transportista = db.Transportistas.FirstOrDefault(x=>x.id == id && x.Id_emisor == idEmisor);
            if (transportista == null)
            {
                return null;
            }

            return new ModeloTransportista { 
             Id = transportista.id,
             Correo = transportista.Correo,
             Nombre = transportista.Nombre,
             NumerdeIdentificacion = transportista.Numero_identificacion,
             Placa = transportista.Placa,
             TipoidentificacionId = transportista.Tipo_identificacion
            };
        }

        public ModeloTransportista BuscarTransportistaGuia(string identificacion, int idEmisor)
        {
            var transportita = db.Transportistas.FirstOrDefault(x => x.Id_emisor == idEmisor && x.Numero_identificacion == identificacion);
            if (transportita == null)
            {
                return null;
            }
            return this.BuscarTransportista(transportita.id,idEmisor);
        }

        public void ActualizarTransportista(ModeloTransportista modeloTransportista)
        {
            var transportista = db.Transportistas.Find(modeloTransportista.Id);
            if (transportista == null)
            {
                return;
            }

            transportista.Correo = modeloTransportista.Correo.ToUpper();
            transportista.Nombre = modeloTransportista.Nombre.ToUpper();
            transportista.Numero_identificacion = modeloTransportista.NumerdeIdentificacion;
            transportista.Tipo_identificacion = modeloTransportista.TipoidentificacionId;
            transportista.Placa = modeloTransportista.Placa.ToUpper();
            transportista.Fecha_modificacion = DateTime.Now;

            db.SaveChanges();
        }

    }
}