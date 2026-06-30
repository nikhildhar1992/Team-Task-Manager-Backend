const ApiError = require('../utils/apiError');
const { decodeCursor, encodeCursor } = require('../utils/pagination');
const { getCache, setCache, deleteByPrefix } = require('../utils/cache');
const taskRepository = require('../repositories/taskRepository');
const teamRepository = require('../repositories/teamRepository');
const { getNotificationQueue } = require('../config/queue');

function tasksCacheKey(teamId, query) {
  return `tasks:team:${teamId}:${JSON.stringify(query)}`;
}

async function assertMembership({ teamId, userId }) {
  const membership = await teamRepository.getMembership({ teamId, userId });
  if (!membership) {
    throw new ApiError(403, 'User is not a member of this team');
  }
  return membership;
}

async function createTask({ actorId, teamId, payload }) {
  await assertMembership({ teamId, userId: actorId });

  if (payload.assignedTo) {
    await assertMembership({ teamId, userId: payload.assignedTo });
  }

  const task = await taskRepository.createTask({
    teamId,
    title: payload.title,
    description: payload.description || null,
    priority: payload.priority || 'medium',
    status: payload.status || 'todo',
    assignedTo: payload.assignedTo || null,
    deadline: payload.deadline || null,
    createdBy: actorId,
  });

  await deleteByPrefix(`tasks:team:${teamId}:`);

  if (task.assignedTo) {
    const notificationQueue = getNotificationQueue();
    await notificationQueue.add('task.assigned', {
      taskId: task.id,
      teamId,
      assignedTo: task.assignedTo,
    });
  }

  return task;
}

async function listTasks({ actorId, teamId, query }) {
  await assertMembership({ teamId, userId: actorId });

  const parsedCursor = decodeCursor(query.cursor);
  const hasValidCursor =
    parsedCursor &&
    typeof parsedCursor === 'object' &&
    parsedCursor.createdAt &&
    Number.isFinite(Number(parsedCursor.id));

  if (query.cursor && !hasValidCursor) {
    throw new ApiError(400, 'Invalid cursor format');
  }

  const normalizedQuery = {
    limit: Number(query.limit || 20),
    status: query.status || null,
    assignedTo: query.assignedTo ? Number(query.assignedTo) : null,
    search: query.search || null,
    sortBy: query.sortBy || 'created_at',
    sortOrder: query.sortOrder || 'desc',
    cursor: query.cursor || null,
  };

  const key = tasksCacheKey(teamId, normalizedQuery);
  const cached = await getCache(key);
  if (cached) {
    return cached;
  }

  const rows = await taskRepository.listTasks({
    teamId,
    filters: {
      status: normalizedQuery.status,
      assignedTo: normalizedQuery.assignedTo,
      search: normalizedQuery.search,
    },
    sortBy: normalizedQuery.sortBy,
    sortOrder: normalizedQuery.sortOrder,
    limit: normalizedQuery.limit,
    cursor: hasValidCursor
      ? {
          createdAt: parsedCursor.createdAt,
          id: Number(parsedCursor.id),
        }
      : null,
  });

  const hasNextPage = rows.length > normalizedQuery.limit;
  const items = hasNextPage ? rows.slice(0, normalizedQuery.limit) : rows;
  const nextCursor = hasNextPage
    ? encodeCursor({
        createdAt: items[items.length - 1].createdAt,
        id: items[items.length - 1].id,
      })
    : null;

  const result = {
    items,
    pageInfo: {
      nextCursor,
      hasNextPage,
    },
  };

  await setCache(key, result);
  return result;
}

async function updateTask({ actorId, teamId, taskId, payload }) {
  await assertMembership({ teamId, userId: actorId });

  const existing = await taskRepository.findById({ teamId, taskId });
  if (!existing) {
    throw new ApiError(404, 'Task not found');
  }

  const dbPayload = {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.priority !== undefined && { priority: payload.priority }),
    ...(payload.status !== undefined && { status: payload.status }),
    ...(payload.assignedTo !== undefined && { assigned_to: payload.assignedTo }),
    ...(payload.deadline !== undefined && { deadline: payload.deadline }),
  };

  if (payload.assignedTo !== undefined && payload.assignedTo !== null) {
    await assertMembership({ teamId, userId: payload.assignedTo });
  }

  const updated = await taskRepository.updateTask({
    teamId,
    taskId,
    payload: dbPayload,
  });

  await deleteByPrefix(`tasks:team:${teamId}:`);

  if (payload.assignedTo) {
    const notificationQueue = getNotificationQueue();
    await notificationQueue.add('task.assigned', {
      taskId,
      teamId,
      assignedTo: payload.assignedTo,
    });
  }

  return updated;
}

async function deleteTask({ actorId, teamId, taskId }) {
  await assertMembership({ teamId, userId: actorId });

  const existing = await taskRepository.findById({ teamId, taskId });
  if (!existing) {
    throw new ApiError(404, 'Task not found');
  }

  await taskRepository.deleteTask({ teamId, taskId });
  await deleteByPrefix(`tasks:team:${teamId}:`);
}

module.exports = {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
};
