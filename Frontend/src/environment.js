const IS_PROD = true;

const server = IS_PROD
    ? "https://zoom-videocall-4.onrender.com"
    : "http://localhost:8000";

export default server;