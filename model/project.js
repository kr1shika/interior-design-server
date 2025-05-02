const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    designer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "cancelled"],
        default: "pending"
    },
    room_dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    room_type: {
        type: String,
        enum: ["living_room", "bedroom", "kitchen", "bathroom", "office", "dining_room", "other"]
    },
    style_preferences: [String],
    color_palette: [String],
    payment: {
        type: String,
        enum: ["pending", "half-installment", "completed"],
        default: "pending", required: true
    },
    reference_images: [String],
    design_files: [{
        url: String,
        file_type: String,
        version: Number,
        uploaded_at: Date
    }],
    start_date: Date,
    end_date: Date,
    is_public: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;