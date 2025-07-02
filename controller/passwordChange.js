// controller/passwordChangeController.js
const nodemailer = require("nodemailer");
const User = require("../model/user");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'krishikakh@gmail.com',
        pass: 'oysqizvoqqbnucnl'
    }
});

// Rate limiting storage (use Redis in production)
const otpAttempts = new Map();
const ipAttempts = new Map();

// Generate cryptographically secure OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Hash OTP before storing
const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

const checkRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const now = Date.now();
    const attempts = otpAttempts.get(identifier) || { count: 0, firstAttempt: now };

    if (now - attempts.firstAttempt > windowMs) {
        attempts.count = 0;
        attempts.firstAttempt = now;
    }

    if (attempts.count >= maxAttempts) {
        const timeLeft = windowMs - (now - attempts.firstAttempt);
        return { blocked: true, timeLeft: Math.ceil(timeLeft / 60000) };
    }

    attempts.count++;
    otpAttempts.set(identifier, attempts);
    return { blocked: false };
};

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: 'krishikakh@gmail.com',
        to: email,
        subject: 'Password Change OTP - InteriorLine',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #C2805A;">Password Change Request</h2>
                <p>Hello,</p>
                <p>You have requested to change your password. Please use the following OTP to proceed:</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #C2805A; font-size: 32px; margin: 0; letter-spacing: 3px;">${otp}</h1>
                </div>
                <p><strong>This OTP will expire in 5 minutes.</strong></p>
                <p><strong>Security Notice:</strong> If you didn't request this password change, please contact our support team immediately.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Best regards,<br>InteriorLine Team</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

const requestPasswordChange = async (req, res) => {
    const { email } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // Input validation
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: "Valid email is required" });
        }

        // Rate limiting by IP
        const ipLimit = checkRateLimit(`ip_${clientIP}`, 10, 15 * 60 * 1000);
        if (ipLimit.blocked) {
            return res.status(429).json({
                message: `Too many requests from this IP. Try again in ${ipLimit.timeLeft} minutes`
            });
        }

        // Rate limiting by email
        const emailLimit = checkRateLimit(`email_${email}`, 3, 15 * 60 * 1000);
        if (emailLimit.blocked) {
            return res.status(429).json({
                message: `Too many OTP requests for this email. Try again in ${emailLimit.timeLeft} minutes`
            });
        }

        const user = await User.findOne({ email });

        // Always return success to prevent email enumeration
        if (!user) {
            console.log(`⚠️ Password reset attempted for non-existent email: ${email}`);
            return res.status(200).json({ message: "If this email exists, an OTP has been sent" });
        }

        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        user.otp = hashedOTP;
        user.otpExpiry = Date.now() + 300000; // OTP expires in 5 minutes
        user.otpAttempts = 0; // Reset attempts counter
        await user.save();

        await sendOTP(email, otp);

        console.log(`✅ OTP sent to ${email} from IP: ${clientIP}`);
        res.status(200).json({ message: "If this email exists, an OTP has been sent" });
    } catch (error) {
        console.error("❌ Error sending OTP:", error);
        res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
};

// NEW: Verify OTP only (without changing password)
const verifyOTPOnly = async (req, res) => {
    const { email, otp } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // Input validation
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: "OTP must be 6 digits" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid request" });
        }

        // Check if OTP exists and hasn't expired
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });
        }

        if (Date.now() > user.otpExpiry) {
            // Clear expired OTP
            user.otp = null;
            user.otpExpiry = null;
            user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        // Rate limiting for OTP verification attempts
        if (user.otpAttempts >= 3) {
            user.otp = null;
            user.otpExpiry = null;
            user.otpAttempts = 0;
            await user.save();
            return res.status(400).json({
                message: "Too many failed attempts. Please request a new OTP."
            });
        }

        // Verify OTP using constant-time comparison
        const hashedInputOTP = hashOTP(otp);
        const isValidOTP = crypto.timingSafeEqual(
            Buffer.from(hashedInputOTP, 'hex'),
            Buffer.from(user.otp, 'hex')
        );

        if (!isValidOTP) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            await user.save();

            const remainingAttempts = 3 - user.otpAttempts;
            return res.status(400).json({
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
            });
        }

        // OTP is valid - mark as verified but don't change password yet
        user.otpVerified = true; // Add this field to track OTP verification
        user.otpAttempts = 0; // Reset attempts since OTP is correct
        await user.save();

        console.log(`✅ OTP verified successfully for ${email} from IP: ${clientIP}`);
        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        console.error("❌ Error verifying OTP:", error);
        res.status(500).json({ error: "Failed to verify OTP. Please try again." });
    }
};

// UPDATED: Change password only (after OTP verification)
const changePasswordAfterVerification = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // Input validation
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: "OTP must be 6 digits" });
        }

        // Strong password validation
        if (newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid request" });
        }

        // Check if OTP was previously verified
        if (!user.otpVerified || !user.otp || !user.otpExpiry) {
            return res.status(400).json({ message: "Please verify your OTP first." });
        }

        // Check if OTP session hasn't expired
        if (Date.now() > user.otpExpiry) {
            user.otp = null;
            user.otpExpiry = null;
            user.otpAttempts = 0;
            user.otpVerified = false;
            await user.save();
            return res.status(400).json({ message: "OTP session has expired. Please request a new one." });
        }

        // Verify OTP one more time for security
        const hashedInputOTP = hashOTP(otp);
        const isValidOTP = crypto.timingSafeEqual(
            Buffer.from(hashedInputOTP, 'hex'),
            Buffer.from(user.otp, 'hex')
        );

        if (!isValidOTP) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from your current password"
            });
        }

        // Hash the new password with higher salt rounds
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password and clear OTP data
        user.password = hashedPassword;
        user.otp = null;
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.otpVerified = false;
        user.lastPasswordChange = new Date();
        await user.save();

        console.log(`✅ Password changed successfully for ${email} from IP: ${clientIP}`);
        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("❌ Error changing password:", error);
        res.status(500).json({ error: "Failed to change password. Please try again." });
    }
};

// Resend OTP function with enhanced security
const resendOTP = async (req, res) => {
    const { email } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // Rate limiting for resend requests
        const resendLimit = checkRateLimit(`resend_${email}`, 2, 15 * 60 * 1000);
        if (resendLimit.blocked) {
            return res.status(429).json({
                message: `Too many resend requests. Try again in ${resendLimit.timeLeft} minutes`
            });
        }

        const user = await User.findOne({ email });

        // Always return success to prevent email enumeration
        if (!user) {
            console.log(`⚠️ OTP resend attempted for non-existent email: ${email}`);
            return res.status(200).json({ message: "If this email exists, an OTP has been sent" });
        }

        // Check if there's an active OTP request
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({
                message: "No active OTP request found. Please start a new password change request."
            });
        }

        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        user.otp = hashedOTP;
        user.otpExpiry = Date.now() + 300000; // 5 minutes
        user.otpAttempts = 0; // Reset attempts
        user.otpVerified = false; // Reset verification status
        await user.save();

        await sendOTP(email, otp);

        console.log(`✅ OTP resent to ${email} from IP: ${clientIP}`);
        res.status(200).json({ message: "If this email exists, an OTP has been sent" });
    } catch (error) {
        console.error("❌ Error resending OTP:", error);
        res.status(500).json({ error: "Failed to resend OTP. Please try again." });
    }
};

module.exports = {
    requestPasswordChange,
    verifyOTPOnly,
    changePasswordAfterVerification,
    resendOTP
};