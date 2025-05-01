const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["project_update", "message", "payment", "system", "review"],
        required: true
    },
    related_entity: {
        entity_type: String,
        entity_id: mongoose.Schema.Types.ObjectId
    },
    is_read: {
        type: Boolean,
        default: false
    },
    read_at: Date
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;