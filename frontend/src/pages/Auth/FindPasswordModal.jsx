import { useState, useEffect } from "react";
import axios from "../../api/axiosInstance";
import modalStyles from "../../styles/Auth/FindIdModal.module.css";
import timerStyles from "../../styles/Auth/EmailCodeForm.module.css";

export default function FindPasswordModal({ onClose }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [emailList, setEmailList] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [remainingTime, setRemainingTime] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetAllState = () => {
    setName("");
    setAge("");
    setStep(1);
    setCode("");
    setEmailList([]);
    setSelectedEmail("");
    setError("");
    setMessage("");
    setRemainingTime(300);
    setTimerActive(false);
    setCodeExpired(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    resetAllState();
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const res = await axios.post("/auth/find-id", { name, age });
      setEmailList(res.data.emails);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || "이메일을 불러올 수 없습니다.");
    }
  };

  const handleEmailSelect = async (e) => {
    const selected = emailList.find((item) => item.email === e.target.value);
    if (!selected) return;

    setSelectedEmail(selected.email);
    const provider = String(selected.provider || "local").toLowerCase().trim();

    if (provider === "local") {
      setStep(2);
      await sendCode(selected.email);
    } else {
      setStep(3);
    }
  };

  const sendCode = async (emailAddr) => {
    setError("");
    try {
      await axios.post("/auth/find-password/send-code-to-email", { email: emailAddr });
      setMessage("인증 코드가 전송되었습니다.");
      setRemainingTime(300);
      setTimerActive(true);
      setCodeExpired(false);
      setCode("");
    } catch (err) {
      setError("코드 전송 실패: " + (err.response?.data?.message || ""));
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!selectedEmail) {
      setError("이메일이 선택되지 않았습니다.");
      return;
    }
    try {
      await axios.post("/auth/find-password/verify-code", {
        email: selectedEmail,
        code,
      });
      setStep(4);
    } catch (err) {
      setError("인증 실패: " + (err.response?.data?.message || ""));
    }
  };

  const resetPassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      await axios.patch("/auth/find-password/reset", {
        newPassword,
        confirmPassword,
      });
    
      alert("비밀번호가 성공적으로 변경되었습니다.");
      handleClose();
    } catch (err) {
      setError("비밀번호 변경 실패: " + (err.response?.data?.message || ""));
    }
  };

  useEffect(() => {
    if (!timerActive) return;
    if (remainingTime <= 0) {
      setTimerActive(false);
      setCodeExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setRemainingTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, remainingTime]);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const getSelectedProvider = () => {
    const selected = emailList.find((item) => item.email === selectedEmail);
    return selected?.provider?.toLowerCase();
  };

  return (
    <div className={modalStyles.overlay} onClick={handleClose}>
      <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={modalStyles.closeButton} onClick={handleClose}>✕</button>

        {step === 1 && (
          <>
            <h2>비밀번호 찾기</h2>
            <div className={modalStyles.inputGroup}>
              <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={modalStyles.inputGroup}>
              <input type="number" placeholder="나이" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <button className={modalStyles.primaryButton} onClick={handleSubmit}>이메일 찾기</button>

            {emailList.length > 0 && (
              <>
                <p>해당 이름/나이로 등록된 이메일:</p>
                <select onChange={handleEmailSelect} value={selectedEmail}>
                  <option value="">이메일 선택</option>
                  {emailList.map(({ email, provider }, idx) => (
                    <option key={idx} value={email}>
                      {maskEmail(email)} {provider !== "local" ? `(${provider.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              </>
            )}

            {error && <p className={modalStyles.errorMessage}>{error}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <h2>이메일 인증</h2>
            <p>{selectedEmail}로 인증 코드가 전송되었습니다.</p>
            <div className={modalStyles.inputGroup}>
              <input
                type="text"
                placeholder="인증 코드 입력"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={codeExpired}
              />
            </div>
            {timerActive && <p className={timerStyles.timer}>남은 시간: {formatTime(remainingTime)}</p>}
            {codeExpired && <p className={modalStyles.errorMessage}>인증 시간이 만료되었습니다.</p>}
            <button
              className={modalStyles.primaryButton}
              onClick={verifyCode}
              disabled={!code || codeExpired}
            >
              확인
            </button>
            {codeExpired && (
              <button className={modalStyles.secondaryButton} onClick={() => sendCode(selectedEmail)}>
                인증 코드 다시 보내기
              </button>
            )}
            {error && <p className={modalStyles.errorMessage}>{error}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2>소셜 로그인 계정입니다</h2>
            <p>{selectedEmail}은 {getSelectedProvider()?.toUpperCase() || "소셜"} 계정입니다.</p>
            <p>해당 소셜 로그인 버튼을 이용해주세요.</p>
            {getSelectedProvider() === "kakao" && (
              <button
                className={modalStyles.kakaoButton}
                onClick={() => (window.location.href = "/api/auth/kakao")}
              >
                카카오 로그인
              </button>
            )}
            {getSelectedProvider() === "google" && (
              <button
                className={modalStyles.googleButton}
                onClick={() => (window.location.href = "/api/auth/google")}
              >
                구글 로그인
              </button>
            )}
            {getSelectedProvider() === "naver" && (
              <button
                className={modalStyles.naverButton}
                onClick={() => (window.location.href = "/api/auth/naver")}
              >
                네이버 로그인
              </button>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2>새 비밀번호 입력</h2>
            <div className={modalStyles.inputGroup}>
              <input
                type="password"
                placeholder="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className={modalStyles.inputGroup}>
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button className={modalStyles.primaryButton} onClick={resetPassword}>
              비밀번호 변경
            </button>
            {error && <p className={modalStyles.errorMessage}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const masked = local.length <= 2
    ? local[0] + "*".repeat(local.length - 1)
    : local.slice(0, 2) + "*".repeat(local.length - 2);
  return `${masked}@${domain}`;
}
