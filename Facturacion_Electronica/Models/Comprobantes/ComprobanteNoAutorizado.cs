using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Comprobantes
{

    public class ModeloBusquedaComprobateNoAutorizado
    {
        public DateTime BuscarFechaDesde { get; set; }
        public DateTime BuscarFechaHasta { get; set; }
        public List<vw_comprobantes_no_autorizados> Comprobantes { get; set; }
    }

    public class ComprobanteNoAutorizado
    {
        public string TipoComprobante { get; set; }
        public string NumeroComprobante { get; set; }
        public bool Estado { get; set; }
        public string Mensajes { get; set; }
        public DateTime FechaModificacion { get; set; }
    }
}