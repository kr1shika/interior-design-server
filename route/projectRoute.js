const express = require("express");
const router = express.Router();

const {
    createProject,
    getUserProjects,
    updateProjectStatus,
    updateProjectRoomDetails
} = require('../controller/projectController.js');

router.post('/createProject', createProject);
router.get('/user/:userId', getUserProjects);
router.patch("/:projectId/status", updateProjectStatus);
router.patch("/:projectId/room-details", updateProjectRoomDetails);

module.exports = router;