using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class EnumDatosGenerales
    {
        public static int ID_CONSUMIDOR_FINAL = 1;
        public static decimal MONTO_MAXIMO_CONSUMIFOR_FINAL = 50;
        public static string NUMERO_IDENTIFICACION_CONSUMIDOR_FINAL = "9999999999999";
        public static string DirectorioDocumentos => "~/DocumentosElectronicos/";
    }
}