using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models;
using Facturacion_Electronica.Models.Usuario;
using System;
using System.Collections.Generic;
using System.Data.Entity.Core.Objects;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class AdminController : Controller
    {
        private FacturacionElectronicaEntities _db = new FacturacionElectronicaEntities();
        // GET: Admin
        public ActionResult Index()
        {
            ViewBag.UserName = this.GetUsuarioLogeado().NombreUsuario;
            return View();
        }

        public ActionResult Listado(int numero = 0)
        {
            if (numero == 0)
            {
                numero = 5;
            }
            else
            {
                numero += 5;
            }

            var idEmisor = GetUsuarioLogeado().IdEmisor;

            if (idEmisor == 0)
            {
                return View(new List<ModeloComprobanteReporte>());
            }

            var listado = new List<ModeloComprobanteReporte>();
            //foreach (var documento in _db.Factura.Where(x=> EntityFunctions.TruncateTime(x.Fecha_emision) == EntityFunctions.TruncateTime(DateTime.Now) && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Factura.Where(x => x.id_emisor == idEmisor && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))

            {
                var imagen = documento.Detalle_factura.FirstOrDefault(x => x.Producto.imagen != null);
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Clientes.nombre_cliente,
                    Documento = "Factura #" + documento.Numero,
                    Fecha = documento.Fecha_emision.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/Factura/View/" + documento.id,
                    UrlImagenes = "Factura/Imagenes/" + documento.id,
                    Valor = documento.Total,
                    Imagen = imagen != null ? imagen.Producto.imagen : null
                });
            }

            //foreach (var documento in _db.Nota_credito.Where(x => EntityFunctions.TruncateTime(x.Fecha_emision) == EntityFunctions.TruncateTime(DateTime.Now) && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Nota_credito.Where(x => x.id_emisor == idEmisor && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))
            {
                var imagen = documento.Detalle_nota_credito.FirstOrDefault(x => x.Producto.imagen != null);
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Clientes.nombre_cliente,
                    Documento = "Nota Crédito #" + documento.Numero,
                    Fecha = documento.Fecha_emision.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/NotaCredito/View/" + documento.id,
                    UrlImagenes = "NotaCredito/Imagenes/" + documento.id,
                    Valor = documento.Total,
                    Imagen = imagen != null ? imagen.Producto.imagen : null
                });
            }

            //foreach (var documento in _db.Nota_debito.Where(x => EntityFunctions.TruncateTime(x.Fecha_emision) == EntityFunctions.TruncateTime(DateTime.Now) && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Nota_debito.Where(x => x.id_emisior == idEmisor && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))
            {
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Clientes.nombre_cliente,
                    Documento = "Nota Débito #" + documento.Numero,
                    Fecha = documento.Fecha_emision.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/NotaDebito/View/" + documento.id,
                    UrlImagenes = "NotaDebito/Imagenes/" + documento.id,
                    Valor = documento.Total
                });
            }
            //foreach (var documento in _db.Liquidacion_Compra.Where(x => EntityFunctions.TruncateTime(x.Fecha_emision) == EntityFunctions.TruncateTime(DateTime.Now) && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Liquidacion_Compra.Where(x => x.id_emisor == idEmisor && (x.Estado == EnumEstadosComprobante.AUTORIZADO || x.Estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))
            {
                var imagen = documento.Detalle_Liquidacion.FirstOrDefault(x => x.Producto.imagen != null);
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Clientes.nombre_cliente,
                    Documento = "Liquidación de Compra #" + documento.Numero,
                    Fecha = documento.Fecha_emision.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/LiquidacionCompra/View/" + documento.id,
                    UrlImagenes = "LiquidacionCompra/Imagenes/" + documento.id,
                    Valor = documento.Total,
                    Imagen = imagen != null ? imagen.Producto.imagen : null
                });
            }
            //foreach (var documento in _db.Guia_remision.Where(x => EntityFunctions.TruncateTime(x.Fecha_inicio_transporte) == EntityFunctions.TruncateTime(DateTime.Now) && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Guia_remision.Where(x => x.id_emisor == idEmisor && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))
            {
                Producto producto = new Producto();
                foreach (var dest in documento.Guia_remision_destinatario.ToList())
                {
                    foreach (var produc in dest.Detalles_guia_remision.ToList())
                    {
                        if (produc.Producto.imagen != null)
                        {
                            producto = produc.Producto;
                        }
                    }
                }
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Transportistas.Nombre,
                    Documento = "Guia de Remisión #" + documento.Numero_comprobante,
                    Fecha = documento.Fecha_inicio_transporte.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/GuiaRemision/View/" + documento.id,
                    UrlImagenes = "GuiaRemision/Imagenes/" + documento.id,
                    Imagen = producto.imagen ?? null
                });
            }
            //foreach (var documento in _db.Retencion.Where(x => EntityFunctions.TruncateTime(x.fecha_emision) == EntityFunctions.TruncateTime(DateTime.Now) && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)))
            foreach (var documento in _db.Retencion.Where(x => x.id_emisor == idEmisor && (x.estado == EnumEstadosComprobante.AUTORIZADO || x.estado == EnumEstadosComprobante.FINALIZADO)).OrderByDescending(x => x.id))
            {
                listado.Add(new ModeloComprobanteReporte
                {
                    Cliente = documento.Clientes != null ? documento.Clientes.nombre_cliente : "",
                    Documento = "Nota Débito #" + documento.numero,
                    Fecha = documento.fecha_emision.ToString("dd/MM/yyyy HH:mm"),
                    Url = "/Retencion/View/" + documento.id,
                    UrlImagenes = "Retencion/Imagenes/" + documento.id,
                });
            }
            return View(listado.Take(numero).ToList());
        }

        public ActionResult Menu()
        {
            var usuario = GetUsuarioLogeado();

            var datosUsuario = _db.Usuario.FirstOrDefault(x=>x.Nombre_usuario == usuario.NombreUsuario);
            if (datosUsuario != null)
            {
                ViewBag.UsuarioAutenticado = $"{datosUsuario.Apellido} {datosUsuario.Nombre} ({datosUsuario.Correo})";
            }
            else
            {
                ViewBag.UsuarioAutenticado = "No determinado";
            }

            return View(usuario.IdRol != EnumRolUsuario.ADMIN_SISTEMA);
        }


        [NonAction]
        private ModeloUsuarioSesion GetUsuarioLogeado()
        {
            var cookieName = FormsAuthentication.FormsCookieName; //Find cookie name
            var authCookie = HttpContext.Request.Cookies[cookieName]; //Get the cookie by it's name
            if (authCookie == null) return null;
            var ticket = FormsAuthentication.Decrypt(authCookie.Value); //Decrypt it
            var usuario = _db.Usuario.Where(x => x.Nombre_usuario == ticket.Name).FirstOrDefault();


            var modelo = new ModeloUsuarioSesion
            {
                NombreUsuario = ticket.Name,
                IdEmisor = (usuario == null || usuario.Emisor == null) ? 0 : usuario.id_emisor.Value,
                IdRol = usuario.id_rol
            };
            return modelo;
        }
    }


}