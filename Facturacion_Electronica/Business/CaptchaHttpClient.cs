using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Microsoft.Net.Http.Headers;
using System.Web;
using System.Threading.Tasks;
using System.Web.Mvc;
using Newtonsoft.Json;

namespace Facturacion_Electronica.Business
{
    public class CaptchaHttpClient
    {
        private readonly HttpClient _httpClient;

        public CaptchaHttpClient(HttpClient client)
        {
            //configure client
            client.BaseAddress = new Uri("https://www.google.com/recaptcha/");
            client.Timeout = TimeSpan.FromMilliseconds(5000);
            client.DefaultRequestHeaders.Add(HeaderNames.UserAgent, $"facturacion-electronioca-sidoit");

            _httpClient = client;
        }
        public virtual async Task<CaptchaResponse> ValidateCaptchaAsync(string responseValue, string ipCliente)
        {

            var privateKey = "6LeFzsQUAAAAAJPRZ8cAZqr9K70bQkeOTb2yupn-";

            //prepare URL to request
            var url = string.Format("https://www.google.com/recaptcha/",
                privateKey,
                responseValue,
                ipCliente);

            //get response
            var response = await _httpClient.GetStringAsync(url);
            return JsonConvert.DeserializeObject<CaptchaResponse>(response);

        }
    }
}