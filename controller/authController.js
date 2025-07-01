const bcrypt = require("bcrypt");
const { generateToken } = require("../config/util.js");
const User = require("../model/user");
const { trackLoginAttempt, checkAccountLock } = require("../middleware/authMiddleware");



const signup = async (req, res) => {
    const { full_name, email, password, role } = req.body;

    try {
        // Basic validation
        const errors = [];
        if (!full_name) errors.push("Full name is required");
        if (!email) errors.push("Email is required");
        if (!password) errors.push("Password is required");
        if (!role) errors.push("Role is required");
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            errors.push("Please enter a valid email address");
        }
        
        // Role validation
        if (!["client", "designer"].includes(role)) {
            errors.push("Invalid role specified");
        }

        // Enhanced password validation
        if (password) {
            const passwordErrors = validatePassword(password);
            errors.push(...passwordErrors);
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ errors: ["Email already registered"] });
        }

        // Hash password with higher cost for better security
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with additional security fields
        const newUser = new User({
            full_name: full_name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            isActive: true,
            createdAt: new Date(),
            lastLogin: null,
            loginAttempts: 0,
            accountLocked: false,
            passwordHistory: [hashedPassword], // Store for password reuse prevention
            passwordChangedAt: new Date()
        });

        await newUser.save();

        // Generate token and set secure cookie
        const token = generateToken(newUser._id, res);

        // Log activity (implement activity logging)
        console.log(`User registered: ${email} at ${new Date().toISOString()}`);

        // Return user data (excluding sensitive information)
        res.status(201).json({
            _id: newUser._id,
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            profile_picture: newUser.profile_picture,
            token: token // Include token for client-side storage if needed
        });

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ 
                errors: ["Email and password are required"] 
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check account lock status
        const lockMessage = checkAccountLock(normalizedEmail);
        if (lockMessage) {
            return res.status(423).json({ errors: [lockMessage] });
        }

        // Find user
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            trackLoginAttempt(normalizedEmail, false);
            return res.status(401).json({ errors: ["Invalid credentials"] });
        }

        // Check if account is active
        if (user.isActive === false) {
            return res.status(401).json({ errors: ["Account is deactivated"] });
        }

        // Check if account is locked
        if (user.accountLocked) {
            return res.status(423).json({ 
                errors: ["Account is locked. Please contact support"] 
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            trackLoginAttempt(normalizedEmail, false);
            
            // Increment failed login attempts in database
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            if (user.loginAttempts >= 5) {
                user.accountLocked = true;
            }
            await user.save();
            
            return res.status(401).json({ errors: ["Invalid credentials"] });
        }

        // Successful login - reset attempts and update last login
        trackLoginAttempt(normalizedEmail, true);
        user.loginAttempts = 0;
        user.lastLogin = new Date();
        await user.save();

        // Generate new token
        const token = generateToken(user._id, res);

        // Log activity
        console.log(`User logged in: ${email} at ${new Date().toISOString()}`);

        res.status(200).json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            profile_picture: user.profile_picture,
            token: token
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

const logout = async (req, res) => {
    try {
        // Clear the HTTP-only cookie
        res.clearCookie("interio_token", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === 'production'
        });

        // If using token blacklisting, add token to blacklist here
        // await BlacklistedToken.create({ token: req.cookies?.interio_token });

        // Log activity
        if (req.user) {
            console.log(`User logged out: ${req.user.email} at ${new Date().toISOString()}`);
        }

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

// New endpoint for checking password strength
const checkPasswordStrength = (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ errors: ["Password is required"] });
    }
    
    const strength = calculatePasswordStrength(password);
    res.status(200).json(strength);
};

// New endpoint for changing password
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                errors: ["Current password and new password are required"] 
            });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ errors: ["User not found"] });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ errors: ["Current password is incorrect"] });
        }

        // Validate new password
        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ errors: passwordErrors });
        }

        // Check password history to prevent reuse
        const isReused = await Promise.all(
            user.passwordHistory.map(oldHash => bcrypt.compare(newPassword, oldHash))
        );
        
        if (isReused.some(match => match)) {
            return res.status(400).json({ 
                errors: ["Cannot reuse recent passwords"] 
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Update password and history
        user.password = hashedNewPassword;
        user.passwordHistory.push(hashedNewPassword);
        
        // Keep only last 5 passwords
        if (user.passwordHistory.length > 5) {
            user.passwordHistory = user.passwordHistory.slice(-5);
        }
        
        user.passwordChangedAt = new Date();
        await user.save();

        // Log activity
        console.log(`Password changed: ${user.email} at ${new Date().toISOString()}`);

        res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

module.exports = { 
    signup, 
    login, 
    logout, 
    checkPasswordStrength, 
    changePassword 
};