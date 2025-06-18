const express = require("express");
const router = express.Router();
const { getUserNotifications } = require("../controller/notificationController");

// GET notifications for a specific user
router.get("/:userId", getUserNotifications);

module.exports = router;
