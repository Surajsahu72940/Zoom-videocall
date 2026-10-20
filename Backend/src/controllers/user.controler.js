import { User } from "../models/usermodel.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.js";

// ==========================================
// 1. LOGIN USER
// ==========================================
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password
        ) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Please enter your username/email and password."
            });
        }

        const loginInput = username.trim();

        // Find user by username OR email
        const user = await User.findOne({
    $or: [
        { username: loginInput },
        { email: loginInput.toLowerCase() }
    ]
}).select("+password");

        // Debug without exposing the password
        console.log("LOGIN ATTEMPT:", {
            loginInput,
            userFound: Boolean(user),
            passwordHashExists: Boolean(user?.password)
        });

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid username/email or password."
            });
        }

        // Compare entered password with stored bcrypt hash
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            console.log("LOGIN FAILED: Password mismatch");

            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid username/email or password."
            });
        }

        // Generate authentication token
        const token = crypto.randomBytes(32).toString("hex");

        user.token = token;
        await user.save();

        console.log("LOGIN SUCCESS:", user.username);

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Login failed due to a server error."
        });
    }
};


// ==========================================
// 2. REGISTER USER
// ==========================================
const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        // Validate input types
        if (
            typeof name !== "string" ||
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Please provide valid registration details."
            });
        }

        // Validate required fields
        if (
            !name.trim() ||
            !username.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        // Normalize input
        const cleanName = name.trim();
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Check for existing username or email
        const existingUser = await User.findOne({
            $or: [
                { username: cleanUsername },
                { email: cleanEmail }
            ]
        });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Username or email already exists. Please sign in."
            });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword
        });

        await newUser.save();

        console.log("REGISTRATION SUCCESS:", cleanUsername);

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "Registration successful. Please sign in."
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        // MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Username or email already exists."
            });
        }

        // Mongoose validation error
        if (error.name === "ValidationError") {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Please check your registration details."
            });
        }

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Registration failed due to a server error."
        });
    }
};


// ==========================================
// 3. GET USER MEETING HISTORY
// ==========================================
const getUserHistory = async (req, res) => {
    try {
        const { token } = req.query;

        if (typeof token !== "string" || !token.trim()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Authentication token is required."
            });
        }

        const user = await User.findOne({
            token: token.trim()
        });

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid token. Please sign in again."
            });
        }

        const meetings = await Meeting.find({
            user_id: user.username
        });

        return res.status(httpStatus.OK).json({
            success: true,
            meetings
        });

    } catch (error) {
        console.error("GET HISTORY ERROR:", error);

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Could not fetch meeting history."
        });
    }
};


// ==========================================
// 4. ADD MEETING TO HISTORY
// ==========================================
const addToHistory = async (req, res) => {
    try {
        const { token, meeting_code } = req.body;

        if (
            typeof token !== "string" ||
            !token.trim() ||
            typeof meeting_code !== "string" ||
            !meeting_code.trim()
        ) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Authentication token and meeting code are required."
            });
        }

        const user = await User.findOne({
            token: token.trim()
        });

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid token. Please sign in again."
            });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code.trim()
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting added to history."
        });

    } catch (error) {
        console.error("ADD HISTORY ERROR:", error);

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Could not add meeting to history."
        });
    }
};


// ==========================================
// 5. EXPORT CONTROLLERS
// ==========================================
export {
    login,
    register,
    getUserHistory,
    addToHistory
};