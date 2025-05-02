const { io } = require("../config/socket.js");
const Chatroom = require("../model/chat-room.js");
const Project = require("../model/project.js");

const getMessagesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const messages = await Chatroom.find({ projectId })
            .sort({ createdAt: 1 })
            .populate("senderId", "full_name")
            .populate("receiverId", "full_name");

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const sendMessageToRoom = async (req, res) => {
    try {
        const senderId = req.user?._id || req.body.senderId; // fallback to body input for testing
        const { projectId } = req.params;
        const { receiverId, text, attachments } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const newMessage = new Chatroom({
            senderId,
            receiverId,
            projectId,
            text,
            attachments,
        });

        await newMessage.save();

        // const populatedMessage = await newMessage
        //     .populate("senderId", "full_name")
        //     .populate("receiverId", "full_name")
        //     .execPopulate();
        const populatedMessage = await Chatroom.findById(newMessage._id)
            .populate("senderId", "full_name")
            .populate("receiverId", "full_name");


        io.to(projectId).emit("receiveMessage", populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getMessagesByProject,
    sendMessageToRoom,
};