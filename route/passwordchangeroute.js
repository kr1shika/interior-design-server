// routes/passwordChangeRoutes.js
const express = require("express");
const router = express.Router();
const {
    requestPasswordChange,
    verifyOTPOnly,
    changePasswordAfterVerification,
    resendOTP
} = require("../controller/passwordChange");

// Middleware for basic request validation and security headers
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

// NEW: Verify OTP only (step 2)
router.post("/verify-otp-only", verifyOTPOnly);

// NEW: Change password after OTP verification (step 3)
router.post("/change-password", changePasswordAfterVerification);


// Resend OTP
router.post("/resend-otp", resendOTP);

module.exports = router;