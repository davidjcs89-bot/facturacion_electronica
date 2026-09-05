using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Transferencias
{
    public class ModeloTransferencia
    {
        public int Id { get; set; }

        [Display(Name = "Fecha de Creación")]
        public DateTime FechaCreacion { get; set; }

        [Display(Name = "Fecha de Finalización")]
        public DateTime FechaFinaliza { get; set; }

        [Display(Name = "SKU o Codigo Principal *")]
        public int IdBodegaDesde { get; set; }
    }
}