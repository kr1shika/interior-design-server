// routes/passwordChangeRoutes.js
const express = require("express");
const router = express.Router();
const { 
    requestPasswordChange, 
    verifyOTPAndChangePassword, 
    resendOTP 
} = require("../controller/passwordChange");

const addSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
};

// Apply security headers to all routes
router.use(addSecurityHeaders);

// Request OTP for password change
router.post("/request-otp", requestPasswordChange);

// Verify OTP and change password
router.post("/verify-otp", verifyOTPAndChangePassword);

// Resend OTP
router.post("/resend-otp", resendOTP);

module.exports = router;