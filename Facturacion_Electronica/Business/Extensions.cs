using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public static class Extensions
    {
        public static string Substring2(this string value, int startIndex, int endIndex)
        {
            return value.Substring(startIndex, (endIndex - startIndex));
        }
    }
}