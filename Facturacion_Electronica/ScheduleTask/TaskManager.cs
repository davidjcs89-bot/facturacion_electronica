
using Facturacion_Electronica.ScheduleTask;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace ElectronicBilling.Business.ScheduleTask
{
    public class TaskManager
    {
        private static readonly TaskManager _taskManager = new TaskManager();
        private readonly List<TaskThread> _taskThreads = new List<TaskThread>();
        private const int _runTasksInterval = 300;//60 * 30; //30 minutes

        public void Initialize()
        {
            this._taskThreads.Clear();

            var scheduleTasks = new List<Task>();
            var task = new Task("EBilling", true, false, "ElectronicBillinProcess", DateTime.Now);
            var taskThread = new TaskThread
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
        public static TaskManager Instance
        {
            get
            {
                return _taskManager;
            }
        }

        /// <summary>
        /// Gets a list of task threads of this task manager
        /// </summary>
        public IList<TaskThread> TaskThreads
        {
            get
            {
                return new ReadOnlyCollection<TaskThread>(this._taskThreads);
            }
        }
    }
}