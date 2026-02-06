"use strict";

const db   = require("../models");
const User = db.User;

// 1. 정지 생성 (또는 덮어쓰기)
// POST /admin/ban
exports.banUser = async (req, res) => {
  try {
    const { user_id, duration_hours = 0 } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id가 필요합니다." });

    const target = await User.findByPk(user_id);
    if (!target) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    const until =
      duration_hours > 0
        ? new Date(Date.now() + duration_hours * 3600 * 1000)
        : new Date("9999-12-31 23:59:59"); // 영구

    await target.update({ banned_until: until });

    res.json({
      message: `${user_id}번 사용자를 ${until} 까지 정지했습니다.`,
      banned_until: until,
    });
  } catch (err) {
    console.error("banUser ▶", err);
    res.status(500).json({ message: "정지 처리 중 오류" });
  }
};

//2. 정지 해제/연장
//PATCH /admin/ban/:user_id
exports.unbanOrExtend = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { action = "unban", duration_hours = 0 } = req.body;

    const target = await User.findByPk(user_id);
    if (!target) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    // ── 연장 ──────────────────────────
    if (action === "extend") {
      if (!duration_hours)
        return res.status(400).json({ message: "duration_hours 필요" });

      const baseTime =
        target.banned_until && new Date(target.banned_until) > Date.now()
          ? new Date(target.banned_until)
          : new Date();

      const newUntil = new Date(
        baseTime.getTime() + duration_hours * 3600 * 1000
      );

      await target.update({ banned_until: newUntil });

      return res.json({
        message: `정지를 ${newUntil} 까지 연장했습니다.`,
        banned_until: newUntil,
      });
    }

    // ── 해제 (기본) ─────────────────────
    await target.update({ banned_until: null });

    res.json({ message: "정지 해제 완료", banned_until: null });
  } catch (err) {
    console.error("unbanOrExtend ▶", err);
    res.status(500).json({ message: "조치 처리 중 오류" });
  }
};
