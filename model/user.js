const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contact_no: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["client", "designer"],
        required: true,
        default: "client"
    },
    profilepic: {
        type: String,
        required: false
    },
    bio: {
        type: String,
        required: false
    },
    specialization: { // For designers
        type: String,
        required: false
    },
    experience: { // For designers
        type: Number,
        required: false
    },
    saved_projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    last_active: {
        type: Date,
        default: Date.now
    },
    availablity: {
        type: Boolean,
        default: true
    },
})
const User = mongoose.model("User", userSchema);
module.exports = User;