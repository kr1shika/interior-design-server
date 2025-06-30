const express = require("express");
const router = express.Router();

const {
    createProject, getUserProjects, updateProjectStatus
} = require('../controller/projectController.js');

router.post('/createProject', createProject);
router.get('/user/:userId', getUserProjects);
router.patch("/projects/:projectId/status", updateProjectStatus);

module.exports = router;