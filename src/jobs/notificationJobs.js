const { getNotificationQueue } = require('../config/queue');

async function enqueueTaskAssignedNotification(payload) {
  const queue = getNotificationQueue();
  await queue.add('task.assigned', payload);
}

module.exports = {
  enqueueTaskAssignedNotification,
};
