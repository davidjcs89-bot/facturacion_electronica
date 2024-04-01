
using Facturacion_Electronica.ScheduleTask;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace ElectronicBilling.Business.ScheduleTask
{
    public class TaskManagerNotas
    {
        private static readonly TaskManagerNotas _taskManager = new TaskManagerNotas();
        private readonly List<TaskThreadNotas> _taskThreads = new List<TaskThreadNotas>();
        private const int _runTasksInterval = 86400;

        public void Initialize()
        {
            this._taskThreads.Clear();

            var scheduleTasks = new List<TaskNotasCliente>();
            var task = new TaskNotasCliente("Clientes", true, false, "Notas", DateTime.Now);
            var taskThread = new TaskThreadNotas
            {
                Seconds = _runTasksInterval
            };
            taskThread.AddTask(task);
            this._taskThreads.Add(taskThread);
        }


        /// <summary>
        /// Starts the task manager
        /// </summary>
        public void Start()
        {
            foreach (var taskThread in this._taskThreads)
            {
                taskThread.InitTimer();
            }
        }

        /// <summary>
        /// Stops the task manager
        /// </summary>
        public void Stop()
        {
            foreach (var taskThread in this._taskThreads)
            {
                taskThread.Dispose();
            }
        }

        /// <summary>
        /// Gets the task mamanger instance
        /// </summary>
        public static TaskManagerNotas Instance
        {
            get
            {
                return _taskManager;
            }
        }

        /// <summary>
        /// Gets a list of task threads of this task manager
        /// </summary>
        public IList<TaskThreadNotas> TaskThreads
        {
            get
            {
                return new ReadOnlyCollection<TaskThreadNotas>(this._taskThreads);
            }
        }
    }
}