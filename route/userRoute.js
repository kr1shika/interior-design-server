const express = require("express");
const router = express.Router();

const {
    getAllDesigners, getUserById, updateUserProfile
} = require('../controller/userController.js');


router.get('/getAllDesigners', getAllDesigners);
router.get("/:id", getUserById);
router.put("/:id", updateUserProfile);

module.exports = router;