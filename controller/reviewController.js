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

// Get detailed rating analytics for a designer
const getDesignerRatingAnalytics = async (req, res) => {
    try {
        const { designerId } = req.params;

        // Validate designer exists
        const designer = await User.findById(designerId);
        if (!designer || designer.role !== 'designer') {
            return res.status(404).json({ message: "Designer not found." });
        }

        // Get all active reviews for this designer
        const reviews = await Review.find({
            designer: designerId,
            status: 'active'
        }).populate('project', 'title room_type createdAt');

        if (reviews.length === 0) {
            return res.status(200).json({
                message: "No reviews found for this designer.",
                analytics: {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    monthlyRatings: [],
                    roomTypeRatings: {},
                    recentTrend: "stable"
                }
            });
        }

        // Calculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

        // Rating distribution
        const ratingDistribution = {
            1: reviews.filter(r => r.rating === 1).length,
            2: reviews.filter(r => r.rating === 2).length,
            3: reviews.filter(r => r.rating === 3).length,
            4: reviews.filter(r => r.rating === 4).length,
            5: reviews.filter(r => r.rating === 5).length
        };

        // Monthly ratings for the last 12 months
        const monthlyRatings = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.getMonth();
            const year = date.getFullYear();

            const monthlyReviews = reviews.filter(r => {
                const reviewDate = new Date(r.createdAt);
                return reviewDate.getMonth() === month &&
                    reviewDate.getFullYear() === year;
            });

            const monthlyAverage = monthlyReviews.length > 0
                ? Math.round((monthlyReviews.reduce((sum, r) => sum + r.rating, 0) / monthlyReviews.length) * 10) / 10
                : 0;

            monthlyRatings.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                averageRating: monthlyAverage,
                reviewCount: monthlyReviews.length
            });
        }

        // Ratings by room type
        const roomTypeRatings = {};
        reviews.forEach(review => {
            const roomType = review.project?.room_type || 'other';
            if (!roomTypeRatings[roomType]) {
                roomTypeRatings[roomType] = {
                    totalRating: 0,
                    count: 0,
                    average: 0
                };
            }
            roomTypeRatings[roomType].totalRating += review.rating;
            roomTypeRatings[roomType].count += 1;
        });

        // Calculate averages for room types
        Object.keys(roomTypeRatings).forEach(roomType => {
            const data = roomTypeRatings[roomType];
            data.average = Math.round((data.totalRating / data.count) * 10) / 10;
        });

        // Recent trend (last 3 months vs previous 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const recentReviews = reviews.filter(r => new Date(r.createdAt) >= threeMonthsAgo);
        const previousReviews = reviews.filter(r => {
            const date = new Date(r.createdAt);
            return date >= sixMonthsAgo && date < threeMonthsAgo;
        });

        let recentTrend = "stable";
        if (recentReviews.length > 0 && previousReviews.length > 0) {
            const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
            const previousAvg = previousReviews.reduce((sum, r) => sum + r.rating, 0) / previousReviews.length;

            if (recentAvg > previousAvg + 0.2) recentTrend = "improving";
            else if (recentAvg < previousAvg - 0.2) recentTrend = "declining";
        }

        const analytics = {
            averageRating,
            totalReviews: reviews.length,
            ratingDistribution,
            monthlyRatings,
            roomTypeRatings,
            recentTrend,
            highestRatedProject: reviews.reduce((highest, current) =>
                current.rating > highest.rating ? current : highest
            ),
            mostRecentReview: reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        };

        res.status(200).json({
            message: "Rating analytics retrieved successfully.",
            analytics
        });

    } catch (error) {
        console.error("❌ Error fetching rating analytics:", error);
        res.status(500).json({
            message: "Failed to fetch rating analytics.",
            error: error.message
        });
    }
};

