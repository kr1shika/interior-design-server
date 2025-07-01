const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createPortfolioPost, getUserPortfolioPosts, deletePortfolioPost } = require("../controller/portfolioController");
const { authenticateToken } = require("../middleware/authMiddleware");

const uploadDir = "portfolio_uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

router.post("/create", upload.array("images", 10), createPortfolioPost);

router.get("/posts/:designerId", getUserPortfolioPosts);
router.delete("/posts/:postId", authenticateToken, deletePortfolioPost);

module.exports = router;
// 683f1a9fb2873d694e410705