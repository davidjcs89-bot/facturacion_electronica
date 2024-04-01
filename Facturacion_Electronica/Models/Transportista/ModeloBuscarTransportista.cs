using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Transportista
{
    public class ModeloBuscarTransportista
    {
       
        [Display(Name = "Numero de Identificacion:")]
        public string BuscarPorIdentificacion { get; set; }
        [Display(Name = "Razon social, Apellido y Nombre:")]
        public string BuscarPorRazonSocial { get; set; }
        public List<Transportistas> Transportistas { get; set; }
        [Display(Name = "Ver todos los transportistas")]
        public bool BuscarTodos { get; set; }
    }
}