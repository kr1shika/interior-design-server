const express = require("express");
const router = express.Router();
const {
    submitStyleQuiz, getUserQuizMatches,
    getStyleRecommendations,
    updateStyleQuiz
} = require("../controller/matchController");

router.post("/submit", submitStyleQuiz);
router.get('/user-matches/:userId', getUserQuizMatches);

// GET /api/match/style-recommendations - Get designers based on style parameters
// Query params: style (required), tones (optional), approach (optional)
// Example: /api/match/style-recommendations?style=modern&tones=warm,neutral&approach=functional
router.get('/style-recommendations', getStyleRecommendations);

// PUT /api/match/update-quiz/:userId - Update user's quiz answers
router.put('/update-quiz/:userId', updateStyleQuiz);
module.exports = router;
