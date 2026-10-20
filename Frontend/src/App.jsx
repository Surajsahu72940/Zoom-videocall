
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/landingpage";
import Home from "./pages/home";
import Authentication from "./pages/authentication";
import History from "./pages/history";
import VideoMeetComponent from "./pages/videoMeet";

import { AuthProvider } from "./contexts/AuthContext";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Landing page */}
                    <Route
                        path="/"
                        element={<LandingPage />}
                    />

                    {/* Login and registration */}
                    <Route
                        path="/auth"
                        element={<Authentication />}
                    />

                    {/* Home page */}
                    <Route
                        path="/home"
                        element={<Home />}
                    />

                    {/* Meeting history */}
                    <Route
                        path="/history"
                        element={<History />}
                    />

                    {/* Dynamic meeting room */}
                    <Route
                        path="/:url"
                        element={<VideoMeetComponent />}
                    />

                    {/* Page not found */}
                    <Route
                        path="*"
                        element={
                            <div style={{ padding: "30px", textAlign: "center" }}>
                                <h1>404 - Page Not Found</h1>
                                <a href="/">Go to Home</a>
                            </div>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

