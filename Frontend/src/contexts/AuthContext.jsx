import React, {
    createContext,
    useState
} from "react";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import server from "../environment";

// Create Authentication Context
export const AuthContext = createContext({});

// Axios Client
const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Authentication Provider
export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            const savedUser = localStorage.getItem("userData");

            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            console.error("Error loading saved user:", error);
            return null;
        }
    });

    const router = useNavigate();

    // Register Handler
    const handleRegister = async (
        name,
        username,
        email,
        password
    ) => {
        try {
            const response = await client.post("/register", {
                name: name.trim(),
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password
            });

            return response.data;
        } catch (error) {
            console.error(
                "Registration error:",
                error.response?.data || error.message
            );

            throw error;
        }
    };

    // Login Handler
    const handleLogin = async (username, password) => {
        try {
            const response = await client.post("/login", {
                username: username.trim(),
                password
            });

            const data = response.data;

            // Verify login response
            if (!data.token || !data.user) {
                throw new Error(
                    data.message ||
                    "Login response mein token ya user data missing hai."
                );
            }

            // Save authentication data
            localStorage.setItem("token", data.token);
            localStorage.setItem(
                "userData",
                JSON.stringify(data.user)
            );

            // Update React state
            setUserData(data.user);

            return data;
        } catch (error) {
            console.error(
                "Login error:",
                error.response?.data || error.message
            );

            throw error;
        }
    };

    // Get User Meeting History
    const getHistoryOfUser = async () => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "Login token nahi mila. Please login again."
                );
            }

            const response = await client.get(
                "/get_all_activity",
                {
                    params: { token }
                }
            );

            return response.data;
        } catch (error) {
            console.error(
                "Get history error:",
                error.response?.data || error.message
            );

            throw error;
        }
    };

    // Add Meeting To History
    const addToUserHistory = async (meetingCode) => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "Login token nahi mila. Please login again."
                );
            }

            const response = await client.post(
                "/add_to_activity",
                {
                    token,
                    meeting_code: meetingCode
                }
            );

            return response.data;
        } catch (error) {
            console.error(
                "Add history error:",
                error.response?.data || error.message
            );

            throw error;
        }
    };

    // Logout Handler
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userData");

        setUserData(null);

        router("/auth");
    };

    // Context Values
    const data = {
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
        handleLogout
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;