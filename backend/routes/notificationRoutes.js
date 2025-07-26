const express = require("express");
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware.protect);

router.route("/").get(notificationController.getMyNotifications);

router.route("/:id/read").patch(notificationController.markNotificationAsRead);

router
  .route("/mark-all-read")
  .patch(notificationController.markAllNotificationsAsRead);

module.exports = router;
