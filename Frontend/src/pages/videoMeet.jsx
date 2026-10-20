import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

import "../styles/videoComponent.css";

import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Badge from "@mui/material/Badge";

import Videocam from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEnd from "@mui/icons-material/CallEnd";
import Mic from "@mui/icons-material/Mic";
import MicOff from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";

const SERVER_URL = "http://localhost:8000";

const PEER_CONFIG = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

export default function VideoMeetComponent() {
    const navigate = useNavigate();

    // ==========================================
    // REFS
    // ==========================================

    const socketRef = useRef(null);

    const lobbyVideoRef = useRef(null);
    const localVideoRef = useRef(null);

    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);

    const peerConnectionsRef = useRef({});
    const pendingIceRef = useRef({});
    const usernamesRef = useRef({});

    const showChatRef = useRef(true);
    const mountedRef = useRef(true);
    const joiningRef = useRef(false);
    const leavingRef = useRef(false);

    // ==========================================
    // STATES
    // ==========================================

    const [username, setUsername] = useState("");
    const [askForUsername, setAskForUsername] = useState(true);

    const [videos, setVideos] = useState([]);
    const [error, setError] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");

    const [screen, setScreen] = useState(false);
    const [newMessages, setNewMessages] = useState(0);
    const [showChat, setShowChat] = useState(true);

    // ==========================================
    // TIMESTAMP
    // ==========================================

    const getTimestamp = () => {
        return new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // ==========================================
    // UPDATE REMOTE VIDEO
    // ==========================================

    const upsertRemoteVideo = useCallback((socketId, stream) => {
        if (!socketId || !stream) {
            return;
        }

        setVideos((currentVideos) => {
            const existing = currentVideos.find(
                (item) => item.socketId === socketId
            );

            const participant = {
                socketId,
                stream,
                username:
                    usernamesRef.current[socketId] ||
                    existing?.username ||
                    "Participant"
            };

            if (existing) {
                return currentVideos.map((item) =>
                    item.socketId === socketId
                        ? participant
                        : item
                );
            }

            return [...currentVideos, participant];
        });
    }, []);

    // ==========================================
    // REMOVE REMOTE PARTICIPANT
    // ==========================================

    const removeRemoteVideo = useCallback((socketId) => {
        const peer = peerConnectionsRef.current[socketId];

        if (peer) {
            peer.ontrack = null;
            peer.onicecandidate = null;
            peer.onconnectionstatechange = null;

            peer.close();

            delete peerConnectionsRef.current[socketId];
        }

        delete pendingIceRef.current[socketId];
        delete usernamesRef.current[socketId];

        setVideos((currentVideos) =>
            currentVideos.filter(
                (item) => item.socketId !== socketId
            )
        );
    }, []);

    // ==========================================
    // SEND SIGNAL
    // ==========================================

    const sendSignal = useCallback((toId, payload) => {
        const socket = socketRef.current;

        if (!socket?.connected || !toId || !payload) {
            return;
        }

        socket.emit(
            "signal",
            toId,
            JSON.stringify(payload)
        );
    }, []);

    // ==========================================
    // FLUSH PENDING ICE CANDIDATES
    // ==========================================

    const flushPendingIce = useCallback(async (peerId, peer) => {
        const queuedCandidates =
            pendingIceRef.current[peerId] || [];

        pendingIceRef.current[peerId] = [];

        for (const candidate of queuedCandidates) {
            try {
                await peer.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (iceError) {
                console.error(
                    "Queued ICE candidate error:",
                    iceError
                );
            }
        }
    }, []);

    // ==========================================
    // CREATE PEER CONNECTION
    // ==========================================

    const createPeerConnection = useCallback((peerId) => {
        if (!peerId) {
            return null;
        }

        const existingPeer =
            peerConnectionsRef.current[peerId];

        if (
            existingPeer &&
            existingPeer.signalingState !== "closed"
        ) {
            return existingPeer;
        }

        const peer = new RTCPeerConnection(PEER_CONFIG);

        peerConnectionsRef.current[peerId] = peer;
        pendingIceRef.current[peerId] = [];

        const localStream = localStreamRef.current;
        const outgoingStream =
            screenStreamRef.current || localStream;

        if (outgoingStream) {
            outgoingStream.getTracks().forEach((track) => {
                peer.addTrack(track, outgoingStream);
            });
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(peerId, {
                    ice: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            let remoteStream = event.streams?.[0];

            if (!remoteStream && event.track) {
                remoteStream = new MediaStream([event.track]);
            }

            if (remoteStream) {
                upsertRemoteVideo(peerId, remoteStream);
            }
        };

        peer.onconnectionstatechange = () => {
            console.log(
                `Peer ${peerId}:`,
                peer.connectionState
            );

            if (peer.connectionState === "failed") {
                console.warn(
                    "WebRTC connection failed:",
                    peerId
                );
            }

            if (peer.connectionState === "closed") {
                removeRemoteVideo(peerId);
            }
        };

        return peer;
    }, [
        sendSignal,
        upsertRemoteVideo,
        removeRemoteVideo
    ]);

    // ==========================================
    // HANDLE WEBRTC SIGNALS
    // ==========================================

    const handleSignal = useCallback(async (fromId, rawMessage) => {
        if (
            !fromId ||
            fromId === socketRef.current?.id
        ) {
            return;
        }

        let signal;

        try {
            signal =
                typeof rawMessage === "string"
                    ? JSON.parse(rawMessage)
                    : rawMessage;
        } catch (parseError) {
            console.error(
                "Invalid WebRTC signal:",
                parseError
            );
            return;
        }

        if (!signal || typeof signal !== "object") {
            return;
        }

        try {
            const peer = createPeerConnection(fromId);

            if (!peer) {
                return;
            }

            // OFFER OR ANSWER
            if (signal.sdp) {
                await peer.setRemoteDescription(
                    new RTCSessionDescription(signal.sdp)
                );

                await flushPendingIce(fromId, peer);

                if (signal.sdp.type === "offer") {
                    const answer = await peer.createAnswer();

                    await peer.setLocalDescription(answer);

                    sendSignal(fromId, {
                        sdp: peer.localDescription
                    });
                }
            }

            // ICE CANDIDATE
            if (signal.ice) {
                if (peer.remoteDescription?.type) {
                    await peer.addIceCandidate(
                        new RTCIceCandidate(signal.ice)
                    );
                } else {
                    if (!pendingIceRef.current[fromId]) {
                        pendingIceRef.current[fromId] = [];
                    }

                    pendingIceRef.current[fromId].push(
                        signal.ice
                    );
                }
            }
        } catch (signalError) {
            console.error(
                "WebRTC signaling error:",
                signalError
            );

            if (mountedRef.current) {
                setError(
                    "Video connection mein problem aayi. Browser console check karein."
                );
            }
        }
    }, [
        createPeerConnection,
        flushPendingIce,
        sendSignal
    ]);

    // ==========================================
    // SOCKET.IO CONNECTION
    // ==========================================

    const connectToSocketServer = useCallback((cleanUsername) => {
        if (socketRef.current) {
            return;
        }

        const socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log(
                "Connected to socket server:",
                socket.id
            );

            setError("");

            socket.emit(
                "join-call",
                window.location.pathname,
                cleanUsername
            );
        });

        // WEBRTC SIGNAL
        socket.on("signal", handleSignal);

        // PARTICIPANT JOINED
        socket.on(
            "user-joined",
            async (id, clients = [], extraData) => {
                const peerIds = Array.isArray(clients)
                    ? clients
                    : [];

                // Joining participant receives existing user details.
                if (Array.isArray(extraData)) {
                    extraData.forEach((user) => {
                        if (user?.id) {
                            usernamesRef.current[user.id] =
                                user.username || "Participant";
                        }
                    });
                } else if (
                    id &&
                    typeof extraData === "string"
                ) {
                    // Existing participants receive new participant username.
                    usernamesRef.current[id] = extraData;
                }

                setVideos((currentVideos) =>
                    currentVideos.map((item) => ({
                        ...item,
                        username:
                            usernamesRef.current[item.socketId] ||
                            item.username ||
                            "Participant"
                    }))
                );

                peerIds.forEach((peerId) => {
                    if (
                        peerId &&
                        peerId !== socket.id
                    ) {
                        createPeerConnection(peerId);
                    }
                });

                // Joining user creates offers for existing participants.
                if (id === socket.id) {
                    for (const peerId of peerIds) {
                        if (
                            !peerId ||
                            peerId === socket.id
                        ) {
                            continue;
                        }

                        try {
                            const peer =
                                createPeerConnection(peerId);

                            if (
                                !peer ||
                                peer.signalingState !== "stable"
                            ) {
                                continue;
                            }

                            const offer =
                                await peer.createOffer();

                            await peer.setLocalDescription(offer);

                            sendSignal(peerId, {
                                sdp: peer.localDescription
                            });
                        } catch (offerError) {
                            console.error(
                                "Offer creation failed:",
                                offerError
                            );
                        }
                    }
                }
            }
        );

        // PARTICIPANT LEFT
        socket.on("user-left", (socketId) => {
            if (socketId) {
                removeRemoteVideo(socketId);
            }
        });

        // CHAT MESSAGE
        socket.on(
            "chat-message",
            (
                incomingMessage,
                sender,
                timestamp,
                senderSocketId
            ) => {
                if (senderSocketId === socket.id) {
                    return;
                }

                setMessages((currentMessages) => [
                    ...currentMessages,
                    {
                        text: String(incomingMessage ?? ""),
                        sender: sender || "Participant",
                        timestamp: timestamp || getTimestamp(),
                        isOwn: false
                    }
                ]);

                if (!showChatRef.current) {
                    setNewMessages((count) => count + 1);
                }
            }
        );

        socket.on("connect_error", (socketError) => {
            console.error(
                "Socket connection error:",
                socketError
            );

            if (mountedRef.current) {
                setError(
                    `Backend connect nahi hua. Check karein ki server ${SERVER_URL} par chal raha hai.`
                );
            }
        });

        socket.on("disconnect", (reason) => {
            console.warn(
                "Socket disconnected:",
                reason
            );
        });
    }, [
        handleSignal,
        createPeerConnection,
        sendSignal,
        removeRemoteVideo
    ]);

    // ==========================================
    // JOIN MEETING
    // ==========================================

    const connect = async (event) => {
        event.preventDefault();

        if (joiningRef.current) {
            return;
        }

        const cleanUsername = username.trim();

        if (!cleanUsername) {
            setError("Please enter your username.");
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setError(
                "Camera access unavailable. App ko localhost ya HTTPS par open karein."
            );
            return;
        }

        joiningRef.current = true;

        setError("");
        setIsConnecting(true);

        try {
            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

            localStreamRef.current = stream;

            setAudioEnabled(
                stream.getAudioTracks().some(
                    (track) => track.enabled
                )
            );

            setVideoEnabled(
                stream.getVideoTracks().some(
                    (track) => track.enabled
                )
            );

            if (lobbyVideoRef.current) {
                lobbyVideoRef.current.srcObject = stream;
                lobbyVideoRef.current.muted = true;

                await lobbyVideoRef.current
                    .play()
                    .catch(() => {});
            }

            setUsername(cleanUsername);
            setAskForUsername(false);

            connectToSocketServer(cleanUsername);
        } catch (mediaError) {
            console.error(
                "Camera/microphone error:",
                mediaError
            );

            setError(
                mediaError.name === "NotAllowedError"
                    ? "Camera/microphone permission allow karein."
                    : mediaError.name === "NotFoundError"
                    ? "Camera ya microphone device nahi mila."
                    : "Camera/microphone start nahi ho paya. Device permissions check karein."
            );

            localStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());

            localStreamRef.current = null;
        } finally {
            joiningRef.current = false;
            setIsConnecting(false);
        }
    };

    // ==========================================
    // ATTACH LOCAL VIDEO
    // ==========================================

    useEffect(() => {
        if (
            !askForUsername &&
            localVideoRef.current
        ) {
            const stream =
                screenStreamRef.current ||
                localStreamRef.current;

            if (stream) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;

                localVideoRef.current
                    .play()
                    .catch((playError) => {
                        console.warn(
                            "Local video playback error:",
                            playError
                        );
                    });
            }
        }
    }, [askForUsername, screen]);

    // ==========================================
    // MICROPHONE TOGGLE
    // ==========================================

    const toggleAudio = () => {
        const audioTracks =
            localStreamRef.current?.getAudioTracks() || [];

        if (audioTracks.length === 0) {
            setError("Microphone track available nahi hai.");
            return;
        }

        const nextEnabled = !audioEnabled;

        audioTracks.forEach((track) => {
            track.enabled = nextEnabled;
        });

        setAudioEnabled(nextEnabled);
        setError("");
    };

    // ==========================================
    // CAMERA TOGGLE
    // ==========================================

    const toggleVideo = () => {
        const videoTracks =
            localStreamRef.current?.getVideoTracks() || [];

        if (videoTracks.length === 0) {
            setError("Camera track available nahi hai.");
            return;
        }

        const nextEnabled = !videoEnabled;

        videoTracks.forEach((track) => {
            track.enabled = nextEnabled;
        });

        setVideoEnabled(nextEnabled);
        setError("");
    };

    // ==========================================
    // CHAT
    // ==========================================

    const sendChatMessage = (event) => {
        event.preventDefault();

        const cleanMessage = message.trim();

        if (!cleanMessage) {
            return;
        }

        const socket = socketRef.current;

        if (!socket?.connected) {
            setError("Chat server se connection nahi hai.");
            return;
        }

        socket.emit(
            "chat-message",
            cleanMessage,
            username
        );

        setMessages((currentMessages) => [
            ...currentMessages,
            {
                text: cleanMessage,
                sender: username,
                timestamp: getTimestamp(),
                isOwn: true
            }
        ]);

        setMessage("");
        setError("");
    };

    // ==========================================
    // SCREEN SHARING
    // ==========================================

    const stopScreenShare = useCallback(async () => {
        const displayStream = screenStreamRef.current;

        if (!displayStream) {
            return;
        }

        displayStream.getTracks().forEach((track) => {
            track.onended = null;
            track.stop();
        });

        screenStreamRef.current = null;

        const cameraTrack =
            localStreamRef.current?.getVideoTracks()[0];

        const peers = Object.values(
            peerConnectionsRef.current
        );

        if (cameraTrack) {
            await Promise.all(
                peers.map(async (peer) => {
                    if (peer.signalingState === "closed") {
                        return;
                    }

                    const sender = peer
                        .getSenders()
                        .find(
                            (item) =>
                                item.track?.kind === "video"
                        );

                    if (sender) {
                        try {
                            await sender.replaceTrack(cameraTrack);
                        } catch (replaceError) {
                            console.error(
                                "Camera track restoration failed:",
                                replaceError
                            );
                        }
                    }
                })
            );
        }

        if (
            localVideoRef.current &&
            localStreamRef.current
        ) {
            localVideoRef.current.srcObject =
                localStreamRef.current;

            localVideoRef.current
                .play()
                .catch(() => {});
        }

        setScreen(false);
    }, []);

    const handleScreenShare = async () => {
        if (screen) {
            await stopScreenShare();
            return;
        }

        if (!navigator.mediaDevices?.getDisplayMedia) {
            setError(
                "Screen sharing is browser mein supported nahi hai."
            );
            return;
        }

        try {
            const displayStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

            const displayTrack =
                displayStream.getVideoTracks()[0];

            if (!displayTrack) {
                displayStream.getTracks().forEach(
                    (track) => track.stop()
                );
                return;
            }

            screenStreamRef.current = displayStream;

            const peers = Object.values(
                peerConnectionsRef.current
            );

            await Promise.all(
                peers.map(async (peer) => {
                    if (peer.signalingState === "closed") {
                        return;
                    }

                    const sender = peer
                        .getSenders()
                        .find(
                            (item) =>
                                item.track?.kind === "video"
                        );

                    if (sender) {
                        await sender.replaceTrack(displayTrack);
                    }
                })
            );

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = displayStream;

                await localVideoRef.current
                    .play()
                    .catch(() => {});
            }

            displayTrack.onended = () => {
                stopScreenShare().catch(console.error);
            };

            setScreen(true);
            setError("");
        } catch (screenError) {
            console.error(
                "Screen sharing error:",
                screenError
            );

            if (screenError.name !== "NotAllowedError") {
                setError(
                    "Screen sharing start nahi ho saka."
                );
            }
        }
    };

    // ==========================================
    // CHAT SIDEBAR
    // ==========================================

    const toggleChat = () => {
        setShowChat((current) => {
            const nextValue = !current;

            showChatRef.current = nextValue;

            if (nextValue) {
                setNewMessages(0);
            }

            return nextValue;
        });
    };

    // ==========================================
    // END CALL
    // ==========================================

    const handleEndCall = useCallback(async () => {
        if (leavingRef.current) {
            return;
        }

        leavingRef.current = true;

        const socket = socketRef.current;

        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
        }

        Object.values(peerConnectionsRef.current).forEach(
            (peer) => {
                peer.ontrack = null;
                peer.onicecandidate = null;
                peer.onconnectionstatechange = null;
                peer.close();
            }
        );

        peerConnectionsRef.current = {};
        pendingIceRef.current = {};
        usernamesRef.current = {};

        [
            localStreamRef.current,
            screenStreamRef.current
        ].forEach((stream) => {
            stream?.getTracks().forEach((track) => {
                track.onended = null;
                track.stop();
            });
        });

        localStreamRef.current = null;
        screenStreamRef.current = null;

        if (lobbyVideoRef.current) {
            lobbyVideoRef.current.srcObject = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        setVideos([]);
        setMessages([]);

        setScreen(false);

        navigate("/home");
    }, [navigate]);

    // ==========================================
    // CLEANUP
    // ==========================================

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            socketRef.current?.removeAllListeners();
            socketRef.current?.disconnect();

            socketRef.current = null;

            Object.values(peerConnectionsRef.current).forEach(
                (peer) => {
                    peer.ontrack = null;
                    peer.onicecandidate = null;
                    peer.onconnectionstatechange = null;
                    peer.close();
                }
            );

            peerConnectionsRef.current = {};
            pendingIceRef.current = {};
            usernamesRef.current = {};

            [
                localStreamRef.current,
                screenStreamRef.current
            ].forEach((stream) => {
                stream?.getTracks().forEach((track) => {
                    track.onended = null;
                    track.stop();
                });
            });

            localStreamRef.current = null;
            screenStreamRef.current = null;
        };
    }, []);

    // ==========================================
    // JSX
    // ==========================================

    return (
        <main className="lobbyContainer">
            {/* USERNAME LOBBY */}

            {askForUsername ? (
                <section className="lobbyPanel">
                    <h1>Apna Zoom Web</h1>

                    <form
                        className="lobbyControls"
                        onSubmit={connect}
                    >
                        <input
                            className="lobbyInput"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            autoComplete="name"
                            required
                        />

                        <button
                            className="lobbyBtn"
                            type="submit"
                            disabled={isConnecting}
                        >
                            {isConnecting
                                ? "Connecting..."
                                : "Connect"}
                        </button>
                    </form>

                    {error && (
                        <p
                            className="lobbyError"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div className="videoWrapper">
                        <video
                            ref={lobbyVideoRef}
                            autoPlay
                            muted
                            playsInline
                        />
                    </div>
                </section>
            ) : (
                /* MEETING ROOM */

                <section className="meetingPanel">
                    <header className="meetingHeader">
                        <div>
                            <h2>Meeting Room</h2>
                            <span>
                                Signed in as {username}
                            </span>
                        </div>
                    </header>

                    {error && (
                        <p
                            className="lobbyError"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div
                        className={`meetingWorkspace ${
                            showChat ? "chatOpen" : ""
                        }`}
                    >
                        {/* VIDEO AREA */}

                        <div className="meetingVideoArea">
                            <div className="meetVideoContainer">
                                {/* LOCAL VIDEO */}

                                <div className="meetUserVideo">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                    />

                                    <span>
                                        {username} (You)
                                    </span>
                                </div>

                                {/* REMOTE VIDEOS */}

                                <div className="conferenceView">
                                    {videos.map((remoteVideo) => (
                                        <div
                                            className="meetingVideoTile"
                                            key={remoteVideo.socketId}
                                        >
                                            <video
                                                autoPlay
                                                playsInline
                                                ref={(element) => {
                                                    if (
                                                        element &&
                                                        remoteVideo.stream &&
                                                        element.srcObject !==
                                                            remoteVideo.stream
                                                    ) {
                                                        element.srcObject =
                                                            remoteVideo.stream;

                                                        element.play().catch(
                                                            (playError) => {
                                                                console.warn(
                                                                    "Remote video playback failed:",
                                                                    playError
                                                                );
                                                            }
                                                        );
                                                    }
                                                }}
                                            />

                                            <span>
                                                {remoteVideo.username ||
                                                    "Participant"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CONTROLS */}

                            <div className="buttonContainers">
                                <IconButton
                                    aria-label={
                                        videoEnabled
                                            ? "Turn camera off"
                                            : "Turn camera on"
                                    }
                                    onClick={toggleVideo}
                                    style={{ color: "white" }}
                                >
                                    {videoEnabled
                                        ? <Videocam />
                                        : <VideocamOffIcon />}
                                </IconButton>

                                <IconButton
                                    aria-label="Leave meeting"
                                    onClick={handleEndCall}
                                    style={{
                                        color: "white",
                                        background: "#e53935"
                                    }}
                                >
                                    <CallEnd />
                                </IconButton>

                                <IconButton
                                    aria-label={
                                        audioEnabled
                                            ? "Mute microphone"
                                            : "Unmute microphone"
                                    }
                                    onClick={toggleAudio}
                                    style={{ color: "white" }}
                                >
                                    {audioEnabled
                                        ? <Mic />
                                        : <MicOff />}
                                </IconButton>

                                <IconButton
                                    aria-label={
                                        screen
                                            ? "Stop screen sharing"
                                            : "Share screen"
                                    }
                                    onClick={handleScreenShare}
                                    style={{ color: "white" }}
                                >
                                    {screen
                                        ? <StopScreenShareIcon />
                                        : <ScreenShareIcon />}
                                </IconButton>

                                <Badge
                                    badgeContent={newMessages}
                                    max={999}
                                    color="error"
                                >
                                    <IconButton
                                        aria-label={
                                            showChat
                                                ? "Close chat"
                                                : "Open chat"
                                        }
                                        onClick={toggleChat}
                                        style={{ color: "white" }}
                                    >
                                        <ChatIcon />
                                    </IconButton>
                                </Badge>
                            </div>
                        </div>

                        {/* CHAT SIDEBAR */}

                        {showChat && (
                            <aside className="chatSidebar">
                                <div className="chatHeader">
                                    <h3>
                                        <ChatIcon />
                                        Chat
                                    </h3>

                                    <IconButton
                                        aria-label="Close chat"
                                        onClick={toggleChat}
                                        style={{ color: "white" }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </div>

                                <div
                                    className="chatMessages"
                                    aria-live="polite"
                                >
                                    {messages.length === 0 ? (
                                        <p className="noMessages">
                                            No messages yet.
                                        </p>
                                    ) : (
                                        messages.map((item, index) => (
                                            <div
                                                className={`chatMessage ${
                                                    item.isOwn
                                                        ? "ownMessage"
                                                        : ""
                                                }`}
                                                key={`${item.timestamp}-${index}`}
                                            >
                                                <div className="chatAvatar">
                                                    {(item.sender || "U")
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div className="chatMessageContent">
                                                    <div className="chatSender">
                                                        {item.sender}
                                                        {item.isOwn && " (You)"}
                                                    </div>

                                                    <div className="chatBubble">
                                                        {item.text}
                                                    </div>

                                                    <small className="chatTimestamp">
                                                        {item.timestamp}
                                                    </small>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form
                                    className="chatControls"
                                    onSubmit={sendChatMessage}
                                >
                                    <TextField
                                        value={message}
                                        onChange={(event) =>
                                            setMessage(event.target.value)
                                        }
                                        placeholder="Type a message..."
                                        size="small"
                                        fullWidth
                                        autoComplete="off"
                                    />

                                    <IconButton
                                        type="submit"
                                        aria-label="Send message"
                                        disabled={!message.trim()}
                                        style={{
                                            color: "white",
                                            background: "#9225c7"
                                        }}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                </form>
                            </aside>
                        )}
                    </div>
                </section>
            )}
        </main>
    );
}