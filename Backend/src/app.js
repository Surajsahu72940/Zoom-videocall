import "dotenv/config";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/usersrouter.js";

const app = express();
const server = createServer(app);

// Backend port
const PORT = process.env.PORT || 8000;

// CORS configuration
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        credentials: true
    })
);

// Parse JSON request bodies
app.use(express.json({ limit: "40kb" }));

// Parse URL-encoded request bodies
app.use(
    express.urlencoded({
        limit: "40kb",
        extended: true
    })
);

// API routes
app.use("/api/v1/users", userRoutes);

// Health check route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is running"
    });
});

// Initialize Socket.IO
connectToSocket(server);

// Start server after connecting to MongoDB
const start = async () => {
    try {
        const mongoUrl = process.env.MONGO_URI;

        if (!mongoUrl) {
            throw new Error(
                "MONGO_URI .env file mein nahi mila. Please check your .env file."
            );
        }

        // Connect to MongoDB
        const connectionDb = await mongoose.connect(mongoUrl);

        console.log(
            "MongoDB connected:",
            connectionDb.connection.host
        );

        // Start backend server
        server.listen(PORT, () => {
            console.log(
                `Backend running at http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "Backend startup error:",
            error.message
        );

        process.exit(1);
    }
};

// Run application
start();