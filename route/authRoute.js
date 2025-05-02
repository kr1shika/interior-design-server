const express = require("express");
const router = express.Router();

const {
    login,
    logout,
    signup,
} = require('../controller/authController.js');


router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);

module.exports = router;