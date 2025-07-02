const express = require("express");
const router = express.Router();
const {
    createReview,
    getDesignerReviews,
    getProjectReview,
} = require("../controller/reviewController.js");

// POST /api/review - Create a new review
router.post("/", createReview);

// GET /api/review/designer/:designerId - Get all reviews for a designer
router.get("/designer/:designerId", getDesignerReviews);

// GET /api/review/project/:projectId - Get review for a specific project
router.get("/project/:projectId", getProjectReview);

module.exports = router;