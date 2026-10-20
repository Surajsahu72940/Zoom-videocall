import mongoose from "mongoose";

// ==========================================
// MEETING HISTORY SCHEMA
// ==========================================
const meetingSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            required: true,
            trim: true
        },

        meetingCode: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// ==========================================
// INDEX FOR FASTER USER HISTORY QUERIES
// ==========================================
meetingSchema.index({ user_id: 1, date: -1 });

// ==========================================
// CREATE MODEL
// ==========================================
const Meeting = mongoose.model("Meeting", meetingSchema);

// ==========================================
// EXPORT MODEL
// ==========================================
export { Meeting };

export default Meeting;