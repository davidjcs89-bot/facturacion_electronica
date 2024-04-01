using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Web;
using System.Web.Mvc;

namespace Facturacion_Electronica.Business
{
    public static class ReCapchaBusiness
    {
        public static HtmlString GenerateCaptcha()
        {
            var language = "es";
            //prepare theme
            var theme = "";
            switch (theme)
            {
                case "blackglass":
                case "dark":
                    theme = "dark";
                    break;

                case "clean":
                case "red":
                case "white":
                case "light":
                default:
                    theme = "light";
                    break;
            }

            //prepare identifier
            var id = $"captcha_{GenerateRandomInteger()}";

            //var codigo = 
            //generate reCAPTCHA Control
            var scriptCallbackTag = new TagBuilder("script");
            scriptCallbackTag.InnerHtml +=  $"var onloadCallback{id} = function() {{grecaptcha.render('{id}', {{'sitekey' : '{ReCapchaParametros.ClavePublica}', 'theme' : '{theme}' }});}};";

            var captchaTag = new TagBuilder("div");
            captchaTag.Attributes.Add("id", id);

            var capchaApiUrl = "https://www.google.com/recaptcha/";
            var RecaptchaScriptPath = "api.js?onload=onloadCallback{0}&render=explicit{1}";

            var url = string.Format($"{capchaApiUrl}{RecaptchaScriptPath}", id,
                !string.IsNullOrEmpty(language) ? $"&hl={language}" : string.Empty);
            var scriptLoadApiTag = new TagBuilder("script");
            scriptLoadApiTag.Attributes.Add("src", url);
            scriptLoadApiTag.Attributes.Add("async", null);
            scriptLoadApiTag.Attributes.Add("defer", null);

            return new HtmlString(scriptCallbackTag.ToString() + captchaTag.ToString() + scriptLoadApiTag.ToString());
        }

        private static int GenerateRandomInteger(int min = 0, int max = int.MaxValue)
        {
            var randomNumberBuffer = new byte[10];
            new RNGCryptoServiceProvider().GetBytes(randomNumberBuffer);
            return new Random(BitConverter.ToInt32(randomNumberBuffer, 0)).Next(min, max);
        }
    }
}