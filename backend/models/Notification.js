const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Notification must be for a user"],
  },
  message: {
    type: String,
    required: [true, "Notification must have a message"],
  },
  type: {
    type: String,
    enum: ["task", "comment", "project", "system"], // Different types of notifications
    required: true,
  },
  link: String, // URL to navigate to when clicked, e.g., /projects/xyz/task/123
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ userId: 1, createdAt: -1 }); // Index for faster retrieval by user and sorting

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
