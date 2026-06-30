const taskService = require('../services/taskService');

async function createTask(req, res) {
  const task = await taskService.createTask({
    actorId: req.user.id,
    teamId: req.team.id,
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
}

async function listTasks(req, res) {
  const result = await taskService.listTasks({
    actorId: req.user.id,
    teamId: req.team.id,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function updateTask(req, res) {
  const task = await taskService.updateTask({
    actorId: req.user.id,
    teamId: req.team.id,
    taskId: Number(req.params.taskId),
    payload: req.body,
  });

  res.status(200).json({
    success: true,
    data: task,
  });
}

async function deleteTask(req, res) {
  await taskService.deleteTask({
    actorId: req.user.id,
    teamId: req.team.id,
    taskId: Number(req.params.taskId),
  });

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
  });
}

module.exports = {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
};
