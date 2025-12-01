// server.js
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { app, sessionMiddleware } = require("./app"); // 방금 export한 것
const { init } = require("./services/notificationService");

const PORT = process.env.PORT || 4000;

// 1) http 서버 래핑
const server = http.createServer(app);

// 2) socket.io 생성 (CORS는 프론트 주소와 동일하게)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// 3) 세션 공유
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

// 4) 유저-방 join
io.on("connection", (socket) => {
  const userId = socket.request?.session?.passport?.user;
  if (!userId) return socket.disconnect();
  socket.join(`user:${userId}`);
});

// 5) 알림 서비스에 소켓 주입
init(io);

// 6) 서버 시작
server.listen(PORT, () => {
  console.log(`✅ Server & Socket.IO listening on :${PORT}`);
});
