const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getAllDesigners,
    getUserById,
    updateUserProfile,
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
router.get("/:id", getUserById);
router.put("/:id", upload.single("profilepic"), updateUserProfile);

module.exports = router;
