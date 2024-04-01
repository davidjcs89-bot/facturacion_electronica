
namespace ElectronicBilling.WebServices
{
    public class RespuestaAutorizacion
    {

        public string NumeroAutorizacion { get; set; }
        public string FechaAutorizacion { get; set; }
        public string Ambiente { get; set; }
        public string Estado { get; set; }
        public string Xml { get; set; }
        public string Mensaje { get; set; }
        public bool Autorizado { get; set; } 
    }
}
