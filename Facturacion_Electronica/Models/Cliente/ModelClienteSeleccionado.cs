using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Cliente
{
    public class ModelClienteSeleccionado
    {
        public int Id { get; set; }
        public string Celular { get; set; }
        public string Direccion { get; set; }
        public string Email { get; set; }
        public bool ExisteCliente { get; set; }
        public string Identificacion { get; set; } // Nueva propiedad para identificación
        public string Nombre { get; set; } // Nueva propiedad para nombre
    }
}