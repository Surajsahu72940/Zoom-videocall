import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import "./home.css";
import { AuthContext } from "../contexts/AuthContext";

export default function Home() {
    const navigate = useNavigate();

    const { addToUserHistory } = useContext(AuthContext) || {};

    const [meetingCode, setMeetingCode] = useState("");

    // Join video call
    const handleJoinVideoCall = () => {
        joinMeeting();
    };

    // Join meeting using meeting ID
    const joinMeeting = async (event) => {
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        const meetingId = meetingCode.trim();

        // Check empty meeting ID
        if (!meetingId) {
            alert("Please enter a meeting ID");
            return;
        }

        try {
            // Save meeting ID in user history if available
            if (typeof addToUserHistory === "function") {
                await addToUserHistory(meetingId);
            }
        } catch (error) {
            console.error("Error saving meeting history:", error);
        }

        // Open video meeting page
        navigate(`/${encodeURIComponent(meetingId)}`);
    };

    // Open meeting history
    const openHistory = () => {
        navigate("/history");
    };

    // Logout
    const logout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    return (
        <div className="homeContainer">

            {/* Navbar */}
            <nav className="homeNavbar">
                <h2 className="homeLogo">
                    Apna Video Call
                </h2>

                <div className="navbarActions">

                    <button
                        onClick={openHistory}
                        className="navButton"
                        type="button"
                    >
                        History
                    </button>

                    <button
                        onClick={logout}
                        className="navButton logoutButton"
                        type="button"
                    >
                        Logout
                    </button>

                </div>
            </nav>

            {/* Main Section */}
            <main className="homeMain">

                <section className="homeContent">

                    <h1>
                        Providing Quality Video Call
                        <br />
                        Just Like Quality Education
                    </h1>

                    <p>
                        Connect with your friends and join meetings
                        from anywhere.
                    </p>

                    {/* Meeting Form */}
                    <form
                        onSubmit={joinMeeting}
                        className="meetingForm"
                    >

                        <label htmlFor="meetingCode">
                            Meeting Code
                        </label>

                        <div className="meetingInputGroup">

                            <input
                                id="meetingCode"
                                type="text"
                                placeholder="Enter meeting ID"
                                value={meetingCode}
                                onChange={(event) =>
                                    setMeetingCode(event.target.value)
                                }
                                autoComplete="off"
                            />

                            <button
                                type="submit"
                                className="joinButton"
                            >
                                JOIN
                            </button>

                        </div>

                    </form>

                </section>

                {/* Illustration */}
                <div className="homeIllustration">
                    <div className="illustrationCircle">
                        <span>📹</span>
                    </div>
                </div>

                {/* Alternate Join Panel */}
                <div className="meetContainer">

                    <div className="leftPanel">

                        <div>

                            <h2>
                                Start or Join a Video Call
                            </h2>

                            <div
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "center"
                                }}
                            >

                                <TextField
                                    label="Meeting Code"
                                    value={meetingCode}
                                    onChange={(event) =>
                                        setMeetingCode(event.target.value)
                                    }
                                    size="small"
                                />

                                <Button
                                    onClick={handleJoinVideoCall}
                                    variant="contained"
                                    type="button"
                                >
                                    Join
                                </Button>

                            </div>

                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}