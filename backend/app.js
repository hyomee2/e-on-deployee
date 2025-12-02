require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet"); // 보안 헤더 설정
const csrf = require("csurf"); // CSRF 보호
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const aiRecommendRoutes = require("./routes/aiRecommendRoutes");
const adminRouter = require("./routes/adminRouter");
// 반드시 전략 등록 전에 실행
require("./config/passport")(passport);
const SequelizeStore = require("connect-session-sequelize")(session.Store);

const { rawConnection: db, sequelize } = require("./database/db");
const app = express();

app.set("trust proxy", 1);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 보안 - 1) 안전한 헤더
app.use(helmet());

// 보안 - 2) CORS 설정
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);

// 보안 - 3) Body parser의 요청 사이즈 제한 (DoS 완화)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.js
const sessionStore = new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000, // 15분마다 만료 세션 정리
    expiration: 24 * 60 * 60 * 1000, // 세션 저장소 만료(1일)
    disableTouch: true, // ★ 매 요청마다 UPDATE 막기
});
sessionStore.sync();

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false, // 꼭 false
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        secure: false, // HTTPS면 true
        maxAge: 24 * 60 * 60 * 1000, // ★ 쿠키 만료(1일) - store.expiration과 맞추기
    },
    // rolling: false,           // 기본값이 false (명시해도 무방)
});
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// 보안 - 4) CSRF: 쿠키 대신 세션 사용
const csrfProtection = csrf();
app.use(csrfProtection);

// 프론트가 토큰 가져갈 수 있도록 노출(예: GET /csrf-token)
app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// ───────────────────────────────────────────────
// 인증 및 API 라우터 설정
app.use("/api/admin", adminRouter);
app.use("/api/auth", require("./routes/authRouter"));
app.use("/api/user", require("./routes/userRouter"));
app.use("/api/interests", require("./routes/interestRouter"));
app.use("/api/activity", require("./routes/activity"));
app.use("/api/notification", require("./routes/notificationRouter"));
app.use("/api/notifications", require("./routes/notificationRouter"));

app.use("/api/schoolSchedule", require("./routes/schoolScheduleRouter"));
app.use("/api/averageSchedule", require("./routes/averageScheduleRouter"));
app.use("/api/regions", require("./routes/regionRouter"));
app.use("/api/mySchool", require("./routes/mySchoolRouter"));
app.use("/boards", require("./routes/boardRoute"));

app.use("/api/ai", aiRecommendRoutes);
app.use("/api/recommendations", require("./routes/recommendations"));
app.use("/api/preferences", require("./routes/preferencesRoutes"));
app.use("/api/select", require("./routes/select"));
app.use("/api/time-recommendations", require("./routes/timeRecommendations"));
app.use("/api/challenges", require("./routes/challengeRouter"));
app.use("/api/participations", require("./routes/participationRouter"));
app.use("/api/attendances", require("./routes/attendanceRouter"));
app.use("/api/reviews", require("./routes/reviewRouter"));
app.use("/api/attachments", require("./routes/attachmentRouter"));
app.use("/api/visions", require("./routes/visionRouter"));
app.use("/api/admin/challenges", require("./routes/adminChallengeRouter"));

// CSRF 전용 에러 핸들러 (라우터들 아래, 일반 에러 핸들러 위)
app.use((err, req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") {
        return res.status(403).json({
            code: "EBADCSRFTOKEN",
            message: "Invalid CSRF token",
        });
    }
    return next(err);
});

// 일반 에러 핸들러 (마지막)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
});

app.use((req, res, next) => {
    if (req.originalUrl.includes("undefined")) {
        console.warn("🚨 WARNING: undefined URL 요청 감지됨:", req.originalUrl);
    }
    next();
});



module.exports = { app, sessionMiddleware };
