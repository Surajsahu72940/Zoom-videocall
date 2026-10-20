import express from "express";

import {
    addToHistory,
    getUserHistory,
    login,
    register
} from "../controllers/user.controler.js";

const router = express.Router();

// ==========================================
// USER LOGIN
// POST /api/v1/users/login
// ==========================================
router.post("/login", login);

// ==========================================
// USER REGISTRATION
// POST /api/v1/users/register
// ==========================================
router.post("/register", register);

// ==========================================
// ADD MEETING TO USER HISTORY
// POST /api/v1/users/add_to_activity
// ==========================================
router.post("/add_to_activity", addToHistory);

// ==========================================
// GET USER MEETING HISTORY
// GET /api/v1/users/get_all_activity
// ==========================================
router.get("/get_all_activity", getUserHistory);

export default router;