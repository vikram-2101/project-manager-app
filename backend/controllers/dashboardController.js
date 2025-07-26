const Task = require("../models/Task");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // 1. Tasks Due Today for the current user
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

  const tasksDueToday = await Task.countDocuments({
    assignee: userId,
    dueDate: {
      $gte: today,
      $lt: tomorrow,
    },
    status: { $ne: "Done" }, // Not already completed
  });

  // 2. Tasks Completed by the current user (e.g., last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const tasksCompleted = await Task.countDocuments({
    assignee: userId,
    status: "Done",
    completedAt: { $gte: thirtyDaysAgo }, // Assuming you update 'completedAt' field on task completion
  });

  // 3. Active Projects (projects the user is a member of, and not 'Completed' or 'Cancelled')
  const activeProjects = await Project.countDocuments({
    $or: [{ projectManager: userId }, { teamMembers: userId }],
    status: { $nin: ["Completed", "Cancelled"] },
  });

  // 4. Unread Notifications for the current user
  const unreadNotifications = await Notification.countDocuments({
    userId: userId,
    isRead: false,
  });

  // 5. Recent Activity (e.g., last 10 tasks/comments/project updates related to user's projects/tasks)
  // This is more complex and might involve aggregating from multiple collections
  // For simplicity, let's just get recent tasks or notifications for now.
  const recentTasks = await Task.find({
    $or: [
      { assignee: userId },
      {
        project: {
          $in: await Project.find({
            $or: [{ projectManager: userId }, { teamMembers: userId }],
          }).select("_id"),
        },
      },
    ],
  })
    .sort("-createdAt")
    .limit(10); // Limit to 10 recent items

  const recentNotifications = await Notification.find({ userId: userId })
    .sort("-createdAt")
    .limit(10);

  res.status(200).json({
    status: "success",
    data: {
      tasksDueToday,
      tasksCompleted,
      activeProjects,
      unreadNotifications,
      recentActivity: {
        tasks: recentTasks,
        notifications: recentNotifications,
        // You could also add recent comments on user's tasks/projects
      },
    },
  });
});
