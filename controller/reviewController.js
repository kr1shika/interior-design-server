const Review = require("../model/review.js");
const Project = require("../model/project.js");
const User = require("../model/user.js");
const Notification = require("../model/user-notification.js");

const createReview = async (req, res) => {
    try {
        const { projectId, rating, comment } = req.body;
        const clientId = req.user?.id || req.body.client_id;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (project.status !== "completed") {
            return res.status(400).json({
                message: "Reviews can only be submitted for completed projects."
            });
        }

        if (project.client.toString() !== clientId) {
            return res.status(403).json({
                message: "You can only review your own projects."
            });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            project: projectId,
            client: clientId
        });

        if (existingReview) {
            return res.status(400).json({
                message: "You have already reviewed this project."
            });
        }

        // Create the review
        const newReview = new Review({
            project: projectId,
            client: clientId,
            designer: project.designer,
            rating: parseInt(rating),
            comment: comment.trim()
        });

        await newReview.save();

        // Populate the review with project and client info
        const populatedReview = await Review.findById(newReview._id)
            .populate('project', 'title')
            .populate('client', 'full_name profilepic')
            .populate('designer', 'full_name');

        // 🔔 Create notification for the designer
        const notification = new Notification({
            user: project.designer,
            title: "New Review Received",
            message: `You received a ${rating}-star review from ${populatedReview.client.full_name} for project "${project.title}".`,
            type: "review",
            related_entity: {
                entity_type: "review",
                entity_id: newReview._id
            }
        });

        await notification.save();

        console.log("✅ Review created successfully for project:", project.title);
        console.log("🔔 Designer notification sent for review");

        res.status(201).json({
            message: "Review submitted successfully!",
            review: populatedReview
        });

    } catch (error) {
        console.error("❌ Error creating review:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                message: "You have already reviewed this project."
            });
        }

        res.status(500).json({
            message: "Failed to submit review.",
            error: error.message
        });
    }
};

const getDesignerReviews = async (req, res) => {
    try {
        const { designerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate designer exists
        const designer = await User.findById(designerId);
        if (!designer || designer.role !== 'designer') {
            return res.status(404).json({ message: "Designer not found." });
        }

        const reviews = await Review.find({
            designer: designerId,
            status: 'active'
        })
            .populate('project', 'title room_type')
            .populate('client', 'full_name profilepic')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const totalReviews = await Review.countDocuments({
            designer: designerId,
            status: 'active'
        });

        // Get designer's average ratings
        const averageRatings = await Review.getDesignerAverageRating(designerId);

        res.status(200).json({
            reviews,
            totalReviews,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReviews / limit),
            averageRating: averageRatings.averageRating,
            totalReviewCount: averageRatings.totalReviews
        });

    } catch (error) {
        console.error("❌ Error fetching designer reviews:", error);
        res.status(500).json({
            message: "Failed to fetch reviews.",
            error: error.message
        });
    }
};

// Get review for a specific project
const getProjectReview = async (req, res) => {
    try {
        const { projectId } = req.params;

        const review = await Review.findOne({ project: projectId })
            .populate('project', 'title room_type status')
            .populate('client', 'full_name profilepic')
            .populate('designer', 'full_name profilepic');

        if (!review) {
            return res.status(404).json({ message: "No review found for this project." });
        }

        res.status(200).json({ review });

    } catch (error) {
        console.error("❌ Error fetching project review:", error);
        res.status(500).json({
            message: "Failed to fetch review.",
            error: error.message
        });
    }
};


module.exports = {
    createReview,
    getDesignerReviews,
    getProjectReview
};