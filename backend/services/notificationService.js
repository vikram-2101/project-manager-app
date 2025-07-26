const Notification = require("../models/Notification");
// const io = require('../server'); // We'll pass io directly, not import globally to avoid circular deps

class NotificationService {
  static async createNotification({ userId, message, type, link }, io) {
    // <-- Added io parameter
    try {
      const notification = await Notification.create({
        userId,
        message,
        type,
        link,
      });

      // Emit real-time notification to the specific user's room
      if (io) {
        console.log(`Emitting notification to user room: ${userId}`);
        io.to(userId.toString()).emit("newNotification", notification);

        // Also emit an update for the unread count
        const unreadCount = await Notification.countDocuments({
          userId: userId,
          isRead: false,
        });
        io.to(userId.toString()).emit("unreadNotificationCount", unreadCount);
      }

      return notification;
    } catch (error) {
      console.error("Error creating or emitting notification:", error);
    }
  }

  // You can add more service methods here, e.g., for sending email notifications etc.
}

module.exports = NotificationService;
