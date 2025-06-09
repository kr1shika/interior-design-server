const express = require("express");
const router = express.Router();
const {
    submitStyleQuiz,
} = require("../controller/matchController");

router.post("/submit", submitStyleQuiz);

module.exports = router;
