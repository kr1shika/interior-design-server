const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
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
    // Overall rating (1-5)
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Review comment
    comment: {
        type: String,
        required: true,
        maxlength: 500
    },
    // Status
    status: {
        type: String,
        enum: ["active", "hidden"],
        default: "active"
    }
}, {
    timestamps: true
});

// Ensure one review per project per client
reviewSchema.index({ project: 1, client: 1 }, { unique: true });

// Static method to calculate designer's average rating
reviewSchema.statics.getDesignerAverageRating = async function (designerId) {
    const result = await this.aggregate([
        {
            $match: {
                designer: new mongoose.Types.ObjectId(designerId),
                status: "active"
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    return result.length > 0 ? {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews
    } : {
        averageRating: 0,
        totalReviews: 0
    };
};

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;