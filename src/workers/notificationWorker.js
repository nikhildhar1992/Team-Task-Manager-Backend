const { Worker, QueueEvents } = require('bullmq');
const { createBullConnection } = require('../config/redis');
const logger = require('../utils/logger');

const connection = createBullConnection();

const queueEvents = new QueueEvents('notifications', { connection });
queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'notification_job_failed');
});

const worker = new Worker(
  'notifications',
  async (job) => {
    switch (job.name) {
      case 'task.assigned': {
        logger.info({ payload: job.data }, 'mock_send_task_assignment_notification');
        break;
      }
      default:
        logger.warn({ jobName: job.name }, 'unknown_notification_job_received');
        break;
    }
  },
  {
    connection,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, name: job.name }, 'notification_job_completed');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, err: error }, 'notification_job_failed_worker_event');
});

process.on('SIGINT', async () => {
  await worker.close();
  await queueEvents.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await queueEvents.close();
  await connection.quit();
  process.exit(0);
});

logger.info('notification_worker_started');
