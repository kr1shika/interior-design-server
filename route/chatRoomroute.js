// routes/chat.js
const express = require("express");
const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController.js");
// const { authenticate } =require ("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/:projectId", getMessagesByProject);
router.post("/:projectId", sendMessageToRoom);

module.exports = router;