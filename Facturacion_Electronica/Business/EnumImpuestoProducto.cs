using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class EnumImpuestoProducto
    {
        public static int IVA = 1;
        public static int IVA_2024 = 4;
        public static int ICE = 2;
        public static int IRBPNR = 3;
        public static int NO_APLICA_ICE = 99;
        public static int NO_APLICA_IRBPNR = 100;
    }
}