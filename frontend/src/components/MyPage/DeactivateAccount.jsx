import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/MyPage/MyInfo.module.css";
import api from "../../api/axiosInstance";
import ConfirmModal from "../Common/ConfirmModal";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-toastify";

const DeactivateAccount = () => {
    const { user, logout } = useAuth();

    // 모달 상태 관리
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);

    // 로컬/소셜 분기 인증 상태 관리
    const [verifyPassword, setVerifyPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [code, setCode] = useState(""); // 소셜 전용
    const [codeRequested, setCodeRequested] = useState(false); // 소셜 전용

    const [action, setAction] = useState("deactivate"); // deactivate | delete
    const [message, setMessage] = useState({ type: "", text: "" });
    const navigate = useNavigate();
    const isSocial = ["kakao", "naver", "google"].includes(
        user?.provider || ""
    );

    // [로컬] 현재 비밀번호 검증
    const handleVerifyPassword = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });

        if (!verifyPassword) {
            setMessage({ type: "error", text: "비밀번호를 입력해주세요." });
            return;
        }

        try {
            const res = await api.post("/api/user/verify-password", {
                password: verifyPassword,
            });

            if (res.data.success) {
                setCurrentPassword(verifyPassword);
                setVerifyPassword("");
                setStep(2);
            }
        } catch (err) {
            setMessage({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "비밀번호가 일치하지 않습니다.",
            });
        }
    };

    // [소셜] 이메일 인증 코드 검증
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/api/user/verify-code", { code });
            if (res.data.success) {
                toast(res.data.message, {
                    icon: "✅",
                    className: "my-toast",
                    progressClassName: "custom-progress-bar",
                });
                setStep(2);
            }
        } catch (err) {
            setMessage({
                type: "error",
                text: err.response?.data?.message || "인증에 실패했습니다.",
            });
        }
    };

    // [소셜] 회원정보 수정용 인증코드 요청
    const handleRequestCode = async () => {
        setMessage({ type: "", text: "" });
        try {
            await api.post("/api/user/me/profile-verify/request", {});
            setCodeRequested(true);
            toast("인증 코드를 이메일로 전송했어요. 5분 내에 입력해주세요.", {
                icon: "✉️",
                className: "my-toast",
                progressClassName: "custom-progress-bar",
            });
        } catch (err) {
            setMessage({
                type: "error",
                text:
                    err.response?.data?.message || "코드 요청에 실패했습니다.",
            });
        }
    };

    const handlePreSubmit = (e) => {
        e.preventDefault();
        setOpen(true); // 모달 열기
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });

        try {
            // ✅ 소셜/로컬 분기: payload 구성
            const payload = isSocial
                ? code
                    ? { code }
                    : null
                : currentPassword
                ? { currentPassword }
                : null;

            if (!payload) {
                setMessage({
                    type: "error",
                    text: isSocial
                        ? "이메일 인증 코드를 입력하세요."
                        : "현재 비밀번호를 입력하세요.",
                });
                return;
            }

            if (action === "deactivate") {
                const res = await api.patch("/api/user/me/deactivate", payload);
                setMessage({ type: "success", text: res.data.message });
            } else {
                const res = await api.delete("/api/user/me", { data: payload });
                setMessage({ type: "success", text: res.data.message });
            }

            // 성공 후 로그아웃 및 홈 이동
            await logout();
            navigate("/");
        } catch (err) {
            setMessage({
                type: "error",
                text: err.response?.data?.message || "처리에 실패했습니다.",
            });
        }
    };

    return (
        <div className={styles.myInfoContainer}>
            {message.text && (
                <p
                    className={
                        message.type === "error"
                            ? styles.errorMessage
                            : styles.successMessage
                    }>
                    {message.text}
                </p>
            )}

            {step === 1 && (
                <form
                    onSubmit={
                        isSocial ? handleVerifyCode : handleVerifyPassword
                    }
                    className={styles.form}>
                    <h3 className={styles.sectionTitle}>
                        계정 탈퇴 / 비활성화
                    </h3>
                    {!isSocial ? (
                        <div className={styles.formGroup}>
                            <label>현재 비밀번호 입력</label>
                            <input
                                className={styles.input}
                                type="password"
                                value={verifyPassword}
                                onChange={(e) =>
                                    setVerifyPassword(e.target.value)
                                }
                            />
                        </div>
                    ) : (
                        <>
                            <div className={styles.formGroup}>
                                <label>이메일 인증 (소셜 계정)</label>
                                <div className={styles.emailAuth}>
                                    <input
                                        className={styles.input2}
                                        placeholder="6자리 코드"
                                        value={code}
                                        onChange={(e) =>
                                            setCode(e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={handleRequestCode}
                                        disabled={codeRequested}>
                                        {codeRequested
                                            ? "코드 재요청"
                                            : "인증코드 받기"}
                                    </button>
                                </div>
                                <small>코드는 5분간 유효합니다.</small>
                            </div>
                        </>
                    )}

                    <button type="submit" className={styles.submitButton}>
                        확인
                    </button>
                </form>
            )}

            {/* 2단계: 탈퇴, 비활성화 단계 */}
            {step === 2 && (
                <form onSubmit={handlePreSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <h3 className={styles.sectionTitle}>처리 선택</h3>
                        <div  className={styles.deactiveSelect}>
                            <label>
                                <input
                                    type="radio"
                                    name="action"
                                    value="deactivate"
                                    checked={action === "deactivate"}
                                    onChange={() => setAction("deactivate")}
                                />
                                비활성화
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="action"
                                    value="delete"
                                    checked={action === "delete"}
                                    onChange={() => setAction("delete")}
                                />
                                탈퇴
                            </label>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitButton}>
                        {action === "deactivate"
                            ? "계정 비활성화"
                            : "회원 탈퇴"}
                    </button>
                    <ConfirmModal
                        open={open}
                        title={
                            action === "deactivate"
                                ? "정말 계정을 비활성화하시겠습니까?"
                                : "정말 탈퇴하시겠습니까?"
                        }
                        message="이 작업은 되돌릴 수 없습니다."
                        onConfirm={async () => {
                            await handleSubmit(new Event("submit")); // 가짜 submit 이벤트 전달
                            setOpen(false);
                            toast.success("삭제 완료!", {
                                className: "my-toast",
                                progressClassName: "custom-progress-bar",
                            });
                        }}
                        onCancel={() => setOpen(false)}
                    />
                </form>
            )}
        </div>
    );
};

export default DeactivateAccount;
