const User = require("../model/user");
const path = require("path");
const fs = require("fs");

// Get all designers
const getAllDesigners = async (req, res) => {
    try {
        const designers = await User.find({ role: "designer" }).select("-password");
        res.status(200).json(designers);
    } catch (error) {
        console.error("Error fetching designers:", error);
        res.status(500).json({ message: "Failed to fetch designers" });
    }
};

// Get a specific user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
    }
};


const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            console.warn("⚠️ User not found:", id);
            return res.status(404).json({ message: "User not found" });
        }

        const { full_name, bio, specialization, experience, preferredTones, approach } = req.body;

        if (full_name) user.full_name = full_name;
        if (bio) user.bio = bio;
        if (specialization) user.specialization = specialization;
        if (experience) {
            const parsedExp = Number(experience);
            if (isNaN(parsedExp)) {
                console.warn("⚠️ Invalid experience:", experience);
                return res.status(400).json({ message: "Experience must be a number" });
            }
            user.experience = parsedExp;
        }

        if (req.body.preferredTones) {
            const tones = Array.isArray(req.body.preferredTones)
                ? req.body.preferredTones
                : [req.body.preferredTones]; // Handle single or multiple values
            user.preferredTones = tones;
        }

        if (approach) {
            user.approach = approach;
        }

        if (req.file) {
            console.log("✅ File received:", req.file.filename);
            user.profilepic = `/profile_pics/${req.file.filename}`;
        }

        await user.save();

        console.log("✅ User updated:", user._id);
        return res.status(200).json({
            message: "User profile updated successfully.",
            user,
        });

    } catch (error) {
        console.error("🔥 ERROR updating user:");
        console.error("Name:", error.name);
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);

        return res.status(500).json({
            message: "Failed to update ",
            errorType: error.name,
            errorMessage: error.message,
            stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        });
    }
};



module.exports = {
    getAllDesigners,
    getUserById,
    updateUserProfile,
};
