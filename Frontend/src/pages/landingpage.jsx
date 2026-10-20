import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

export default function LandingPage() {
    const router = useNavigate();

    // Join as guest
    const joinAsGuest = () => {
        const meetingId = Math.random().toString(36).substring(2, 10);
        router(`/${meetingId}`);
    };

    // Register
    const handleRegister = () => {
        router("/auth?mode=register");
    };

    // Login
    const handleLogin = () => {
        router("/auth?mode=login");
    };

    // Get Started
    const handleGetStarted = () => {
        router("/auth");
    };

    return (
        <div className="landingPageContainer">

            {/* Navbar */}
            <nav>
                <div className="navHeader">
                    <h2>Apna videoCall</h2>
                </div>

                <div className="navlist">
                    <button
                        type="button"
                        onClick={joinAsGuest}
                    >
                        Join as guest
                    </button>

                    <button
                        type="button"
                        onClick={handleRegister}
                    >
                        Register
                    </button>

                    <button
                        type="button"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* Main Section */}
            <div className="landingMainContainer">

                <div className="landingContent">
                    <h1>
                        <span >Connect</span> with your loved Ones
                    </h1>

                    <p>
                        Connect, communicate and collaborate with
                        your college friends.
                    </p>

                    <button
                        type="button"
                        className="getStartedButton"
                        onClick={handleGetStarted}
                    >
                        Get Start
                    </button>
                </div>

                <div className="landingImage">
                    <img
                        src="/House.png"
                        alt="Video calling application"
                    />
                </div>

            </div>

        </div>
    );
}