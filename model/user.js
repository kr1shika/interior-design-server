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
        default: "role"
    },
    profilepic: {
        type: String,
        required: false
    },


})
const User = mongoose.model("User", userSchema);
module.exports = User;