using Facturacion_Electronica.Business;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Facturacion_Electronica.ScheduleTask
{
    public class TaskNotasCliente
    {
        #region Properties

        /// <summary>
        /// Datetime of the last start
        /// </summary>
        public DateTime? LastStartUtc { get; private set; }

        /// <summary>
        /// Datetime of the last end
        /// </summary>
        public DateTime? LastEndUtc { get; private set; }

        /// <summary>
        /// Datetime of the last success
        /// </summary>
        public DateTime? LastSuccessUtc { get; private set; }

        /// <summary>
        /// A value indicating type of the task
        /// </summary>
        public string Type { get; private set; }

        /// <summary>
        /// A value indicating whether to stop task on error
        /// </summary>
        public bool StopOnError { get; private set; }

        /// <summary>
        /// Get the task name
        /// </summary>
        public string Name { get; private set; }

        /// <summary>
        /// A value indicating whether the task is enabled
        /// </summary>
        public bool Enabled { get; set; }

        #endregion

        public TaskNotasCliente()
        {
            this.Enabled = true;
        }

        public TaskNotasCliente(string type, bool enabled, bool stopOnError, string name, DateTime lastSuccessUtc)
        {
            this.Type = type;
            this.Enabled = enabled;
            this.StopOnError = stopOnError;
            this.Name = name;
            this.LastSuccessUtc = lastSuccessUtc;
        }
        public void Execute()
        {
            ClienteBusiness clienteBusiness = new ClienteBusiness();
            clienteBusiness.EnviarNotasClientes();

        }
    }
}