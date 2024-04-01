using Facturacion_Electronica.Models.Producto;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class Productobusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();

        public List<Producto> BuscarProductos(ModeloBuscarProducto modeloBuscar, int IdEmisor)
        {
            if (modeloBuscar.BuscarTodos)
            {
                return _db.Producto.Where(x => x.id_emisor == IdEmisor).ToList();
            }
            if (modeloBuscar.BuscarPorCodigo != null && modeloBuscar.BuscarPorCodigo.Trim().Length > 0)
            {
                return _db.Producto.Where(x => x.id_emisor == IdEmisor && x.Codigo.ToUpper() == modeloBuscar.BuscarPorCodigo.ToUpper()).ToList();
            }
            else if (modeloBuscar.BuscarPorEstilo != null && modeloBuscar.BuscarPorEstilo.Trim().Length > 0)
            {
                return _db.Producto.Where(x => x.id_emisor == IdEmisor && x.Codigo_auxiliar.ToUpper() == modeloBuscar.BuscarPorEstilo.ToUpper()).ToList();
            }
            else if (modeloBuscar.BuscarPorNombre != null && modeloBuscar.BuscarPorNombre.Trim().Length > 0)
            {
                return _db.Producto.Where(x => x.id_emisor == IdEmisor && x.Nombre.ToUpper().Contains(modeloBuscar.BuscarPorNombre.ToUpper())).ToList();
            }
            else
            {
                return new List<Producto>();
            }
        }

        public void CrearProducto(ModeloProducto modeloProducto, int idEmisor)
        {
            var producto = new Producto {
                id_emisor = idEmisor,
                Codigo = modeloProducto.CodigoPrincipal,
                Codigo_auxiliar = modeloProducto.CodigoAuxiliar,
                Codigo_ice = modeloProducto.IdImpuestoIce,
                Codigo_irbpnr = modeloProducto.IdImpuestoIrbpnr,
                Codigo_iva = modeloProducto.IdImpuestoIva,
                Nombre = modeloProducto.Nombre.ToUpper(),
                Precio = modeloProducto.Precio,
                Tipo_producto = modeloProducto.TipoProductoId,
                fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
                Cantidad_producto = modeloProducto.Cantidad,
                Fecha_elavoracionproducto = modeloProducto.FechaElavoracion,
                Fecha_caducidadproducto = modeloProducto.FechaCaducidad,
                Costo_producto = modeloProducto.Costo,
                imagen = modeloProducto.Imagen
            };

            foreach (var atributo in modeloProducto.Atributos)
            {
                if (atributo.Atributo != null && atributo.Valor != null)
                {
                    producto.Atributos_adicionales_producto.Add(new Atributos_adicionales_producto
                    {
                        Atributo = atributo.Atributo,
                        Valor = atributo.Valor
                    });
                }

            }

            _db.Producto.Add(producto);
            _db.SaveChanges();
        }

        public ModeloProducto GenerarModeloProducto(string codigoProducto, int idEmisor)
        {
            var producto = _db.Producto.FirstOrDefault(x=>x.Codigo == codigoProducto && x.id_emisor == idEmisor);
            if (producto == null)
            {
                return null;
            }
            return GenerarModeloProducto(producto.id);
        }

        public ModeloProducto GenerarModeloProducto(int id)
        {
            var producto = _db.Producto.Find(id);
            if (producto == null)
            {
                return null;
            }

            var numeroAtributos = producto.Atributos_adicionales_producto.Count;
            if (numeroAtributos <= 3)
            {
                numeroAtributos = 3 - numeroAtributos;
            }

            var modeloProducto = new ModeloProducto
            {
                CodigoAuxiliar = producto.Codigo_auxiliar,
                CodigoPrincipal = producto.Codigo,
                Id = producto.id,
                IdImpuestoIce = producto.Codigo_ice,
                IdImpuestoIrbpnr = producto.Codigo_irbpnr,
                IdImpuestoIva = producto.Codigo_iva,
                Nombre = producto.Nombre,
                Precio = producto.Precio,
                TipoProductoId = producto.Tipo_producto,
                Cantidad = producto.Cantidad_producto??0,
                Costo = producto.Costo_producto??0,
                FechaElavoracion = producto.Fecha_elavoracionproducto??new DateTime(2020,1,1),
                FechaCaducidad = producto.Fecha_caducidadproducto ?? new DateTime(2020, 1, 1),
                Imagen = producto.imagen,
                Atributos = new List<AtributoProducto>(new AtributoProducto[numeroAtributos])
            };

            foreach (var atributo in producto.Atributos_adicionales_producto.ToList())
            {
                modeloProducto.Atributos.Add(new AtributoProducto { 
                    Atributo = atributo.Atributo,
                    Id = atributo.id,
                    Valor = atributo.Valor
                });
            }

            return modeloProducto;
        }

        public void ActualizarProducto(ModeloProducto modeloProducto)
        {
            var producto = _db.Producto.Find(modeloProducto.Id);
            if (producto == null)
            {
                return;
            }

            foreach (var atributo in producto.Atributos_adicionales_producto.ToList())
            {
                _db.Atributos_adicionales_producto.Remove(atributo);
            }


            producto.Codigo = modeloProducto.CodigoPrincipal;
            producto.Codigo_auxiliar = modeloProducto.CodigoAuxiliar;
            producto.Codigo_ice = modeloProducto.IdImpuestoIce;
            producto.Codigo_irbpnr = modeloProducto.IdImpuestoIrbpnr;
            producto.Codigo_iva = modeloProducto.IdImpuestoIva;
            producto.Nombre = modeloProducto.Nombre.ToUpper();
            producto.Precio = modeloProducto.Precio;
            producto.Tipo_producto = modeloProducto.TipoProductoId;
            producto.Fecha_modificacion = DateTime.Now;
            producto.Cantidad_producto = modeloProducto.Cantidad;
            producto.Costo_producto = modeloProducto.Costo;
            producto.Fecha_elavoracionproducto = modeloProducto.FechaElavoracion;
            producto.Fecha_caducidadproducto = modeloProducto.FechaCaducidad;
            producto.imagen = modeloProducto.Imagen;


            foreach (var atributo in modeloProducto.Atributos)
            {
                if (atributo.Atributo != null && atributo.Valor != null)
                {
                    producto.Atributos_adicionales_producto.Add(new Atributos_adicionales_producto
                    {
                        Atributo = atributo.Atributo,
                        Valor = atributo.Valor,
                        id_Producto = modeloProducto.Id
                    });
                }

            }

            _db.SaveChanges();
        }
    }
}