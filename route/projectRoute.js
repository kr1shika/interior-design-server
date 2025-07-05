// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const {
//     createProject, 
//     getUserProjects, 
//     updateProjectStatus,
//     updateProjectRoomDetails
// } = require('../controller/projectController.js');

// // Setup multer for room images
// const roomImagesDir = "room_images";
// if (!fs.existsSync(roomImagesDir)) {
//     fs.mkdirSync(roomImagesDir);
// }

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, roomImagesDir);
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//         cb(null, uniqueSuffix + path.extname(file.originalname));
//     },
// });

// const upload = multer({ storage });

// router.post('/createProject', createProject);
// router.get('/user/:userId', getUserProjects);
// router.patch("/:projectId/status", updateProjectStatus);
// router.patch("/:projectId/room-details", upload.array("room_images", 10), updateProjectRoomDetails);

// module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    createProject,
    getUserProjects,
    updateProjectStatus,
    updateProjectRoomDetails,
    getDesignerStats,
    getDesignerPerformance,
    getProjectRevenue
} = require('../controller/projectController.js');

// Setup multer for room images
const roomImagesDir = "room_images";
if (!fs.existsSync(roomImagesDir)) {
    fs.mkdirSync(roomImagesDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, roomImagesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Basic project routes
router.post('/createProject', createProject);
router.get('/user/:userId', getUserProjects);
router.patch("/:projectId/status", updateProjectStatus);
router.patch("/:projectId/room-details", upload.array("room_images", 10), updateProjectRoomDetails);

// Designer statistics and performance routes
router.get('/designer/stats/:designerId', getDesignerStats);
router.get('/designer/performance/:designerId', getDesignerPerformance);
router.get('/designer/revenue/:designerId', getProjectRevenue);

module.exports = router;