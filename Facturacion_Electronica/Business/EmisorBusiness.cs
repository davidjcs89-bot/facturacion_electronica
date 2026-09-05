using Facturacion_Electronica.Models.Emisor;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;

namespace Facturacion_Electronica.Business
{
    public class EmisorBusiness
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();

        public List<Emisor> BuscarEmisores(ModeloBuscarEmisor modeloBuscar)
        {
            if (modeloBuscar.BuscarTodos)
            {
                return _db.Emisor.Where(x=> x.estado != 3).OrderByDescending(x => x.id).ToList();
            }
            if (modeloBuscar.BuscarPorRuc != null && modeloBuscar.BuscarPorRuc.Trim().Length > 0)
            {
                return _db.Emisor.Where(x => x.Ruc == modeloBuscar.BuscarPorRuc && x.estado != 3).OrderByDescending(x => x.id).ToList();
            }
            else if (modeloBuscar.BuscarPorRazonSocial != null && modeloBuscar.BuscarPorRazonSocial.Trim().Length > 0)
            {
                return _db.Emisor.Where(x => x.Razon_social.ToUpper().Contains(modeloBuscar.BuscarPorRazonSocial.ToUpper()) && x.estado != 3).OrderByDescending(x => x.id).ToList();
            }
            else if (modeloBuscar.BuscarPorEstadoUsuario != 0)
            {
                return _db.Emisor.Where(x => x.estado == modeloBuscar.BuscarPorEstadoUsuario).OrderByDescending(x => x.id).ToList();
            }
            else
            {
                return new List<Emisor>();
            }
        }

        public void GuardarEmisor(ModeloEmisor modeloEmisor, String nombreUsuario)
        {
            var emisor = new Emisor
            {
                Ruc = modeloEmisor.Ruc,
                Razon_social = modeloEmisor.RazonSocial.ToUpper(),
                Nombre_comercial = modeloEmisor.NombreComercial.ToUpper(),
                Direccion_matriz = modeloEmisor.DireccionMatriz.ToUpper(),
                Cintirbuyente_especial = modeloEmisor.ContirbuyenteEspecial,
                Numero_con_especial = modeloEmisor.NumeroContribuyenteEspecial,
                Obligado_conta = modeloEmisor.ObligadoContabilidad,
                Logo = modeloEmisor.Logo,
                Tipo_ambiente = modeloEmisor.TipoAmbiente,
                id_impuesto_iva_actual = modeloEmisor.IdImpuestoIva,
                Archivo_firma = modeloEmisor.Firma,
                Contrasena = modeloEmisor.ContrasenaFirma ?? " ",
                Fecha_creacion = DateTime.Now,
                fecha_modificacion = DateTime.Now,
                adicionales_comprobantes = modeloEmisor.Adicionales,
                control_inventario = modeloEmisor.ControlInventario,
                Emisor_habilitacion = new Emisor_habilitacion { fecha_desde = DateTime.Now, fecha_hasta = DateTime.Now.AddDays(90) }
            };
            _db.Emisor.Add(emisor);

            var usuarario = _db.Usuario.Where(x => x.Nombre_usuario == nombreUsuario).FirstOrDefault();
            if (usuarario != null)
            {
                usuarario.id_emisor = emisor.id;
            }

            // Crear bodega por defecto
            emisor.Bodegas.Add(new Bodegas { activa = true, codigo = "1", nombre = "BODEGA PRINCIPAL" });

            _db.SaveChanges();
            this.CrearProductosPorDefecto(emisor.id, emisor.id_impuesto_iva_actual);
        }

        private void CrearProductosPorDefecto(int idEmisor, int impuestoIva)
        {
            _db.Producto.Add(new Producto
            {
                Cantidad_producto = 10,
                Codigo = "PRODUCTO",
                Codigo_auxiliar = "PRODUCTO01",
                Codigo_iva = impuestoIva,
                Codigo_ice = EnumImpuestoProducto.NO_APLICA_ICE,
                Codigo_irbpnr = EnumImpuestoProducto.NO_APLICA_IRBPNR,
                Costo_producto = 1,
                Precio = 1,
                Tipo_producto = EnumTipoProducto.BIEN,
                id_emisor = idEmisor,
                Nombre = "PRODUCTO",
                fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
                Fecha_elavoracionproducto = DateTime.Now,
                Fecha_caducidadproducto = null,
                imagen = null
            });

            _db.Producto.Add(new Producto
            {
                Cantidad_producto = 10,
                Codigo = "SERVICIO",
                Codigo_auxiliar = "SERVICIO01",
                Codigo_iva = impuestoIva,
                Codigo_ice = EnumImpuestoProducto.NO_APLICA_ICE,
                Codigo_irbpnr = EnumImpuestoProducto.NO_APLICA_IRBPNR,
                Costo_producto = 1,
                Precio = 1,
                Tipo_producto = EnumTipoProducto.SERVICIO,
                id_emisor = idEmisor,
                Nombre = "SERVICIO",
                fecha_creacion = DateTime.Now,
                Fecha_modificacion = DateTime.Now,
                Fecha_elavoracionproducto = DateTime.Now,
                Fecha_caducidadproducto = null,
                imagen = null
            });

            _db.SaveChanges();
        }

