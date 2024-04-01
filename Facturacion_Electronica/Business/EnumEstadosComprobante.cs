using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class EnumEstadosComprobante
    {
        public static int PENDIENTE = 1;
        public static int PAGADO = 2;
        public static int FINALIZADO = 3;
        public static int RECIBIDO = 4;
        public static int NO_RECIBIDO = 5;
        public static int AUTORIZADO = 6;
        public static int NO_AUTORIZADO = 7;
    }
}