using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models
{
    public class ModeloComprobanteReporte
    {
        public string Url;
        public string UrlImagenes;
        public string Documento { get; set; }
        public string Cliente { get; set; }
        public string Fecha { get; set; }
        public decimal Valor { get; set; }
        public byte[] Imagen { get; set; }
    }
}