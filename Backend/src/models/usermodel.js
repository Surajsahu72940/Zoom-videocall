import mongoose from "mongoose";

// ==========================================
// USER SCHEMA
// ==========================================
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },

        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false
        },

        token: {
            type: String,
            default: null,
            select: false
        }
    },
    {
        timestamps: true
    }
);

// ==========================================
// USER MODEL
// ==========================================
export const User = mongoose.model("User", userSchema);

export default User;