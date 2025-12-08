import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../api/axiosInstance";

export const AuthContext = createContext();

// 마이페이지 리다이렉션 문제 해결
// AuthContext에서 user === undefined 상태랑 loading을 구분해서 제공
function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); //
    const [loading, setLoading] = useState(true);
    const [bannedUntil, setBannedUntil] = useState(null);

    const signup = async ({
        name,
        email,
        age,
        code,
        password,
        confirm,
        type,
        agreements,
    }) => {
        try {
            // console.log("📦 signup axios 요청 보냄");
            const res = await api.post("/auth/join/step3", {
                name,
                email,
                age,
                code,
                password,
                confirm,
                type,
                agreements,
                state_code: "active",
            });
            // console.log("✅ signup axios 성공", res.data);
            setUser(res.data.user);

            localStorage.setItem("user", JSON.stringify(res.data.user));
            toast(`${res.data.user.name}님, 회원가입이 완료되었습니다!`, {
                icon: "💜",
                style: {
                    background: "#f7f8fc", // 연보라 배경
                    color: "#2d2d2d",
                    borderLeft: "4px solid #b37bd6", // 포인트 보라
                    fontWeight: "bold",
                },
                progressClassName: "custom-progress-bar",
            });

            return res.data;
        } catch (err) {
            console.error("❌ signup axios 에러", err);
            throw err;
        }
    };

    const login = async ({ email, password }) => {
        // console.log('🔍 로그인 요청 발생! 이메일:', email, '비번:', password);
        const res = await api.post("/auth/login", { email, password });
        console.log('🔍 로그인 요청 발생! 이메일:', email, '비번:', password);
        console.log("💬 로그인 응답:", res.data);
        console.log("🐛 user:", res.data.user);  
        setUser(res.data.user);
        console.log("🔥 login 실행됨: ", email, password);

        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast(`${res.data.user.name}님, 환영합니다!`, {
            icon: "💜",
            style: {
                background: "#f7f8fc", // 연보라 배경
                color: "#2d2d2d",
                borderLeft: "4px solid #b37bd6", // 포인트 보라
                fontWeight: "bold",
            },
            progressClassName: "custom-progress-bar",
        });

        return res.data;
    };

    const logout = async () => {
        await api.post("/auth/logout");
        setUser(null);

        localStorage.removeItem("user");
        toast("로그아웃 되었습니다.", {
            icon: "💜",
            style: {
                background: "#f7f8fc", // 연보라 배경
                color: "#2d2d2d", // 텍스트 보라
                borderLeft: "4px solid #b37bd6", // 포인트 보라
                fontWeight: "bold",
            },
            progressClassName: "custom-progress-bar",
        });
    };

    // useEffect → 변경 필요
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get("/user/me"); // ✅ 변경된 경로
                setUser(res.data.user);

                // ✅ localStorage에 저장
                localStorage.setItem("user", JSON.stringify(res.data.user));
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, []);

    // 1. 403(정지) 이벤트 수신
    useEffect(() => {
        function listener(e) {
            setBannedUntil(e.detail.bannedUntil);   // 날짜 문자열 또는 null
        }
        window.addEventListener("ban-update", listener);
        return () => window.removeEventListener("ban-update", listener);
    }, []);

    // 2. 정지 만료 자동 해제
    useEffect(() => {
        if (!bannedUntil) return;
        const timer = setInterval(() => {
            if (new Date(bannedUntil) <= new Date()) {
            setBannedUntil(null);
            }
        }, 60 * 1000);           // 1분마다 체크
        return () => clearInterval(timer);
    }, [bannedUntil]);

    const isBanned = bannedUntil && new Date(bannedUntil) > new Date();

    return (
        <AuthContext.Provider
            value={{ user, loading, signup, login, logout, setUser, bannedUntil, isBanned }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
