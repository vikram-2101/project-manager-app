const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort(
    "-createdAt"
  );

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: {
      notifications,
    },
  });
});

exports.markNotificationAsRead = catchAsync(async (req, res, next) => {
  const notificationId = req.params.id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id }, // Ensure user owns the notification
    { isRead: true },
    { new: true, runValidators: true }
  );

  if (!notification) {
    return next(
      new AppError(
        "No notification found with that ID for the current user.",
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      notification,
    },
  });
});

// Optional: mark all notifications as read
exports.markAllNotificationsAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read.",
  });
});
