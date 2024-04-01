
using System;
using Facturacion_Electronica.Business;

namespace ElectronicBilling.Business.ScheduleTask
{

    public class Task
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

        private ComprobanteBusiness compartidaBusiness = new ComprobanteBusiness();

        public Task()
        {
            this.Enabled = true;
        }

        public Task(string type, bool enabled, bool stopOnError, string name, DateTime lastSuccessUtc)
        {
            this.Type = type;
            this.Enabled = enabled;
            this.StopOnError = stopOnError;
            this.Name = name;
            this.LastSuccessUtc = lastSuccessUtc;
        }
        public void Execute()
        {
            compartidaBusiness.ProcesarComprobantesElectronico();

        }
    }
}