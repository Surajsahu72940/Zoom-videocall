import { Server } from "socket.io";

const connections = {};
const messages = {};
const timeOnline = {};
const usernames = {};
const userRooms = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://zoom-videocall-frontend.onrender.com"
        ],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"]
});

    io.on("connection", (socket) => {
        console.log("USER CONNECTED:", socket.id);

        // ==========================================
        // JOIN MEETING ROOM
        // ==========================================

        socket.on("join-call", (path, username) => {
            try {
                if (
                    typeof path !== "string" ||
                    !path.trim()
                ) {
                    return;
                }

                const room = path.trim();
                const previousRoom = userRooms[socket.id];

                // Prevent duplicate joining.
                if (
                    previousRoom === room &&
                    connections[room]?.includes(socket.id)
                ) {
                    return;
                }

                // Leave the previous room if necessary.
                if (previousRoom) {
                    removeUserFromRoom(previousRoom);
                }

                usernames[socket.id] =
                    typeof username === "string" &&
                    username.trim()
                        ? username.trim()
                        : "Participant";

                if (!connections[room]) {
                    connections[room] = [];
                }

                if (!messages[room]) {
                    messages[room] = [];
                }

                // Existing participants before the new user joins.
                const existingUsers = connections[room].map(
                    (id) => ({
                        id,
                        username:
                            usernames[id] || "Participant"
                    })
                );

                connections[room].push(socket.id);
                userRooms[socket.id] = room;
                timeOnline[socket.id] = Date.now();

                socket.join(room);

                // Notify existing participants about the new user.
                existingUsers.forEach((user) => {
                    io.to(user.id).emit(
                        "user-joined",
                        socket.id,
                        [socket.id],
                        usernames[socket.id]
                    );
                });

                // Send existing participants to the joining user.
                socket.emit(
                    "user-joined",
                    socket.id,
                    existingUsers.map((user) => user.id),
                    existingUsers
                );

                // Send existing chat history to the joining user.
                messages[room].forEach((item) => {
                    socket.emit(
                        "chat-message",
                        item.data,
                        item.sender,
                        item.timestamp,
                        item.socketId
                    );
                });

                console.log(
                    `USER JOINED: ${usernames[socket.id]} | ROOM: ${room}`
                );
            } catch (error) {
                console.error("JOIN CALL ERROR:", error);
            }
        });

        // ==========================================
        // WEBRTC SIGNALING
        // ==========================================

        socket.on("signal", (toId, message) => {
            const room = userRooms[socket.id];

            if (
                !room ||
                !toId ||
                !message ||
                !connections[room]?.includes(socket.id) ||
                !connections[room]?.includes(toId)
            ) {
                return;
            }

            // Forward the offer, answer, or ICE candidate.
            io.to(toId).emit(
                "signal",
                socket.id,
                message
            );
        });

        // ==========================================
        // GROUP CHAT
        // ==========================================

        socket.on("chat-message", (data) => {
            const room = userRooms[socket.id];

            if (
                !room ||
                !connections[room]?.includes(socket.id) ||
                typeof data !== "string" ||
                !data.trim()
            ) {
                return;
            }

            const newMessage = {
                data: data.trim(),
                sender:
                    usernames[socket.id] || "Participant",
                socketId: socket.id,
                timestamp: new Date().toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
            };

            messages[room].push(newMessage);

            // Keep the most recent 100 messages.
            if (messages[room].length > 100) {
                messages[room].shift();
            }

            // Broadcast to everyone, including the sender.
            io.to(room).emit(
                "chat-message",
                newMessage.data,
                newMessage.sender,
                newMessage.timestamp,
                newMessage.socketId
            );
        });

        // ==========================================
        // REMOVE USER FROM ROOM
        // ==========================================

        function removeUserFromRoom(room) {
            const participants = connections[room];

            if (!participants) {
                return;
            }

            const index = participants.indexOf(socket.id);

            if (index !== -1) {
                participants.splice(index, 1);
            }

            socket.leave(room);

            // Tell remaining participants to remove this video.
            participants.forEach((id) => {
                io.to(id).emit("user-left", socket.id);
            });

            if (participants.length === 0) {
                delete connections[room];
                delete messages[room];
            }

            if (userRooms[socket.id] === room) {
                delete userRooms[socket.id];
            }
        }

        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on("disconnect", (reason) => {
            const startTime = timeOnline[socket.id];

            if (startTime) {
                const duration = Math.round(
                    (Date.now() - startTime) / 1000
                );

                console.log(
                    `Online duration: ${duration} seconds`
                );
            }

            const room = userRooms[socket.id];

            if (room) {
                removeUserFromRoom(room);
            }

            delete userRooms[socket.id];
            delete timeOnline[socket.id];
            delete usernames[socket.id];

            console.log(
                "USER DISCONNECTED:",
                socket.id,
                reason
            );
        });
    });

    console.log("Socket.IO server initialized.");

    return io;
};

export default connectToSocket;