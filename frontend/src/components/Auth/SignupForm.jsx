import { useState } from "react";
import api from "../../api/axiosInstance";
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/Auth/SignupForm.module.css";
import { toast } from "react-toastify";

export default function SignupForm({ onFinish }) {
    const { signup } = useAuth();
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        type: "student",
        agreements: [],
        email: "",
        code: "",
        name: "",
        age: "",
        password: "",
        confirm: "",
    });
    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    console.log("API INSTANCE:", api);
    console.log("BASEURL:", api.defaults.baseURL);

    const next1 = async () => {
        await api.post("/auth/join/step1", { userType: data.type });
        setStep(2);
    };

    const next2 = async () => {
        if (data.agreements.length < 2) {
            setError("필수 약관에 동의해주세요.");
            return;
        }
        await api.post("/auth/join/step2", { agreements: data.agreements });
        setStep(3);
    };

    const sendCode = async () => {
        await api.post("/auth/join/email", { email: data.email });
        setMsg("인증번호가 발송되었습니다.");
        toast("인증번호를 요청했습니다.", {
            className: "my-toast",
            progressClassName: "custom-progress-bar",
        });
    };

    const finish = async (e) => {
        e.preventDefault();

        const passwordRegex =
            /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

        if (data.password !== data.confirm) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        if (!passwordRegex.test(data.password)) {
            setError(
                "비밀번호는 영문, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다."
            );
            return;
        }

        try {
            await signup({
                name: data.name,
                email: data.email,
                type: data.type,
                age: data.age,
                code: data.code,
                password: data.password,
                confirm: data.confirm,
                agreements: data.agreements,
            });
            setMsg("회원가입 완료!");
            onFinish();
        } catch (err) {
            setError(err.response?.data?.message || "회원가입 실패");
        }
    };

    return (
        <div className={styles.signupForm}>
            <div className={styles.steps}>
                {[1, 2, 3, 4].map((n) => (
                    <div
                        key={n}
                        className={`${styles.step} ${
                            step === n ? styles.active : ""
                        }`}>
                        {n}
                    </div>
                ))}
            </div>

            <hr className={styles.divider} />

            {step === 1 && (
                <>
                    <h3 className={styles.title}>E-ON 회원가입</h3>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>회원 유형</label>
                        <select
                            className={styles.input}
                            value={data.type}
                            onChange={(e) =>
                                setData({ ...data, type: e.target.value })
                            }>
                            <option value="student">학생</option>
                            <option value="parent">부모</option>
                            <option value="municipality">지자체</option>
                        </select>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className={styles.submitButton} onClick={next1}>
                            다음
                        </button>
                    </div>
                </>
            )}

            {step === 2 && (
                <>
                    <h3 className={styles.title}>E-ON 회원가입</h3>

                    {/* 전체 약관 동의 */}

                    <div className={styles.formGroup}>
                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                checked={
                                    data.agreements.includes("terms") &&
                                    data.agreements.includes("privacy") &&
                                    data.agreements.includes("marketing")
                                }
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    const all = [
                                        "terms",
                                        "privacy",
                                        "marketing",
                                    ];
                                    setData({
                                        ...data,
                                        agreements: checked ? all : [],
                                    });
                                }}
                            />
                            전체 약관에 동의합니다.
                        </label>
                    </div>

                    {/* 개별
                     약관 동의 */}
                    <div className={styles.termsBox}>
                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                value="terms"
                                checked={data.agreements.includes("terms")}
                                onChange={() => {
                                    const arr = data.agreements.includes(
                                        "terms"
                                    )
                                        ? data.agreements.filter(
                                              (x) => x !== "terms"
                                          )
                                        : [...data.agreements, "terms"];
                                    setData({ ...data, agreements: arr });
                                }}
                            />
                            [필수] 서비스 이용약관 동의{" "}
                            <a
                                href="/terms"
                                target="_blank"
                                className={styles.link}>
                                보기
                            </a>
                        </label>

                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                value="privacy"
                                checked={data.agreements.includes("privacy")}
                                onChange={() => {
                                    const arr = data.agreements.includes(
                                        "privacy"
                                    )
                                        ? data.agreements.filter(
                                              (x) => x !== "privacy"
                                          )
                                        : [...data.agreements, "privacy"];
                                    setData({ ...data, agreements: arr });
                                }}
                            />
                            [필수] 개인정보 수집 및 이용 동의{" "}
                            <a
                                href="/privacy"
                                target="_blank"
                                className={styles.link}>
                                보기
                            </a>
                        </label>

                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                value="marketing"
                                checked={data.agreements.includes("marketing")}
                                onChange={() => {
                                    const arr = data.agreements.includes(
                                        "marketing"
                                    )
                                        ? data.agreements.filter(
                                              (x) => x !== "marketing"
                                          )
                                        : [...data.agreements, "marketing"];
                                    setData({ ...data, agreements: arr });
                                }}
                            />
                            [선택] 마케팅 수신 동의{" "}
                            <a
                                href="/marketing"
                                target="_blank"
                                className={styles.link}>
                                보기
                            </a>
                        </label>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.buttonGroup}>
                        <button className={styles.submitButton} onClick={next2}>
                            다음
                        </button>
                    </div>
                </>
            )}

            {step === 3 && (
                <form onSubmit={finish}>
                    <h3 className={styles.title}>E-ON 회원가입</h3>
                    {error && <p className={styles.error}>{error}</p>}
                    {msg && <p className={styles.message}>{msg}</p>}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>이메일</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <input
                                type="email"
                                className={styles.input}
                                value={data.email}
                                onChange={(e) =>
                                    setData({ ...data, email: e.target.value })
                                }
                                required
                            />
                            <button
                                type="button"
                                className={styles.inlineBtn}
                                onClick={sendCode}>
                                인증요청
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>인증번호 입력</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={data.code}
                            onChange={(e) =>
                                setData({ ...data, code: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>이름</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={data.name}
                            onChange={(e) =>
                                setData({ ...data, name: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>나이</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={data.age}
                            onChange={(e) =>
                                setData({ ...data, age: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>비밀번호</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={data.password}
                            onChange={(e) =>
                                setData({ ...data, password: e.target.value })
                            }
                            required
                        />
                        <p className={styles.hintText}>
                            비밀번호는 영문, 숫자, 특수문자를 각각 최소 1개 이상
                            포함해야 합니다.
                        </p>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>비밀번호 확인</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={data.confirm}
                            onChange={(e) =>
                                setData({ ...data, confirm: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.submitButton}>
                            가입하기
                        </button>
                    </div>
                </form>
            )}

            {step === 4 && (
                <div>
                    <h3 className={styles.title}>E-ON 회원가입</h3>
                    <p className={styles.completeText}>
                        가입이 완료되었습니다. 환영합니다!
                    </p>
                    <div className={styles.buttonGroup}>
                        <button className={styles.submitButton}>
                            로그인하러 가기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
