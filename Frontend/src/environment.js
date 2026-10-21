
let IS_PROD =true;



const server = IS_PROD ?
    "http://localhost:8000":
    "https://zoom-videocall-4.onrender.com"


export default server;