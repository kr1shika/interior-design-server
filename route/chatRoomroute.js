const express = require("express");
const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController");
const router = express.Router();

router.get("/:projectId", getMessagesByProject);

router.post("/:projectId", sendMessageToRoom);

module.exports = router;
