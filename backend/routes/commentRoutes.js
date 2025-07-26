const express = require("express");
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router({ mergeParams: true }); // mergeParams to get params from parent routes

// All comment routes require authentication
router.use(authMiddleware.protect);

// Nested route example: /api/v1/tasks/:taskId/comments
// Or standalone: /api/v1/comments
router.route("/").post(commentController.createComment);

router
  .route("/:taskId") // Assuming this is to get comments for a specific task
  .get(commentController.getCommentsForTask);

router
  .route("/:id") // For updating/deleting a specific comment by its ID
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

module.exports = router;
