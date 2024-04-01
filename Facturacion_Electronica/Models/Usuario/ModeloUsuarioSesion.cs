using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Models.Usuario
{
    public class ModeloUsuarioSesion
    {
        public string NombreUsuario { get; set; }
        public int IdEmisor { get; set; }
        public int IdRol { get; set; }
        public int id { get; set; }
    }
}