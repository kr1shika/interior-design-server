// middleware/upload.js
const multer = require("multer");
const path = require("path");

// Define storage location and filename
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "chatUploads");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limit: 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);

        if (ext && mime) {
            return cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

module.exports = upload;
