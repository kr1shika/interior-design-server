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
        required: false
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["client", "designer"],
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
    specialization: {
        type: String,
        required: false
    },
    experience: {
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
        default: false
    },
    style_quiz: {
        type: Map,
        of: String,
        default: {}
    },
    preferredTones: {
        type: [String],
        default: []
    },
    approach: {
        type: String,
        default: "Balanced"
    },
    otp: {
        type: String, // Store hashed OTP
        required: false
    },
    otpExpiry: {
        type: Date,
        required: false
    },
    otpAttempts: {
        type: Number,
        default: 0
    },
    otpVerified: { // NEW: Track if OTP has been verified
        type: Boolean,
        default: false
    },
    lastPasswordChange: {
        type: Date,
        required: false
    }
});

const User = mongoose.model("User", userSchema);
module.exports = User;