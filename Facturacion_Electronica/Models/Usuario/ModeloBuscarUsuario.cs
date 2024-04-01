using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Usuario
{
    public class ModeloBuscarUsuario
    {
        [Display(Name = "Buscar por Nombre:")]
        public string BuscarPorNombre { get; set; }
        [Display(Name = "Buscar por Apellido:")]
        public string BuscarPorApellido { get; set; }
        [Display(Name = "Buscar por Email:")]
        public string BuscarPorEmail { get; set; }
        public List<Facturacion_Electronica.Usuario> Usuarios { get; set; }
        public bool BuscarTodos { get; set; }
    }
}