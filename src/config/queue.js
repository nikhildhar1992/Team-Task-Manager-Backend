const { Queue } = require('bullmq');
const { createBullConnection } = require('./redis');

let notificationQueue;

function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = new Queue('notifications', {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }

  return notificationQueue;
}

module.exports = {
  getNotificationQueue,
};
