// const express = require("express");
// const router = express.Router();
// const {
//     createReview,
//     getDesignerReviews,
//     getProjectReview,
// } = require("../controller/reviewController.js");

// // POST /api/review - Create a new review
// router.post("/", createReview);

// // GET /api/review/designer/:designerId - Get all reviews for a designer
// router.get("/designer/:designerId", getDesignerReviews);

// // GET /api/review/project/:projectId - Get review for a specific project
// router.get("/project/:projectId", getProjectReview);

// module.exports = router;


const express = require("express");
const router = express.Router();
const {
    createReview,
    getDesignerReviews,
    getProjectReview,
    getDesignerRatingAnalytics,
    getReviewableProjects,
    updateReview,
    deleteReview,
    getClientReviews
} = require("../controller/reviewController.js");

// Basic review operations
router.post("/", createReview);                                    // POST /api/review - Create a new review
router.get("/project/:projectId", getProjectReview);               // GET /api/review/project/:projectId - Get review for a specific project
router.put("/:reviewId", updateReview);                           // PUT /api/review/:reviewId - Update an existing review
router.delete("/:reviewId", deleteReview);                        // DELETE /api/review/:reviewId - Hide/delete a review

// Designer-related review endpoints
router.get("/designer/:designerId", getDesignerReviews);           // GET /api/review/designer/:designerId - Get all reviews for a designer
router.get("/designer/:designerId/analytics", getDesignerRatingAnalytics); // GET /api/review/designer/:designerId/analytics - Get detailed rating analytics

// Client-related review endpoints
router.get("/client/:clientId", getClientReviews);                 // GET /api/review/client/:clientId - Get all reviews by a client
router.get("/client/:clientId/reviewable", getReviewableProjects); // GET /api/review/client/:clientId/reviewable - Get projects that can be reviewed

module.exports = router;