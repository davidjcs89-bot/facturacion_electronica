using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Secuencias
{
    public class ModeloSecuencia
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public int IdDocumento { get; set; }
        public string Documento { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        [Range(1, int.MaxValue, ErrorMessage = "Solo permite enteros positivos")]
        public int Secuencial { get; set; }
    }
}