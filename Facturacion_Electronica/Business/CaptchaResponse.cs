using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.Business
{
    public class CaptchaResponse
    {
        /// <summary>
        /// Gets or sets a value indicating whether validation is success
        /// </summary>
        [JsonProperty(PropertyName = "success")]
        public bool IsValid { get; set; }

        /// <summary>
        /// Gets or sets a date and time of the challenge load
        /// </summary>
        [JsonProperty(PropertyName = "challenge_ts")]
        public DateTime? ChallengeDateTime { get; set; }

        /// <summary>
        /// Gets or sets the hostname of the site where the reCAPTCHA was solved
        /// </summary>
        [JsonProperty(PropertyName = "hostname")]
        public string Hostname { get; set; }

        /// <summary>
        /// Gets or sets errors
        /// </summary>
        [JsonProperty(PropertyName = "error-codes")]
        public List<string> Errors { get; set; }
    }
}