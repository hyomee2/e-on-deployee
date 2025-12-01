// backend/controllers/user.js
const bcrypt = require("bcrypt");
const db = require("../models");
const User = db.User;
const BoardRequest = db.BoardRequest;
const { Op } = require("sequelize");
const { EmailCode } = db;
const transporter = require("../config/mail");

/**
 * [GET] /api/user/me
 *   - 내 정보 조회
 */
exports.getMyInfo = async (req, res, next) => {
    try {
        if (!req.user) {
            return res
                .status(401)
                .json({ success: false, message: "로그인이 필요합니다." });
        }
        const me = await User.findByPk(req.user.user_id, {
            attributes: { exclude: ["pw", "refresh_token"] },
        });
        if (!me) {
            return res
                .status(404)
                .json({ success: false, message: "유저를 찾을 수 없습니다." });
        }
        res.json({ success: true, user: me });
    } catch (err) {
        return null;
    }
};

/**
 * [PUT] /api/user/me
 * Body: { name, age, emailNotification, currentPassword }
 *   - 내 정보 업데이트
 *   - beforesave 훅 때문에 update 대신 save 사용
 */
exports.updateMyInfo = async (req, res, next) => {
    const { name, age, emailNotification, currentPassword, email, code } =
        req.body;

    // 이메일은 여기서 못 바꿈 (이 로직은 일반 필드만)
    if (email) {
        return res
            .status(400)
            .json({ message: "이메일은 별도 절차로 변경하세요." });
    }

    const nameRegex = /^[가-힣a-zA-Z]{2,10}$/;
    if (name && !nameRegex.test(name)) {
        return res
            .status(400)
            .json({ message: "이름은 2~10자 한글 또는 영문만 가능합니다." });
    }

    try {
        const user = await User.scope("withPassword").findByPk(
            req.user.user_id
        );
        if (!user)
            return res
                .status(404)
                .json({ message: "사용자를 찾을 수 없습니다." });

        // 인증 분기
        if (user.provider === "local") {
            // 로컬: 비밀번호로 인증
            if (!currentPassword) {
                return res
                    .status(400)
                    .json({ message: "현재 비밀번호를 입력해주세요." });
            }
            const match = await bcrypt.compare(
                currentPassword,
                user.password || ""
            );
            if (!match) {
                return res
                    .status(400)
                    .json({ message: "현재 비밀번호가 일치하지 않습니다." });
            }
        } else {
            // 소셜: 이메일 코드로 인증
            if (!code) {
                return res
                    .status(400)
                    .json({ message: "이메일 인증 코드가 필요합니다." });
            }
            const emailCode = await EmailCode.findOne({
                where: { email: user.email, purpose: "profile_update" },
                order: [["createdAt", "DESC"]],
            });
            if (!emailCode) {
                return res
                    .status(400)
                    .json({ message: "인증 코드를 먼저 발급받으세요." });
            }
            if (new Date(emailCode.expiresAt).getTime() < Date.now()) {
                return res
                    .status(400)
                    .json({ message: "인증 코드가 만료되었습니다." });
            }
            if (emailCode.code !== code) {
                return res
                    .status(400)
                    .json({ message: "인증 코드가 올바르지 않습니다." });
            }
            try {
                await emailCode.destroy();
            } catch (_) {}
        }

        // 업데이트 가능한 일반 필드만 처리
        const updatedData = {};
        if (name) updatedData.name = name;
        if (age !== undefined) updatedData.age = age;
        if (emailNotification !== undefined)
            updatedData.email_notification = !!emailNotification;

        Object.assign(user, updatedData);
        await user.save();

        return res.json({
            success: true,
            message: "회원 정보가 수정되었습니다.",
        });
    } catch (err) {
        console.error("[❌ 서버 오류]", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};

/**
 * [POST] /api/user/verify-password
 * Body: { password }
 *   - 현재 비밀번호 검증만 수행
 */
exports.verifyPassword = async (req, res, next) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "비밀번호를 입력해주세요." });
    }

    try {
        const user = await User.scope("withPassword").findByPk(
            req.user.user_id
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "사용자를 찾을 수 없습니다." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res
                .status(400)
                .json({ message: "비밀번호가 일치하지 않습니다." });
        }

        return res.json({ success: true, message: "비밀번호 확인 완료" });
    } catch (err) {
        console.error("[❌ 비밀번호 확인 오류]", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};

/**
 * [PUT] /api/user/me/password
 * Body: { currentPassword, newPassword }
 *   - 비밀번호 변경
 */
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "필수 입력값 누락" });
    }

    const user = await User.scope("withPassword").findByPk(req.user.user_id);
    console.log("User:", user.password);
    if (!user || !user.password) {
        return res
            .status(404)
            .json({ message: "사용자 정보 없음 또는 비밀번호 설정 안됨" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password); // 여기서 오류났던 것
    if (!isMatch) {
        return res
            .status(403)
            .json({ message: "현재 비밀번호가 일치하지 않습니다." });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "비밀번호가 변경되었습니다." });
};

