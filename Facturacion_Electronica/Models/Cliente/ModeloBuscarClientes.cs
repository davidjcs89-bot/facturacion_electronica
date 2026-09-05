using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Cliente
{
    public class ModeloBuscarClientes
    {
        [Display(Name = "Numero de Identificacion:")]
        public string BuscarPorIdentificacion { get; set; }
        [Display(Name = "Razon social, Apellido y Nombre:")]
        public string BuscarPorRazonSocial { get; set; }
        [Display(Name = "Código:")]
        public string BuscarPorCodigo { get; set; }
        public List<Clientes> Clientes { get; set; }
        [Display(Name = "Ver todos los clientes")]
        public bool BuscarTodos { get; set; }
        [Display(Name = "Número de Celular:")]
        public string BuscarPorTelefono { get; set; }
    }
}