// Get reviews that can be left (completed projects without reviews)
const getReviewableProjects = async (req, res) => {
    try {
        const { clientId } = req.params;

        // Get all completed projects for this client
        const completedProjects = await Project.find({
            client: clientId,
            status: 'completed'
        }).populate('designer', 'full_name profilepic specialization');

        // Get all reviews this client has already made
        const existingReviews = await Review.find({
            client: clientId
        }).select('project');

        const reviewedProjectIds = existingReviews.map(review => review.project.toString());

        // Filter out projects that already have reviews
        const reviewableProjects = completedProjects.filter(project =>
            !reviewedProjectIds.includes(project._id.toString())
        );

        res.status(200).json({
            message: "Reviewable projects retrieved successfully.",
            projects: reviewableProjects,
            totalReviewable: reviewableProjects.length,
            totalCompleted: completedProjects.length,
            alreadyReviewed: reviewedProjectIds.length
        });

    } catch (error) {
        console.error("❌ Error fetching reviewable projects:", error);
        res.status(500).json({
            message: "Failed to fetch reviewable projects.",
            error: error.message
        });
    }
};

// Update review (for editing existing reviews)
const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const clientId = req.user?.id || req.body.client_id;

        // Find the review and verify ownership
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        if (review.client.toString() !== clientId) {
            return res.status(403).json({
                message: "You can only edit your own reviews."
            });
        }

        // Check if review is recent enough to edit (within 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (new Date(review.createdAt) < thirtyDaysAgo) {
            return res.status(400).json({
                message: "Reviews can only be edited within 30 days of creation."
            });
        }

        // Update the review
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            {
                rating: parseInt(rating),
                comment: comment.trim(),
                updatedAt: new Date()
            },
            { new: true }
        ).populate('project', 'title')
            .populate('client', 'full_name profilepic')
            .populate('designer', 'full_name');

        // Create notification for the designer about the updated review
        const notification = new Notification({
            user: review.designer,
            title: "Review Updated",
            message: `${updatedReview.client.full_name} updated their review for project "${updatedReview.project.title}".`,
            type: "review",
            related_entity: {
                entity_type: "review",
                entity_id: reviewId
            }
        });

        await notification.save();

        console.log("✅ Review updated successfully:", reviewId);

        res.status(200).json({
            message: "Review updated successfully!",
            review: updatedReview
        });

    } catch (error) {
        console.error("❌ Error updating review:", error);
        res.status(500).json({
            message: "Failed to update review.",
            error: error.message
        });
    }
};

// Delete/Hide review
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const clientId = req.user?.id || req.body.client_id;

        // Find the review and verify ownership
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        if (review.client.toString() !== clientId) {
            return res.status(403).json({
                message: "You can only delete your own reviews."
            });
        }

        // Instead of deleting, set status to hidden
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            { status: 'hidden' },
            { new: true }
        );

        // Create notification for the designer
        const project = await Project.findById(review.project);
        const client = await User.findById(clientId);

        const notification = new Notification({
            user: review.designer,
            title: "Review Removed",
            message: `${client.full_name} removed their review for project "${project.title}".`,
            type: "review",
            related_entity: {
                entity_type: "review",
                entity_id: reviewId
            }
        });

        await notification.save();

        console.log("✅ Review hidden successfully:", reviewId);

        res.status(200).json({
            message: "Review removed successfully!",
            review: updatedReview
        });

    } catch (error) {
        console.error("❌ Error deleting review:", error);
        res.status(500).json({
            message: "Failed to remove review.",
            error: error.message
        });
    }
};

// Get client's review history
const getClientReviews = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({
            client: clientId,
            status: 'active'
        })
            .populate('project', 'title room_type')
            .populate('designer', 'full_name profilepic specialization')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const totalReviews = await Review.countDocuments({
            client: clientId,
            status: 'active'
        });

        res.status(200).json({
            reviews,
            totalReviews,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReviews / limit)
        });

    } catch (error) {
        console.error("❌ Error fetching client reviews:", error);
        res.status(500).json({
            message: "Failed to fetch client reviews.",
            error: error.message
        });
    }
};

module.exports = {
    createReview,
    getDesignerReviews,
    getProjectReview,
    getDesignerRatingAnalytics,
    getReviewableProjects,
    updateReview,
    deleteReview,
    getClientReviews
};