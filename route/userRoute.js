const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getAllDesigners,
    getDesignersByStyle,
    getUserById,
    updateUserProfile, searchDesigners
} = require("../controller/userController");

const path = require("path");

const fs = require("fs");
const uploadDir = "profile_pics";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.get("/getAllDesigners", getAllDesigners);
router.get("/style/:style", getDesignersByStyle); // New route for filtering by style
router.get("/:id", getUserById);
router.put("/:id", upload.single("profilepic"), updateUserProfile);
router.get("/search/:query", searchDesigners);
module.exports = router;