/**
 * [DELETE] /api/user/me
 *   - 계정 탈퇴(soft-delete)
 */
exports.deactivateAccount = async (req, res, next) => {
    try {
        await User.update(
            { state_code: "inactive", deactivatedAt: new Date() },
            { where: { user_id: req.user.user_id } }
        );
        req.logout(() => {}); // 세션 종료
        res.json({ success: true, message: "계정이 비활성화되었습니다." });
    } catch (err) {
        next(err);
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        await User.destroy({ where: { user_id: req.user.user_id } });
        req.logout(() => {}); // 세션 종료
        res.json({ success: true, message: "계정이 탈퇴되었습니다." });
        // console.log("탈퇴 완료ㅠㅠ");
    } catch (err) {
        next(err);
    }
};

//게시판 개설 신청 확인
exports.getMyBoardRequests = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const requests = await BoardRequest.findAll({
            where: { user_id: user_id },
            order: [["request_date", "DESC"]],
        });
        res.json(requests);
    } catch (error) {
        console.error("게시판 요청 조회 실패:", error);
        res.status(500).json({ message: "서버 오류" });
    }
};

// 사용자 계정 상태 조회
exports.getAllUserState = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                "user_id",
                "name",
                "age",
                "email",
                "type",
                "state_code",
                // "createdAt",
                // "deactivatedAt",
            ],
            order: [["user_id", "ASC"]],
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("사용자 상태 조회 실패:", error);
        res.status(500).json({ message: "서버 오류" });
    }
};

// 사용자 계정 상태 변경
exports.updateUserState = async (req, res) => {
    const isAdmin = req.user?.type === "admin";

    if (!isAdmin) {
        return res.status(403).json({ error: "관리자 권한이 필요합니다." });
    }

    const { user_id, state_code } = req.body;
    if (!user_id || !state_code) {
        return res
            .status(400)
            .json({ error: "user_id와 state_code는 필수입니다." });
    }

    try {
        const user = await User.findByPk(user_id);
        if (!user) {
            return res
                .status(404)
                .json({ error: "사용자를 찾을 수 없습니다." });
        }

        user.state_code = state_code;
        await user.save();

        res.status(200).json({ message: "사용자 상태가 업데이트되었습니다." });
    } catch (err) {
        res.status(500).json({
            error: "사용자 상태 업데이트 중 오류가 발생했습니다.",
        });
        console.error("사용자 상태 업데이트 오류:", err);
    }
};

// [POST] /api/user/me/profile-verify/request
// Body: {}  (소셜 계정이 회원정보 수정 전에 메일 코드 받기)
exports.requestProfileUpdateCode = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id);
        if (!user)
            return res
                .status(404)
                .json({ message: "사용자를 찾을 수 없습니다." });

        if (user.provider === "local") {
            return res
                .status(400)
                .json({ message: "로컬 계정은 비밀번호 확인으로 인증하세요." });
        }
        if (!user.email) {
            return res
                .status(400)
                .json({
                    message: "계정에 이메일이 없습니다. 관리자에게 문의하세요.",
                });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

        await EmailCode.create({
            email: user.email,
            code,
            purpose: "profile_update",
            expiresAt,
        });

        await transporter.sendMail({
            to: user.email,
            subject: "[E-ON] 회원정보 수정 인증 코드",
            text: `인증 코드: ${code} (유효기간 5분)`,
        });

        return res.json({
            success: true,
            message: "인증 코드를 전송했습니다.",
        });
    } catch (err) {
        console.error("requestProfileUpdateCode error:", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};

/**
 * [POST] /api/user/verify-code
 * Body: { code }
 *   - 소셜 계정 이메일 인증 코드 검증
 */
exports.verifyCode = async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "인증 코드를 입력해주세요." });
    }

    try {
        const user = await User.findByPk(req.user.user_id);
        if (!user) {
            return res
                .status(404)
                .json({ message: "사용자를 찾을 수 없습니다." });
        }

        if (user.provider === "local") {
            return res
                .status(400)
                .json({ message: "로컬 계정은 비밀번호로 인증하세요." });
        }

        const emailCode = await EmailCode.findOne({
            where: { email: user.email, purpose: "profile_update" },
            order: [["createdAt", "DESC"]],
        });

        if (!emailCode) {
            return res
                .status(400)
                .json({ message: "인증 코드를 먼저 발급받으세요." });
        }

        if (new Date(emailCode.expiresAt).getTime() < Date.now()) {
            return res
                .status(400)
                .json({ message: "인증 코드가 만료되었습니다." });
        }

        if (emailCode.code !== code) {
            return res
                .status(400)
                .json({ message: "인증 코드가 올바르지 않습니다." });
        }

        // 코드 검증 성공 → 한 번 쓰면 삭제
        try {
            await emailCode.destroy();
        } catch (_) {}

        return res.json({ success: true, message: "인증이 완료되었습니다." });
    } catch (err) {
        console.error("verifyCode error:", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};
