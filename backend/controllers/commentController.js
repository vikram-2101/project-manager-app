const Comment = require("../models/Comment");
const Task = require("../models/Task"); // Required to check task existence and project membership
const NotificationService = require("../services/notificationService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Helper to check if user is part of the project (re-used from taskController)
const checkProjectMembership = async (projectId, userId) => {
  const Project = require("../models/Project");
  const project = await Project.findById(projectId);
  if (!project) return false;
  return (
    project.projectManager.toString() === userId.toString() ||
    project.teamMembers.some(
      (member) => member.toString() === userId.toString()
    )
  );
};

exports.createComment = catchAsync(async (req, res, next) => {
  const { content, task: taskId, parentComment } = req.body;
  const authorId = req.user._id;

  // Populate task and its projectManager for better notification logic
  const task = await Task.findById(taskId)
    .populate({
      path: "project",
      select: "name projectManager",
    })
    .populate("assignee");

  if (!task) {
    return next(new AppError("Task not found.", 404));
  }
  // Ensure user is a member of the project this task belongs to
  if (!(await checkProjectMembership(task.project, authorId))) {
    return next(
      new AppError(
        "You are not authorized to comment on tasks in this project.",
        403
      )
    );
  }

  const newComment = await Comment.create({
    content,
    task: taskId,
    author: authorId,
    parentComment,
  });

  // Populate newComment with author for the message
  await newComment.populate("author");

  // --- NEW: Notify relevant parties about the new comment ---

  // 1. Notify task assignee if different from comment author
  if (task.assignee && task.assignee._id.toString() !== authorId.toString()) {
    await NotificationService.createNotification(
      {
        userId: task.assignee._id,
        message: `"${newComment.author.name}" commented on your task: "${task.title}" in project "${task.project.name}".`,
        type: "comment",
        link: `/projects/${task.project._id}/tasks/${taskId}`,
      },
      req.io
    ); // Pass req.io
  }

  // 2. Notify project manager if different from comment author AND assignee
  if (
    task.project.projectManager.toString() !== authorId.toString() &&
    (!task.assignee ||
      task.project.projectManager.toString() !== task.assignee._id.toString())
  ) {
    await NotificationService.createNotification(
      {
        userId: task.project.projectManager,
        message: `"${newComment.author.name}" commented on task "${task.title}" in project "${task.project.name}".`,
        type: "comment",
        link: `/projects/${task.project._id}/tasks/${taskId}`,
      },
      req.io
    ); // Pass req.io
  }

  // 3. Notify participants in a parent comment if this is a reply (more advanced, consider later)
  // if (parentComment) { ... }

  res.status(201).json({
    status: "success",
    data: {
      comment: newComment,
    },
  });
});

exports.getCommentsForTask = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId; // Assuming route is /tasks/:taskId/comments

  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError("Task not found.", 404));
  }

  // Ensure user is a member of the project this task belongs to
  if (!(await checkProjectMembership(task.project, req.user._id))) {
    return next(
      new AppError(
        "You are not authorized to view comments for this task.",
        403
      )
    );
  }

  const comments = await Comment.find({ task: taskId }).sort("createdAt");

  res.status(200).json({
    status: "success",
    results: comments.length,
    data: {
      comments,
    },
  });
});

// Additional: update and delete comments (with author/admin checks)
exports.updateComment = catchAsync(async (req, res, next) => {
  const commentId = req.params.id;
  const { content } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("No comment found with that ID", 404));
  }

  // Only the author or an admin can update a comment
  if (
    comment.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("You are not authorized to update this comment.", 403)
    );
  }

  // Ensure user is still part of the project (if that was a requirement for editing)
  const task = await Task.findById(comment.task);
  if (!task || !(await checkProjectMembership(task.project, req.user._id))) {
    return next(
      new AppError(
        "You cannot update comments in a project you are not part of.",
        403
      )
    );
  }

  comment.content = content;
  await comment.save({ new: true, runValidators: true });

  res.status(200).json({
    status: "success",
    data: {
      comment,
    },
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const commentId = req.params.id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return next(new AppError("No comment found with that ID", 404));
  }

  // Only the author, project manager or an admin can delete a comment
  const task = await Task.findById(comment.task);
  const Project = require("../models/Project");
  const project = await Project.findById(task.project);

  const isProjectManager =
    project && project.projectManager.toString() === req.user._id.toString();

  if (
    comment.author.toString() !== req.user._id.toString() &&
    !isProjectManager &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("You are not authorized to delete this comment.", 403)
    );
  }

  await Comment.findByIdAndDelete(commentId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
