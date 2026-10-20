import React, {
    useContext,
    useEffect,
    useState
} from "react";

import {
    Card,
    CardContent,
    IconButton,
    Typography,
    CircularProgress
} from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";

import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getHistoryOfUser();

                // Handle different possible API response formats
                const history = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.history)
                    ? response.history
                    : Array.isArray(response?.data)
                    ? response.data
                    : [];

                if (isMounted) {
                    setMeetings(history);
                }
            } catch (err) {
                console.error(
                    "Error fetching meeting history:",
                    err.response?.data || err.message
                );

                if (isMounted) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load meeting history. Please try again."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchHistory();

        return () => {
            isMounted = false;
        };
    }, [getHistoryOfUser]);

    // Format meeting date
    const formatDate = (dateString) => {
        if (!dateString) {
            return "Date unavailable";
        }

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "Invalid date";
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };

    return (
        <div style={{ padding: "20px" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "20px"
                }}
            >
                <IconButton
                    aria-label="Go to home"
                    onClick={() => navigate("/home")}
                >
                    <HomeIcon />
                </IconButton>

                <Typography variant="h5">
                    Meeting History
                </Typography>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: "center", padding: "30px" }}>
                    <CircularProgress />

                    <Typography sx={{ mt: 2 }}>
                        Loading meeting history...
                    </Typography>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <Typography
                    role="alert"
                    color="error"
                    sx={{ mt: 2 }}
                >
                    {error}
                </Typography>
            )}

            {/* Meeting List */}
            {!loading && !error && meetings.length > 0 && (
                meetings.map((meeting, index) => (
                    <Card
                        variant="outlined"
                        key={meeting._id || index}
                        sx={{ mb: 2 }}
                    >
                        <CardContent>
                            <Typography
                                sx={{ fontSize: 14 }}
                                color="text.secondary"
                                gutterBottom
                            >
                                Code: {meeting.meetingCode || "Unavailable"}
                            </Typography>

                            <Typography color="text.secondary">
                                Date: {formatDate(meeting.date)}
                            </Typography>
                        </CardContent>
                    </Card>
                ))
            )}

            {/* Empty State */}
            {!loading && !error && meetings.length === 0 && (
                <Typography sx={{ mt: 2 }}>
                    No meeting history found.
                </Typography>
            )}
        </div>
    );
}