const Notification = require("../model/user-notification.js");

const getUserNotifications = async (req, res) => {
    const userId = req.params.userId;

    try {
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { getUserNotifications };