        public ModeloEmisor BuscarEmisor(int id)
        {
            var emisor = _db.Emisor.Find(id);
            if (emisor == null)
            {
                return null;
            }

            var modeloEmisor = new ModeloEmisor
            {
                Id = emisor.id,
                Ruc = emisor.Ruc,
                RazonSocial = emisor.Razon_social,
                NombreComercial = emisor.Nombre_comercial,
                DireccionMatriz = emisor.Direccion_matriz,
                ContirbuyenteEspecial = emisor.Cintirbuyente_especial,
                NumeroContribuyenteEspecial = emisor.Numero_con_especial,
                ObligadoContabilidad = emisor.Obligado_conta,
                TipoAmbiente = emisor.Tipo_ambiente,
                Firma = emisor.Archivo_firma,
                Logo = emisor.Logo,
                ContrasenaFirma = emisor.Contrasena,
                IdImpuestoIva = emisor.id_impuesto_iva_actual,
                ControlInventario = emisor.control_inventario,
                Adicionales = emisor.adicionales_comprobantes
            };

            if (emisor.Logo != null)
            {
                int relativePathStartIndex = emisor.Logo.IndexOf("Logos");
                String relativePath = emisor.Logo.Substring(relativePathStartIndex);
                modeloEmisor.LogoRelativoPath = relativePath.Replace('\\', '/').Insert(0, "~/");
            }

            return modeloEmisor;
        }


        public void ActualizarEmisor(ModeloEmisor modeloEmisor)
        {
            var emisor = _db.Emisor.Find(modeloEmisor.Id);
            //SE CONTROLA LAS POSIBLES EXCEPCIONES QUE SALGAN
            try
            {
                //SE EXTRAE LOS PRODUCTOS POR DEFECTO (PRODUCTO Y SERVICIO) MEDIANTE EL ID
                var productosDefault = _db.Producto.Where(p => p.id == 870 || p.id == 871);

                //SE VALIDA QUE HAYA PRODUCTOS PARA PODER HACER LOS CAMBIOS
                if (productosDefault != null || productosDefault.ToArray().Length > 0)
                {
                    //SE RECORRE LA LISTA DE PRODUCTOS POR DEFECTO
                    foreach (var producto in productosDefault)
                    {
                        //SE ACTUALIZA EL CODIGO DEL IMPUESTO DEL PRODUCTO
                        producto.Codigo_iva = modeloEmisor.IdImpuestoIva;
                    }
                }

            }
            catch(Exception ex)
            {
                //SE MUESTRA UN MENSAJE EN LA CONSOLA DE DEPURACION
                Debug.WriteLine("EXEPTION "+ ex.Message);
            }


            if (emisor == null)
            {
                return;
            }

            var logo = emisor.Logo;
            var firma = emisor.Archivo_firma;
            var contraenaFirma = emisor.Contrasena;

            if (modeloEmisor.Logo == null)
            {
                modeloEmisor.Logo = logo;
            }
            if (modeloEmisor.Firma == null)
            {
                modeloEmisor.Firma = firma;
            }
            if (modeloEmisor.ContrasenaFirma == null)
            {
                modeloEmisor.ContrasenaFirma = contraenaFirma;
            }

            emisor.Razon_social = modeloEmisor.RazonSocial.ToUpper();
            emisor.Nombre_comercial = modeloEmisor.NombreComercial.ToUpper();
            emisor.Direccion_matriz = modeloEmisor.DireccionMatriz.ToUpper();
            emisor.Cintirbuyente_especial = modeloEmisor.ContirbuyenteEspecial;
            emisor.Numero_con_especial = modeloEmisor.NumeroContribuyenteEspecial;
            emisor.Obligado_conta = modeloEmisor.ObligadoContabilidad;
            emisor.Logo = modeloEmisor.Logo;
            emisor.Tipo_ambiente = modeloEmisor.TipoAmbiente;
            emisor.Archivo_firma = modeloEmisor.Firma;
            emisor.Contrasena = modeloEmisor.ContrasenaFirma;
            emisor.fecha_modificacion = DateTime.Now;
            emisor.Ruc = modeloEmisor.Ruc;
            emisor.id_impuesto_iva_actual = modeloEmisor.IdImpuestoIva;
            emisor.control_inventario = modeloEmisor.ControlInventario;
            emisor.adicionales_comprobantes = modeloEmisor.Adicionales;
            _db.SaveChanges();
        }

