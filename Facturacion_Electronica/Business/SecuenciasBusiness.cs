using Facturacion_Electronica.Models.Secuencias;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class SecuenciasBusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();

        public ModeloSecuenciacomprobante GenerarModeloNuevoPuntoEmision()
        {
            var modelo = new ModeloSecuenciacomprobante
            {
                Secuencias = new List<ModeloSecuencia>()
            };

            foreach (var documento in _db.Tipo_documento.ToList())
            {
                modelo.Secuencias.Add(new ModeloSecuencia { 
                    IdDocumento = documento.id,
                    Documento = documento.Descripcion_doc,
                    Codigo = documento.Codigo_doc,
                    Secuencial = 1
                });
            }

            return modelo;
        }

        public void CrearSecuenciasPuntoEmision(ModeloSecuenciacomprobante modelo, int idEmisor)
        {
            var puntoEmision = new Puntos_emisior { 
                Direccion = modelo.Direccion.ToUpper(),
                Fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
                Numero_emision = modelo.NumeroPuntoEmision,
                Numero_establecimiento = modelo.NumeroComprobante,
                Id_emisor = idEmisor,
                Secuencias = new List<Secuencias>()
            };
            foreach (var secuencia in modelo.Secuencias)
            {
                puntoEmision.Secuencias.Add(new Secuencias { 
                    Id_Documentos = secuencia.IdDocumento,
                    Secuencial = secuencia.Secuencial
                });
            }
            _db.Puntos_emisior.Add(puntoEmision);
            _db.SaveChanges();
        }

        public ModeloSecuenciacomprobante ObtenerModeloPuntoEmision(int id)
        {

            var puntoEmision = _db.Puntos_emisior.Find(id);
            if (puntoEmision == null)
            {
                return null;
            }

            var modelo = new ModeloSecuenciacomprobante
            {
                Id = puntoEmision.id,
                NumeroComprobante = puntoEmision.Numero_establecimiento,
                NumeroPuntoEmision = puntoEmision.Numero_emision,
                Direccion = puntoEmision.Direccion,
                Secuencias = new List<ModeloSecuencia>()
            };

            foreach (var secuencia in puntoEmision.Secuencias.ToList())
            {
                modelo.Secuencias.Add(new ModeloSecuencia
                {
                    Id = secuencia.Id,
                    IdDocumento= secuencia.Id_Documentos,
                    Documento = secuencia.Tipo_documento.Descripcion_doc,
                    Codigo = secuencia.Tipo_documento.Codigo_doc,
                    Secuencial = secuencia.Secuencial
                });
            }

            return modelo;
        }

        public void ActualizarSecuenciasPuntoEmision(ModeloSecuenciacomprobante modelo, int idEmisor)
        {
            var puntoEmision = _db.Puntos_emisior.Find(modelo.Id);
            if (puntoEmision == null || puntoEmision.Id_emisor != idEmisor)
            {
                return;
            }

            puntoEmision.Direccion = modelo.Direccion.ToUpper();
            puntoEmision.Fecha_modificacion = DateTime.Now;
            puntoEmision.Numero_emision = modelo.NumeroPuntoEmision;
            puntoEmision.Numero_establecimiento = modelo.NumeroComprobante;

            foreach (var secuencia in puntoEmision.Secuencias.ToList())
            {
                var secuenciaModelo = modelo.Secuencias.FirstOrDefault(x=>x.Id == secuencia.Id);
                if (secuenciaModelo != null)
                {
                    secuencia.Secuencial = secuenciaModelo.Secuencial;
                }
;            }
            _db.SaveChanges();
        }
    }
}