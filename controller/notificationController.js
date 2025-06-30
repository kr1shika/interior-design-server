const Notification = require("../model/user-notification.js");
const mongoose = require("mongoose");

const getUserNotifications = async (req, res) => {
    const userId = req.params.userId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            message: "Invalid user ID format",
            error: "User ID must be a valid MongoDB ObjectId"
        });
    }

    try {
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.body.userId; // Assuming user ID comes from auth middleware or request body

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
            message: "Invalid notification ID format",
            error: "Notification ID must be a valid MongoDB ObjectId"
        });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            message: "Invalid user ID format",
            error: "User ID must be a valid MongoDB ObjectId"
        });
    }

    try {
        const notification = await Notification.findOneAndUpdate(
            {
                _id: notificationId,
                user: userId // Ensure user can only update their own notifications
            },
            {
                is_read: true,
                read_at: new Date()
            },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found or unauthorized" });
        }

        res.status(200).json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    const userId = req.params.userId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            message: "Invalid user ID format",
            error: "User ID must be a valid MongoDB ObjectId"
        });
    }

    try {
        const result = await Notification.updateMany(
            {
                user: userId,
                is_read: false
            },
            {
                is_read: true,
                read_at: new Date()
            }
        );

        res.status(200).json({
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



module.exports = {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
};