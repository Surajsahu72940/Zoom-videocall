import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../App.css";
import { AuthContext } from "../contexts/AuthContext";

export default function Authentication() {
    const { handleRegister, handleLogin } = useContext(AuthContext);

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [formState, setFormState] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (loading) return;

        // Validate signup fields
        if (
            formState === 1 &&
            (
                !name.trim() ||
                !username.trim() ||
                !email.trim() ||
                !password
            )
        ) {
            setError("Please fill in all fields.");
            return;
        }

        // Validate login fields
        if (formState === 0 && (!username.trim() || !password)) {
            setError("Please enter your username/email and password.");
            return;
        }

        setLoading(true);

        try {
            if (formState === 0) {
                // SIGN IN
                const result = await handleLogin(
                    username.trim(),
                    password
                );

                // Verify successful login
                if (result?.success && result?.token) {
                    setMessage(result.message || "Login successful!");

                    // Navigate to the home page after login
                    navigate("/home");
                } else {
                    setError(result?.message || "Login failed.");
                }
            } else {
                // SIGN UP
                const result = await handleRegister(
                    name.trim(),
                    username.trim(),
                    email.trim().toLowerCase(),
                    password
                );

                if (result?.success) {
                    setMessage(
                        result.message ||
                        "Registration successful. Please sign in."
                    );

                    setName("");
                    setUsername("");
                    setEmail("");
                    setPassword("");

                    // Switch to login form
                    setFormState(0);
                } else {
                    setError(
                        result?.message || "Registration failed."
                    );
                }
            }
        } catch (err) {
            console.error(
                "Authentication error:",
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="authContainer">
            <div className="authImageSection"></div>

            <div className="authFormSection">
                <div className="authPaper">
                    <div className="authAvatar">🔒</div>

                    <h2>
                        {formState === 0 ? "Sign in" : "Sign up"}
                    </h2>

                    <form className="authForm" onSubmit={handleAuth}>
                        {/* SIGNUP FIELDS */}
                        {formState === 1 && (
                            <>
                                <div className="inputGroup">
                                    <label>Full Name *</label>

                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        autoComplete="name"
                                        required
                                    />
                                </div>

                                <div className="inputGroup">
                                    <label>Username *</label>

                                    <input
                                        type="text"
                                        placeholder="Choose a username"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        autoComplete="username"
                                        required
                                    />
                                </div>

                                <div className="inputGroup">
                                    <label>Email *</label>

                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* LOGIN FIELD */}
                        {formState === 0 && (
                            <div className="inputGroup">
                                <label>Username / Email *</label>

                                <input
                                    type="text"
                                    placeholder="Enter your username or email"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        )}

                        {/* PASSWORD FIELD */}
                        <div className="inputGroup">
                            <label>Password *</label>

                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                autoComplete={
                                    formState === 0
                                        ? "current-password"
                                        : "new-password"
                                }
                                required
                            />
                        </div>

                        {/* REMEMBER ME */}
                        <div className="authOptions">
                            <label className="rememberMe">
                                <input type="checkbox" />
                                Remember me
                            </label>
                        </div>

                        {/* ERROR MESSAGE */}
                        {error && (
                            <p
                                role="alert"
                                style={{
                                    color: "red",
                                    marginBottom: "10px"
                                }}
                            >
                                {error}
                            </p>
                        )}

                        {/* SUCCESS MESSAGE */}
                        {message && (
                            <p
                                role="status"
                                style={{
                                    color: "green",
                                    marginBottom: "10px"
                                }}
                            >
                                {message}
                            </p>
                        )}

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            className="submitBtn"
                            disabled={loading}
                        >
                            {loading
                                ? "Please wait..."
                                : formState === 0
                                ? "Sign In"
                                : "Register"}
                        </button>

                        {/* FORM SWITCH BUTTONS */}
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "15px",
                                width: "100%"
                            }}
                        >
                            <button
                                type="button"
                                className="submitBtn"
                                disabled={loading}
                                onClick={() => {
                                    setFormState(0);
                                    setError("");
                                    setMessage("");
                                }}
                                style={{
                                    background:
                                        formState === 0
                                            ? "#303f9f"
                                            : "#555"
                                }}
                            >
                                Go to Sign In
                            </button>

                            <button
                                type="button"
                                className="submitBtn"
                                disabled={loading}
                                onClick={() => {
                                    setFormState(1);
                                    setError("");
                                    setMessage("");
                                }}
                                style={{
                                    background:
                                        formState === 1
                                            ? "#303f9f"
                                            : "#555"
                                }}
                            >
                                Go to Sign Up
                            </button>
                        </div>

                        {/* COPYRIGHT */}
                        <div className="authCopyright">
                            <p>
                                Copyright © Your Website{" "}
                                {new Date().getFullYear()}.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}