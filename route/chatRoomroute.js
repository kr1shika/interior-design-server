// route/chatRoomRoute.js
const express = require("express");
const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController");
const router  = express.Router();

// GET  /api/chat/:projectId   → load history
router.get("/:projectId", getMessagesByProject);

// POST /api/chat/:projectId   → save + emit
router.post("/:projectId", (req, res) => {
  const io = req.app.get("io");               // grab our io instance
  sendMessageToRoom(req, res, io);
});

module.exports = router;