        public bool ValidarCedulaRuc(string ruc, bool esRuc = true)
        {

            if (esRuc && ruc.Trim().Length != 13)
            {
                return false;
            }

            if (!esRuc && ruc.Trim().Length != 10)
            {
                return false;
            }

            string pattern = @"^[0-9]{10,13}$";
            return new Regex(pattern).IsMatch(ruc);
            //if (esRuc && ruc.Length != 13)
            //{
            //    return false;
            //}
            //else if (!esRuc && ruc.Length != 10)
            //{
            //    return false;
            //}
            //var flag = false;
            //var suma = 0;
            //if (ruc != null)
            //{
            //    if (int.Parse(ruc.Substring2(0, 2)) >= 1 && int.Parse(ruc.Substring2(0, 2)) <= 24)
            //    {
            //        int verificador;
            //        int temp;
            //        int res;
            //        if ((Regex.IsMatch(ruc, "\\d{10}") && int.Parse(ruc.Substring2(2, 3)) >= 0 && int.Parse(ruc.Substring2(2, 3)) <= 5) || (Regex.IsMatch(ruc, "\\d{13}") && (int.Parse(ruc.Substring2(2, 3)) >= 0) && int.Parse(ruc.Substring2(2, 3)) <= 5 && !ruc.Substring2(10, 12).Equals("000")))
            //        {
            //            verificador = int.Parse(ruc.Substring2(9, 10));
            //            const string coheficientes = "212121212";
            //            for (var i = 0; i < 9; i++)
            //            {
            //                temp = (int.Parse(ruc.Substring2(i, i + 1)) * int.Parse(coheficientes.Substring2(i, i + 1)));
            //                if (temp > 9)
            //                {
            //                    var aux = temp.ToString();
            //                    temp = int.Parse(aux.Substring2(0, 1)) + int.Parse(aux.Substring2(1, 2));
            //                }
            //                suma += temp;
            //            }
            //            suma %= 10;
            //            if (suma == 0)
            //            {
            //                res = 0;
            //            }
            //            else
            //            {
            //                res = 10 - suma;
            //            }
            //            if (res == verificador)
            //            {
            //                flag = true;
            //            }
            //        }
            //        else if (Regex.IsMatch(ruc, "\\d{13}") && (int.Parse(ruc.Substring2(2, 3)) == 9) && !ruc.Substring2(10, 12).Equals("000"))
            //        {
            //            const string coheficientes = "432765432";
            //            verificador = int.Parse(ruc.Substring2(9, 10));
            //            for (int i = 0; i < 9; i++)
            //            {
            //                temp = (int.Parse(ruc.Substring2(i, i + 1)) * int.Parse(coheficientes.Substring2(i, i + 1)));
            //                suma += temp;
            //            }
            //            suma %= 11;
            //            if (suma == 0)
            //            {
            //                res = 0;
            //            }
            //            else
            //            {
            //                res = 11 - suma;
            //            }
            //            if (res == verificador)
            //            {
            //                flag = true;
            //            }
            //        }
            //        else if (Regex.IsMatch(ruc, "\\d{13}") && (int.Parse(ruc.Substring2(2, 3)) == 6) && !ruc.Substring2(9, 12).Equals("0000"))
            //        {
            //            const string coheficientes = "32765432";
            //            verificador = int.Parse(ruc.Substring2(8, 9));
            //            for (int i = 0; i < 8; i++)
            //            {
            //                temp = (int.Parse(ruc.Substring2(i, i + 1)) * int.Parse(coheficientes.Substring2(i, i + 1)));
            //                suma += temp;
            //            }
            //            suma %= 11;
            //            if (suma == 0)
            //            {
            //                res = 0;
            //            }
            //            else
            //            {
            //                res = 11 - suma;
            //            }
            //            if (res == verificador)
            //            {
            //                flag = true;
            //            }
            //        }
            //    }
            //}
            //return flag;
        }
    }
}