const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    text: {
        type: String,
        required: false
    },
    attachments: [{
        type: String,
    }],
    read_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
}, {
    timestamp: true
});
const Chatroom = mongoose.model("Chatroom", chatRoomSchema);
module.exports = Chatroom;