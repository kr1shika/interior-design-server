// controller/chatController.js
const Chatroom = require("../model/chat-room");
const Project  = require("../model/project");

exports.getMessagesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const messages = await Chatroom.find({ projectId })
      .sort({ createdAt: 1 })
      .populate("senderId",   "full_name")
      .populate("receiverId", "full_name");
    return res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.sendMessageToRoom = async (req, res, io) => {
  try {
    const senderId = req.user?._id || req.body.senderId;
    const { projectId } = req.params;
    const { receiverId, text, attachments } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const newMessage = new Chatroom({ senderId, receiverId, projectId, text, attachments });
    await newMessage.save();

    const populatedMessage = await Chatroom.findById(newMessage._id)
      .populate("senderId",   "full_name")
      .populate("receiverId", "full_name");

    // 1) Respond to HTTP client
    res.status(201).json(populatedMessage);

    // 2) Then emit to everyone in the room
    io.to(projectId).emit("receiveMessage", populatedMessage);

  } catch (err) {
    console.error("Error sending message:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
