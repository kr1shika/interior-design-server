const express = require("express");
const router = express.Router();

const {
    createProject, getUserProjects
} = require('../controller/projectController.js');

router.post('/createProject', createProject);
router.get('/user/:userId', getUserProjects);

module.exports = router;