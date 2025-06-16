// const express = require("express");
// const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController");
// const router = express.Router();

// router.get("/:projectId", getMessagesByProject);

// router.post("/:projectId", sendMessageToRoom);

// module.exports = router;

// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { getMessagesByProject, sendMessageToRoom } = require("../controller/chatController");
const upload = require("../config/uploads");

router.get("/:projectId", getMessagesByProject);

// This route accepts images in field `attachments`
router.post("/:projectId", upload.array("attachments", 5), sendMessageToRoom); // limit to 5 files

module.exports = router;
