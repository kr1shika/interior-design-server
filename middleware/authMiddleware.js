// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../model/user");

// Rate limiting storage (use Redis in production)
const loginAttempts = new Map();
const requestLimits = new Map();
const blacklistedTokens = new Set();

// 🔐 JWT Token verification middleware
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        let token = req.cookies?.interio_token;

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({
                errors: ["Access denied. No token provided."]
            });
        }

        // Check if token is blacklisted
        if (blacklistedTokens.has(token)) {
            return res.status(401).json({
                errors: ["Token has been invalidated. Please login again."]
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch fresh user data to ensure account is still valid
        const user = await User.findById(decoded.userId).select('-password -passwordHistory');

        if (!user) {
            return res.status(401).json({
                errors: ["Invalid token. User not found."]
            });
        }

        // Check if user account is active
        if (user.isActive === false) {
            return res.status(401).json({
                errors: ["Account deactivated."]
            });
        }

        // Check if account is locked
        if (user.accountLocked) {
            return res.status(423).json({
                errors: ["Account is locked. Please contact support."]
            });
        }

        // Add user info to request object
        req.user = user;
        req.userId = user._id.toString();
        req.token = token;

        // Update last activity (optional)
        user.lastActivity = new Date();
        await user.save();

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                errors: ["Token expired. Please login again."]
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                errors: ["Invalid token."]
            });
        }

        console.error("❌ Auth middleware error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

// 🔐 Role-based authorization middleware
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                errors: ["Access denied. Please login."]
            });
        }

        const userRole = req.user.role?.toLowerCase();
        const normalizedRoles = allowedRoles.map(role => role.toLowerCase());

        if (!normalizedRoles.includes(userRole)) {
            return res.status(403).json({
                errors: ["Access denied. Insufficient permissions."],
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

// 🔐 User ownership verification (user can only access their own data)
const verifyOwnership = (req, res, next) => {
    const resourceUserId = req.params.userId || req.params.id;
    const requestingUserId = req.userId;

    if (resourceUserId !== requestingUserId) {
        return res.status(403).json({
            errors: ["Access denied. You can only access your own resources."]
        });
    }

    next();
};

// 🔐 Brute force protection middleware
const bruteForceProtection = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const key = `${clientIP}_${req.route?.path || req.path}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10; // Adjust based on endpoint sensitivity

    // Clean old entries
    for (let [k, v] of requestLimits.entries()) {
        if (now - v.firstAttempt > windowMs) {
            requestLimits.delete(k);
        }
    }

    const attempts = requestLimits.get(key);

    if (attempts && attempts.count >= maxAttempts) {
        const timeLeft = windowMs - (now - attempts.firstAttempt);
        return res.status(429).json({
            errors: [`Too many requests. Try again in ${Math.ceil(timeLeft / 60000)} minutes`]
        });
    }

    // Track attempt
    if (attempts) {
        attempts.count++;
    } else {
        requestLimits.set(key, { count: 1, firstAttempt: now });
    }

    next();
};

// 🔐 Login attempt tracking for specific users
const trackLoginAttempt = (email, success = false) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    if (!loginAttempts.has(email)) {
        loginAttempts.set(email, { count: 0, firstAttempt: now, lockedUntil: null });
    }

    const attempts = loginAttempts.get(email);

    // Reset if window expired
    if (now - attempts.firstAttempt > windowMs) {
        attempts.count = 0;
        attempts.firstAttempt = now;
        attempts.lockedUntil = null;
    }

    if (success) {
        // Reset on successful login
        loginAttempts.delete(email);
    } else {
        attempts.count++;
        if (attempts.count >= maxAttempts) {
            attempts.lockedUntil = now + windowMs;
        }
    }
};

const checkAccountLock = (email) => {
    const attempts = loginAttempts.get(email);
    if (attempts && attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
        const timeLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
        return `Account locked. Try again in ${timeLeft} minutes`;
    }
    return null;
};

// 🔐 Token blacklisting (for logout)
const blacklistToken = (token) => {
    blacklistedTokens.add(token);

    // Clean up expired tokens periodically
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            setTimeout(() => {
                blacklistedTokens.delete(token);
            }, (decoded.exp * 1000) - Date.now());
        }
    } catch (error) {
        console.error("Error scheduling token cleanup:", error);
    }
};

const requireRecentAuth = (maxAgeMinutes = 30) => {
    return async (req, res, next) => {
        const token = req.token;
        if (!token) {
            return res.status(401).json({
                errors: ["Recent authentication required."]
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const tokenAge = Date.now() - (decoded.iat * 1000);
            const maxAge = maxAgeMinutes * 60 * 1000;

            if (tokenAge > maxAge) {
                return res.status(401).json({
                    errors: [`Please re-authenticate within the last ${maxAgeMinutes} minutes for this action.`]
                });
            }

            next();
        } catch (error) {
            return res.status(401).json({
                errors: ["Invalid session."]
            });
        }
    };
};

// 🔐 Activity logging middleware
const logActivity = (action) => {
    return (req, res, next) => {
        const logData = {
            userId: req.userId,
            action,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
            endpoint: req.originalUrl,
            method: req.method
        };

      

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRole,
    verifyOwnership,
    bruteForceProtection,
    trackLoginAttempt,
    checkAccountLock,
    blacklistToken,
    requireRecentAuth,
    logActivity,
    
};