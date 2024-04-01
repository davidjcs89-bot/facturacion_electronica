using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class EnumTipoDocumento
    {
        public static int FACTURA = 1;
        public static int NOTA_CREDITO = 3;
        public static int RETENCION = 6;
        public static int NOTA_DEBITO = 4;
        public static int LIQUIDACION_COMPRA = 2;
        public static int GUIA_REMISION = 5;
    }
}