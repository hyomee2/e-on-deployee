const cron = require("node-cron");
const axios = require("axios");

const { sequelize, AverageAcademicSchedule } = require("../models");

const TIMEZONE = "Asia/Seoul";
const TARGET_URL = "/api/averageSchedule/generate";

// 테이블 초기화(Truncate) 함수
async function truncateAverageSchedules() {
    await AverageAcademicSchedule.destroy({
        where: {},
        truncate: true, // TRUNCATE
        cascade: true, // FK 있으면 CASCADE
        restartIdentity: true, // PK 리셋
    });
}

async function runJob(label) {
    if (!CRON_ENABLED) {
        console.log(`[cron] skipped (CRON_ENABLED=false)`);
        return;
    }

    console.log(`[cron] ${label} 실행: ${new Date().toISOString()}`);

    try {
        await sequelize.authenticate(); // DB 연결 확인

        // 1) 기존 데이터 싹 비우기
        await truncateAverageSchedules();
        console.log("[cron] truncate done");

        // 2) 새로 생성 트리거
        const res = await axios.post(TARGET_URL);
        console.log("[cron] POST success", res.status);
    } catch (err) {
        console.error("[cron] failed", err.response?.status, err.message);
    }
}

function startAverageScheduleJob() {
    // 2월 28일 00:00
    cron.schedule("0 0 0 28 2 *", () => runJob("2월 28일"), {
        timezone: TIMEZONE,
    });

    // 8월 31일 00:00
    cron.schedule("0 0 0 31 8 *", () => runJob("8월 31일"), {
        timezone: TIMEZONE,
    });

    console.log("[cron] averageSchedule jobs scheduled for 2/28 and 8/31");
}

module.exports = { startAverageScheduleJob };
