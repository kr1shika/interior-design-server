const express = require("express");
const router = express.Router();
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require("../controller/notificationController");

// GET notifications for a specific user
router.get("/:userId", getUserNotifications);

// PATCH mark a specific notification as read
router.patch("/:notificationId/read", markNotificationAsRead);

// PATCH mark all notifications as read for a user
router.patch("/user/:userId/read-all", markAllNotificationsAsRead);

module.exports = router;