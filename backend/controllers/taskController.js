const Task = require("../models/Task");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const NotificationService = require("../services/notificationService"); // We'll create this service

// Helper to check if user is part of the project (required for all task operations)
const checkProjectMembership = async (projectId, userId) => {
  // This requires the Project model to have a 'members' or 'teamMembers' array
  const Project = require("../models/Project"); // Import locally to avoid circular dependency
  const project = await Project.findById(projectId);
  if (!project) return false;

  // Check if userId is projectManager OR in teamMembers
  return (
    project.projectManager.toString() === userId.toString() ||
    project.teamMembers.some(
      (member) => member.toString() === userId.toString()
    )
  );
};

exports.createTask = catchAsync(async (req, res, next) => {
  const { title, description, project, assignee, dueDate, status, priority } =
    req.body;
  const userId = req.user._id;

  // Ensure the user creating the task is a member of the project
  if (!(await checkProjectMembership(project, userId))) {
    return next(
      new AppError(
        "You are not authorized to create tasks in this project.",
        403
      )
    );
  }

  const newTask = await Task.create({
    title,
    description,
    project,
    assignee, // Assignee must be a user ID
    dueDate,
    status,
    priority,
  });
  // Ensure project is populated for notification message
  const populatedNewTask = await newTask.populate("project");
  // If assignee is different from creator, send notification
  if (assignee && assignee.toString() !== userId.toString()) {
    await NotificationService.createNotification({
      userId: assignee,
      message: `You have been assigned to a new task: "${
        newTask.title
      }" in project "${(await newTask.populate("project")).project.name}".`,
      type: "task",
      link: `/projects/${project}/tasks/${newTask._id}`,
    });
  }

  res.status(201).json({
    status: "success",
    data: {
      task: newTask,
    },
  });
});

exports.getAllTasks = catchAsync(async (req, res, next) => {
  // Filter by project if project ID is provided in query
  const filter = {};
  if (req.query.project) {
    // Ensure user is member of this project if filtering by it
    if (!(await checkProjectMembership(req.query.project, req.user._id))) {
      return next(
        new AppError(
          "You are not authorized to view tasks in this project.",
          403
        )
      );
    }
    filter.project = req.query.project;
  }

  // Allow filtering by assignee (e.g., /api/v1/tasks?assignee=userId)
  if (req.query.assignee) {
    filter.assignee = req.query.assignee;
  }

  // For 'My Tasks' page, a user might request tasks assigned to them
  if (req.query.myTasks === "true") {
    filter.assignee = req.user._id;
  }

  const tasks = await Task.find(filter).sort("-createdAt"); // Sort by creation date descending

  res.status(200).json({
    status: "success",
    results: tasks.length,
    data: {
      tasks,
    },
  });
});

exports.getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Ensure user is member of the project the task belongs to
  if (!(await checkProjectMembership(task.project, req.user._id))) {
    return next(new AppError("You are not authorized to view this task.", 403));
  }

  res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

exports.updateTask = catchAsync(async (req, res, next) => {
  const { status, assignee, dueDate, title, description, priority } = req.body;
  const taskId = req.params.id;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Ensure user is member of the project the task belongs to
  if (!(await checkProjectMembership(task.project, userId))) {
    return next(
      new AppError("You are not authorized to update this task.", 403)
    );
  }

  const oldStatus = task.status;
  const oldAssignee = task.assignee ? task.assignee.toString() : null;

  const updatedTask = await Task.findByIdAndUpdate(taskId, req.body, {
    new: true,
    runValidators: true,
  });
  // Populate updatedTask with project and assignee for notification messages
  await updatedTask.populate("project").populate("assignee");

  // Notifications for status change (especially 'Done')
  if (status && status !== oldStatus) {
    let notificationMessage = `Task "${updatedTask.title}" status changed from "${oldStatus}" to "${status}" in project "${updatedTask.project.name}".`;
    if (status === "Done") {
      notificationMessage = `Task "${updatedTask.title}" in project "${updatedTask.project.name}" has been completed!`;
    }

    // Notify assignee
    if (
      updatedTask.assignee &&
      updatedTask.assignee._id.toString() !== userId.toString()
    ) {
      await NotificationService.createNotification(
        {
          userId: updatedTask.assignee._id,
          message: notificationMessage,
          type: "task",
          link: `/projects/${updatedTask.project._id}/tasks/${updatedTask._id}`,
        },
        req.io
      ); // Pass req.io
    }

    // Notify project manager if different from assignee/updater
    if (
      updatedTask.project.projectManager.toString() !== userId.toString() &&
      (!updatedTask.assignee ||
        updatedTask.project.projectManager.toString() !==
          updatedTask.assignee._id.toString())
    ) {
      await NotificationService.createNotification(
        {
          userId: updatedTask.project.projectManager,
          message: notificationMessage,
          type: "task",
          link: `/projects/${updatedTask.project._id}/tasks/${updatedTask._id}`,
        },
        req.io
      );
    }
  }
  // Notifications for assignee change
  if (assignee && assignee.toString() !== oldAssignee) {
    // Notify old assignee if different and exists
    if (oldAssignee) {
      await NotificationService.createNotification(
        {
          userId: oldAssignee,
          message: `You are no longer assigned to task "${updatedTask.title}" in project "${updatedTask.project.name}".`,
          type: "task",
          link: `/projects/${updatedTask.project._id}/tasks/${updatedTask._id}`,
        },
        req.io
      ); // Pass req.io
    }
    // Notify new assignee
    if (assignee.toString() !== userId.toString()) {
      // Don't notify self if you are the one assigning
      await NotificationService.createNotification(
        {
          userId: assignee,
          message: `You have been assigned to task "${updatedTask.title}" in project "${updatedTask.project.name}".`,
          type: "task",
          link: `/projects/${updatedTask.project._id}/tasks/${updatedTask._id}`,
        },
        req.io
      ); // Pass req.io
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      task: updatedTask,
    },
  });
});

exports.deleteTask = catchAsync(async (req, res, next) => {
  const taskId = req.params.id;
  const userId = req.user._id;

  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Only project manager or global admin can delete a task
  const Project = require("../models/Project");
  const project = await Project.findById(task.project);

  if (
    !project ||
    (project.projectManager.toString() !== userId.toString() &&
      req.user.role !== "admin")
  ) {
    return next(
      new AppError(
        "You are not authorized to delete tasks in this project.",
        403
      )
    );
  }

  await Task.findByIdAndDelete(taskId);

  res.status(204).json({
    // 204 No Content for successful deletion
    status: "success",
    data: null,
  });
});
