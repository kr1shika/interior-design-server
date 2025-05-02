const express = require("express");
const router = express.Router();

const {
    createProject,
} = require('../controller/projectController.js');

router.post('/createProject', createProject);
module.exports = router;