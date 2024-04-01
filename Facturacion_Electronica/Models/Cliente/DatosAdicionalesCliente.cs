using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Cliente
{
    public class DatosAdicionalesCliente
    {
        public int IdCliente { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string Nota { get; set; }
        public List<Datos_Adicionales_Cliente> Notas  { get; set; }
    }
}