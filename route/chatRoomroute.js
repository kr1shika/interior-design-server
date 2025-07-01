// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController");
const upload = require("../config/uploads");
const {
    authenticateToken,
    bruteForceProtection,
    logActivity
} = require("../middleware/authMiddleware");

// 🔐 Get chat messages - PROTECTED
router.get("/:projectId",
    authenticateToken,              // Verify JWT token
    logActivity('view_chat'),       // Log chat access
    getMessagesByProject
);

// 🔐 Send message - PROTECTED with rate limiting
router.post("/:projectId",
    authenticateToken,              // Verify JWT token
    bruteForceProtection,           // Prevent message spam
    upload.array("attachments", 5), // limit to 5 files
    logActivity('send_message'),    // Log message sending
    sendMessageToRoom
);

module.exports = router;