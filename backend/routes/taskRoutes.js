const express = require("express");
const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All task routes require authentication
router.use(authMiddleware.protect);

router
  .route("/")
  .post(taskController.createTask)
  .get(taskController.getAllTasks); // Could be filtered by project or assignee

router
  .route("/:id")
  .get(taskController.getTask)
  .patch(taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;
