using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Web.Mvc;
using Facturacion_Electronica;
using Facturacion_Electronica.Business;
using Facturacion_Electronica.Models.Usuario;
using System.Web.Security;
using Facturacion_Electronica.Models.Producto;
using System.IO;
using ExcelDataReader;
using System.Web.Hosting;
using Facturacion_Electronica.Models.Factura;
using System.Data.Entity.Core.Objects;
using Newtonsoft.Json;

namespace Facturacion_Electronica.Controllers
{
    [Authorize]
    public class ProductoController : Controller
    {
        private FacturacionElectronicaEntities db = new FacturacionElectronicaEntities();
        private Productobusiness productobusiness = new Productobusiness();

        // GET: Producto
        public ActionResult Index()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            //var producto = db.Producto.Include(p => p.Emisor).Include(p => p.Porcentaje_impuesto_producto).Include(p => p.Porcentaje_impuesto_producto1).Include(p => p.Porcentaje_impuesto_producto2);
            return View(new ModeloBuscarProducto { Productos = new List<Producto>() });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(ModeloBuscarProducto modelo)
        {
            var productos = productobusiness.BuscarProductos(modelo, GetUsuarioLogeado().IdEmisor, 0);
            modelo.Productos = productos;
            return View(modelo);
        }
        // GET: Producto/Create
        public ActionResult Create()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            ViewBag.FechaElavoracion = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.FechaCaducidad = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.TipoProducto = new SelectList(db.Tipo_producto, "id", "Descripcion");
            ViewBag.ImpuestoIce = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.ICE).ToList(), "id", "Descripcion", 99);
            ViewBag.ImpuestoIrbpnr = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IRBPNR).ToList(), "id", "Descripcion", 100);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024).ToList(), "id", "Descripcion", 2);
            return View(new ModeloProducto { Nombre = "Nombre del Producto", Cantidad = 1, IdImpuestoIce = 99, IdImpuestoIrbpnr = 100, IdImpuestoIva = 2, Atributos = new List<AtributoProducto>(new AtributoProducto[3]) });
        }

        // POST: Producto/Create

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(ModeloProducto modeloProducto, HttpPostedFileBase foto)
        {
            int idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.FechaElavoracion = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.FechaCaducidad = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.TipoProducto = new SelectList(db.Tipo_producto, "id", "Descripcion", modeloProducto.TipoProductoId);
            ViewBag.ImpuestoIce = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.ICE).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIce);
            ViewBag.ImpuestoIrbpnr = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IRBPNR).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIrbpnr);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIva);

            if (ModelState.IsValid)
            {
                if (foto == null)
                {
                    if (db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo == modeloProducto.CodigoPrincipal))
                    {
                        ModelState.AddModelError("CodigoPrincipal", "Ya existe un producto con este código");
                        return View(modeloProducto);
                    }
                }
                else
                {
                    if (foto.ContentType != "image/png" || foto.ContentType != "image/jpg" || foto.ContentType != "image/jpeg") //Only png or jpg image
                    {
                        if (foto.ContentLength <= 1000000) //Maximo un mega de tamaño
                        {
                            if (!db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo == modeloProducto.CodigoPrincipal))
                            {
                                using (var binaryReader = new BinaryReader(foto.InputStream))
                                {
                                    modeloProducto.Imagen = binaryReader.ReadBytes(foto.ContentLength);
                                }

                            }
                            else
                            {
                                ModelState.AddModelError("CodigoPrincipal", "Ya existe un producto con este código");
                                return View(modeloProducto);
                            }
                        }
                        else
                        {
                            ModelState.AddModelError("Imagen", "El archivo de la imagen máxmio de 1MB");
                            return View(modeloProducto);
                        }
                    }
                    else
                    {
                        ModelState.AddModelError("Imagen", "El archivo de la imagen solo en formato jpg o png");
                    }
                }

                productobusiness.CrearProducto(modeloProducto, idEmisor);
                return RedirectToAction("Edit", modeloProducto.Id);
            }

            return View(modeloProducto);
        }

        // GET: Producto/Edit/5
        public ActionResult Edit(int id)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            var producto = db.Producto.Find(id);
            if (producto == null || producto.id_emisor != idEmisor)
            {
                return RedirectToAction("Index");
            }
            var modeloProducto = productobusiness.GenerarModeloProducto(id);
            if (modeloProducto == null)
            {
                return RedirectToAction("Index");
            }
            ViewBag.FechaElavoracion = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.FechaCaducidad = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.TipoProducto = new SelectList(db.Tipo_producto, "id", "Descripcion", modeloProducto.TipoProductoId);
            ViewBag.ImpuestoIce = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.ICE).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIce);
            ViewBag.ImpuestoIrbpnr = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IRBPNR).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIrbpnr);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIva);
            return View(modeloProducto);
        }

        // POST: Producto/Edit/5
        // Para protegerse de ataques de publicación excesiva, habilite las propiedades específicas a las que desea enlazarse. Para obtener 
        // más información vea https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(ModeloProducto modeloProducto, HttpPostedFileBase foto)
        {
            bool actualizaImagen = false;
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.FechaElavoracion = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.FechaCaducidad = modeloProducto.FechaElavoracion.ToString("yyyy-MM-dd");
            ViewBag.TipoProducto = new SelectList(db.Tipo_producto, "id", "Descripcion", modeloProducto.TipoProductoId);
            ViewBag.ImpuestoIce = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.ICE).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIce);
            ViewBag.ImpuestoIrbpnr = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IRBPNR).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIrbpnr);
            ViewBag.ImpuestoIva = new SelectList(db.Porcentaje_impuesto_producto.Where(x => x.Id_impuesto == EnumImpuestoProducto.IVA || x.Id_impuesto == EnumImpuestoProducto.IVA_2024).ToList(), "id", "Descripcion", modeloProducto.IdImpuestoIva);

            if (ModelState.IsValid)
            {
                if (foto == null)
                {
                    if (db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo == modeloProducto.CodigoPrincipal && x.id != modeloProducto.Id))
                    {
                        ModelState.AddModelError("CodigoPrincipal", "Ya existe un producto con este código");
                        modeloProducto = productobusiness.GenerarModeloProducto(modeloProducto.Id);
                        return View(modeloProducto);
                    }
                }
                else
                {
                    if (foto.ContentType != "image/png" || foto.ContentType != "image/jpg" || foto.ContentType != "image/jpeg") //Only png or jpg image
                    {
                        if (foto.ContentLength <= 1000000) //Maximo un mega de tamaño
                        {
                            if (!db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo == modeloProducto.CodigoPrincipal && x.id != modeloProducto.Id))
                            {
                                using (var binaryReader = new BinaryReader(foto.InputStream))
                                {
                                    modeloProducto.Imagen = binaryReader.ReadBytes(foto.ContentLength);
                                    actualizaImagen = true;
                                }
                            }
                            else
                            {
                                ModelState.AddModelError("CodigoPrincipal", "Ya existe un producto con este código");
                                modeloProducto = productobusiness.GenerarModeloProducto(modeloProducto.Id);
                                return View(modeloProducto);
                            }
                        }
                        else
                        {
                            ModelState.AddModelError("Imagen", "El archivo de la imagen máxmio de 1MB");
                            modeloProducto = productobusiness.GenerarModeloProducto(modeloProducto.Id);
                            return View(modeloProducto);
                        }
                    }
                    else
                    {
                        ModelState.AddModelError("Imagen", "El archivo de la imagen solo en formato jpg o png");
                        modeloProducto = productobusiness.GenerarModeloProducto(modeloProducto.Id);
                        return View(modeloProducto);
                    }
                }

                productobusiness.ActualizarProducto(modeloProducto, actualizaImagen);
                return RedirectToAction("Edit",modeloProducto.Id);
            }

            modeloProducto = productobusiness.GenerarModeloProducto(modeloProducto.Id);
            return View(modeloProducto);
        }

        // GET: Producto/Delete/5
        public async Task<ActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Producto producto = await db.Producto.FindAsync(id);
            if (producto == null)
            {
                return HttpNotFound();
            }
            return View(producto);
        }

        // POST: Producto/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(int id)
        {
            Producto producto = await db.Producto.FindAsync(id);
            db.Producto.Remove(producto);
            await db.SaveChangesAsync();
            return RedirectToAction("Index");
        }

        public ActionResult Importar()
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }
            return View();
        }

        public FileResult DescargarPlantillaImportacion()
        {
            byte[] fileBytes = System.IO.File.ReadAllBytes(HostingEnvironment.MapPath("~/Adicionales/Plantilla.xlsx"));
            string fileName = "1 Plantilla items sidoit.xlsx";
            return File(fileBytes, System.Net.Mime.MediaTypeNames.Application.Octet, fileName);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Importar(HttpPostedFileBase archivo)
        {
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            if (idEmisor == 0)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            var emisor = db.Emisor.FirstOrDefault(x => x.id == idEmisor);

            if (emisor == null)
            {
                ViewBag.MensajeError = "Aun no a configurado los datos de emisor | Menú: Configuración —> Emisor —> ";
                return PartialView("~/Views/Shared/_NoConfigurado.cshtml");
            }

            if (archivo == null)
            {
                ViewBag.Error = "Debe selecconar un archivo";
                return View();
            }

            if (!FileIsValid(archivo))
            {
                ViewBag.Error = "Archivo en formato incorrecto";
                return View();
            }

            using (var stream = archivo.InputStream)
            {
                using (var reader = ExcelReaderFactory.CreateReader(stream))
                {
                    int i = 0;
                    try
                    {
                        while (reader.Read()) //Each row of the file
                        {
                            if (i == 0)
                            {
                                i++;
                                continue;
                            }



                            var codigo = reader.GetValue(0);
                            var codigoAuxiliar = reader.GetValue(1);
                            var nombre = reader.GetValue(2);
                            var precio = reader.GetValue(3);
                            var tipo = reader.GetValue(4);
                            var fechaElaboracion = reader.GetValue(5);
                            var fechaCaducidad = reader.GetValue(6);
                            var cantidad = reader.GetValue(7);
                            var costo = reader.GetValue(8);

                            if (codigo == null || codigo.ToString().Trim().Length == 0 || codigoAuxiliar == null || codigoAuxiliar.ToString().Trim().Length == 0 || nombre == null || nombre.ToString().Trim().Length == 0)
                            {
                                ViewBag.Error = "Informacion incompleta";
                                return View();
                            }

                            if (db.Producto.Any(x => x.id_emisor == idEmisor && x.Codigo.Equals(codigo.ToString(), StringComparison.OrdinalIgnoreCase)))
                            {
                                ViewBag.Error = "Ya existe un producto con en código: " + codigo.ToString();
                                return View();
                            }


                            if (Convert.ToInt32(cantidad) <= 0)
                            {
                                ViewBag.Error = "La cantidad debe ser mayor a cero";
                                return View();
                            }

                            if (Convert.ToDecimal(precio) <= 0)
                            {
                                ViewBag.Error = "El precio debe ser mayor a cero";
                                return View();
                            }


                            if (Convert.ToDecimal(costo) < 0)
                            {
                                ViewBag.Error = "El costo debe ser mayor o igual cero";
                                return View();
                            }

                            DateTime? fechaCaducidadDT;

                            if (fechaCaducidad != null)
                            {
                                fechaCaducidadDT = Convert.ToDateTime(fechaCaducidad);
                            }
                            else
                            {
                                fechaCaducidadDT = null;
                            }


                            DateTime? fechaElaboracionDT;

                            if (fechaElaboracion != null)
                            {
                                fechaElaboracionDT = Convert.ToDateTime(fechaElaboracion);
                            }
                            else
                            {
                                fechaElaboracionDT = null;
                            }

                            var tipoProdutoSt = 1;
                            var tipoProductoDt = db.Tipo_producto.FirstOrDefault(x => x.Descripcion.Equals(tipo.ToString(), StringComparison.OrdinalIgnoreCase));
                            if (tipoProductoDt != null)
                            {
                                tipoProdutoSt = tipoProductoDt.id;
                            }

                            var producto = new Producto
                            {
                                Codigo = codigo.ToString(),
                                Codigo_auxiliar = codigoAuxiliar.ToString(),
                                Nombre = nombre.ToString(),
                                Codigo_iva = emisor.id_impuesto_iva_actual,
                                Codigo_ice = EnumImpuestoProducto.NO_APLICA_ICE,
                                Codigo_irbpnr = EnumImpuestoProducto.NO_APLICA_IRBPNR,
                                Cantidad_producto = Convert.ToInt32(cantidad),
                                Precio = Convert.ToDecimal(precio),
                                Costo_producto = Convert.ToDecimal(costo),
                                id_emisor = idEmisor,
                                Fecha_caducidadproducto = fechaCaducidadDT,
                                Fecha_elavoracionproducto = fechaElaboracionDT,
                                fecha_creacion = DateTime.Now,
                                Fecha_modificacion = DateTime.Now,
                                Tipo_producto = tipoProdutoSt
                            };
                            db.Producto.Add(producto);
                        }
                        db.SaveChanges();

                    }
                    catch (Exception e)
                    {
                        ViewBag.Error = "Los datos esta incorrectos<br/>" + e.Message;
                    }

                }
            }

            ViewBag.Correcto = "OK";

            return View();
        }

        public ActionResult Kardex(string codigo)
        {
            string htmlKardex = "<h2>No posee movientos</h2>";
            var idEmisor = GetUsuarioLogeado().IdEmisor;
            ViewBag.DateFrom = DateTime.Now.ToString("yyyy-MM-dd");
            ViewBag.DateTo = DateTime.Now.ToString("yyyy-MM-dd");

            var producto = productobusiness.GenerarModeloProducto(codigo, idEmisor);

            ObjectParameter res = new ObjectParameter("Report", typeof(string));
            db.SP_Kardex_ultimas(producto.Id, DateTime.Now.ToString("yyyy-MM-dd"), DateTime.Now.ToString("yyyy-MM-dd"), res);

            var dataReport = JsonConvert.DeserializeObject<DataSet>(res.Value.ToString());

            if (dataReport != null && dataReport.Tables[0].Rows.Count > 0)
            {
                htmlKardex = DataTableToHtml(dataReport.Tables[0]);
            }

            return View(new Kardex { producto= producto, KardexHtml = htmlKardex });
        }

        [HttpPost]
        public ActionResult Kardex(Kardex modelo)
        {
            ObjectParameter res = new ObjectParameter("Report", typeof(string));
            var producto = productobusiness.GenerarModeloProducto(modelo.producto.Id);

            db.SP_Kardex_fechas(modelo.producto.Id, modelo.FechaDesde.ToString("yyyy-MM-dd"), modelo.FechaHasta.AddDays(1).ToString("yyyy-MM-dd"), res);

            var dataReport = JsonConvert.DeserializeObject<DataSet>(res.Value.ToString());

            if (dataReport != null && dataReport.Tables[0].Rows.Count >0)
            {
                modelo.KardexHtml = DataTableToHtml(dataReport.Tables[0]);
            }
            else
            {
                modelo.KardexHtml = "<h2>No existe datos de kardex entre las fechas consultadas</h2>";
            }

            ViewBag.DateFrom = modelo.FechaDesde.ToString("yyyy-MM-dd");
            ViewBag.DateTo = modelo.FechaHasta.ToString("yyyy-MM-dd");
            modelo.producto = producto;
            return View(modelo);
        }

        private String DataTableToHtml(DataTable table)
        {
            string html = "<table class=\"table\">";
            //add header row
            html += "<tr>";
            for (int i = 0; i < table.Columns.Count; i++)
                html += "<th>" + table.Columns[i].ColumnName.ToUpper() + "</th>";
            html += "</tr>";
            //add rows
            for (int i = 0; i < table.Rows.Count; i++)
            {
                html += "<tr>";
                for (int j = 0; j < table.Columns.Count; j++)
                    html += "<td>" + table.Rows[i][j].ToString() + "</td>";
                html += "</tr>";
            }
            html += "</table>";

            return html;
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }


        [NonAction]
        private ModeloUsuarioSesion GetUsuarioLogeado()
        {
            var cookieName = FormsAuthentication.FormsCookieName; //Find cookie name
            var authCookie = HttpContext.Request.Cookies[cookieName]; //Get the cookie by it's name
            if (authCookie == null) return null;
            var ticket = FormsAuthentication.Decrypt(authCookie.Value); //Decrypt it
            var emisor = db.Usuario.Where(x => x.Nombre_usuario == ticket.Name).FirstOrDefault();


            var modelo = new ModeloUsuarioSesion
            {
                NombreUsuario = ticket.Name,
                IdEmisor = (emisor == null || emisor.Emisor == null) ? 0 : emisor.id_emisor.Value
            };
            return modelo;
        }

        private bool FileIsValid(HttpPostedFileBase fileUpload)
        {
            if (fileUpload == null)
            {
                return false;
            }
            if (fileUpload.ContentType == "application/vnd.ms-excel" ||
                fileUpload.ContentType == "application/excel" ||
                fileUpload.ContentType == "application/x-msexcel" ||
                fileUpload.ContentType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" //this is xlsx format
                )
                return true;

            return false;
        }

    }
}
