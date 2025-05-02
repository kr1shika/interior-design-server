const bcrypt = require("bcrypt");
const { generateToken } = require("../config/util.js");
const User = require("../model/user")

const signup = async (req, res) => {
    const { full_name, email, contact_no, password, role } = req.body;

    try {
        // Validation
        const errors = [];
        if (!full_name) errors.push("Full name is required");
        if (!email) errors.push("Email is required");
        if (!contact_no) errors.push("Contact number is required");
        if (!password) errors.push("Password is required");
        if (!role) errors.push("Role is required");
        if (password.length < 8) errors.push("Password must be at least 8 characters");
        if (!["client", "designer"].includes(role)) errors.push("Invalid role specified");

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ errors: ["Email already registered"] });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            full_name,
            email,
            contact_no,
            password: hashedPassword,
            role
        });

        await newUser.save();

        generateToken(newUser._id, res);

        // Return user data (excluding password)
        res.status(201).json({
            _id: newUser._id,
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            contact_no: newUser.contact_no,
            profile_picture: newUser.profile_picture
        });

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ errors: ["Invalid credentials"] });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ errors: ["Invalid credentials"] });
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            contact_no: user.contact_no,
            profile_picture: user.profile_picture
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

const logout = (req, res) => {
    try {
        res.clearCookie("interio_token");
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ errors: ["Internal server error"] });
    }
};

module.exports = { signup, login, logout };