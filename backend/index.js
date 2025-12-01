// backend/index.js
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

// app.js는 { app, sessionMiddleware } 형태로 export 되어 있어야 함
const { app, sessionMiddleware } = require("./app");
const { init } = require("./services/notificationService");

const PORT = process.env.PORT || 4000;

// 1) HTTP 서버 래핑
const server = http.createServer(app);

// 2) Socket.IO 초기화 (프론트 주소 허용)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// 3) 세션 공유 (app.js에서 만든 express-session 인스턴스 재사용)
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

// 4) 연결 시 유저 고유 방으로 join
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

// Cron Job 
const { startAverageScheduleJob } = require("./scripts/averageScheduleCron");
startAverageScheduleJob();
