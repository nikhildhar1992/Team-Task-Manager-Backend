const express = require('express');
const taskController = require('../controllers/taskController');
const asyncHandler = require('../middlewares/asyncHandler');
const authenticate = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { attachTeamMembership } = require('../middlewares/teamAccessMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const {
  teamIdParamSchema,
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  listTaskQuerySchema,
} = require('../validators/taskValidators');

const router = express.Router();

router.use(authenticate);

router.get(
  '/:teamId/tasks',
  validate({ params: teamIdParamSchema, query: listTaskQuerySchema }),
  asyncHandler(attachTeamMembership),
  authorize('tasks:manage'),
  asyncHandler(taskController.listTasks),
);

router.post(
  '/:teamId/tasks',
  validate({ params: teamIdParamSchema, body: createTaskSchema }),
  asyncHandler(attachTeamMembership),
  authorize('tasks:manage'),
  asyncHandler(taskController.createTask),
);

router.patch(
  '/:teamId/tasks/:taskId',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  asyncHandler(attachTeamMembership),
  authorize('tasks:manage'),
  asyncHandler(taskController.updateTask),
);

router.delete(
  '/:teamId/tasks/:taskId',
  validate({ params: taskIdParamSchema }),
  asyncHandler(attachTeamMembership),
  authorize('tasks:manage'),
  asyncHandler(taskController.deleteTask),
);

module.exports = router;
