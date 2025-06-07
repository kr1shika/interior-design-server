const User = require("../model/user");

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

// Update a user's profile
const updateUserProfile = async (req, res) => {
    try {
        const updatedData = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updatedData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

module.exports = {
    getAllDesigners,
    getUserById,
    updateUserProfile,
};
