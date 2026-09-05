using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Cliente
{
    public class ModeloFichaCliente
    {
        public int Id { get; set; }
        public string Cliente { get; set; }
        public List<ModeloValorAtributoFichaCliente> Atributos { get; set; }
    }

    public class ModeloValorAtributoFichaCliente
    {
        public int Id { get; set; }
        [Required(ErrorMessage = "Dato requerido.")]
        public string Valor { get; set; }
        public int IdAtributo { get; set; }
        public string NombreAtributo { get; set; }
    }
}