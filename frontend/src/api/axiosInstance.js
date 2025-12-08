import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
    baseURL: "/api",
    withCredentials: true,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

/** ─────────────────────────────────────────────
 * CSRF 토큰 관리 (메모리 캐시)
 * - /csrf-token에서 받아서 캐싱
 * - 필요시(403 발생 등) 재발급
 * ───────────────────────────────────────────── */
let csrfToken = null;
let csrfFetching = null; // 동시 요청 방지

async function fetchCsrfToken() {
    if (csrfFetching) return csrfFetching; // 이미 진행 중이면 그 Promise 재사용
    csrfFetching = axiosInstance
        .get("/csrf-token", {
            // 토큰 요청에는 굳이 CSRF 헤더가 필요 없음
            headers: { "X-CSRF-Token": "" },
        })
        .then((res) => {
            csrfToken = res.data?.csrfToken ?? null;
            return csrfToken;
        })
        .finally(() => {
            csrfFetching = null;
        });
    return csrfFetching;
}

// 초기 렌더 시점에 미리 받아두고 싶으면(선택)
// fetchCsrfToken().catch(() => { /* 무시 가능 */ });

/** ─────────────────────────────────────────────
 * 요청 인터셉터
 * - FormData면 Content-Type 제거 (boundary 자동)
 * - 변경 메서드에만 X-CSRF-Token 자동 첨부
 * ───────────────────────────────────────────── */
axiosInstance.interceptors.request.use(async (config) => {
    // FormData 전송이면 Content-Type 제거
    if (config.data instanceof FormData) {
        if (config.headers) delete config.headers["Content-Type"];
    }

    // 안전하지 않은 메서드에만 CSRF 토큰 부착
    const method = (config.method || "get").toLowerCase();
    const needsCsrf = ["post", "put", "patch", "delete"].includes(method);

    if (needsCsrf) {
        // 토큰 없으면 한 번 가져오기
        if (!csrfToken) {
            try {
                await fetchCsrfToken();
            } catch {
                // 토큰 못 받아도 요청은 보내보되, 서버에서 403 주면 아래 응답 인터셉터가 처리
            }
        }
        // 헤더에 세팅
        if (csrfToken) {
            config.headers = config.headers || {};
            config.headers["X-CSRF-Token"] = csrfToken;
        }
    }

    return config;
});

/** ─────────────────────────────────────────────
 * 응답 인터셉터
 * - 403(EBADCSRFTOKEN/invalid csrf token)이면 토큰 재발급 후 1회 재시도
 * - 기존 “정지” 메시지 처리 유지
 * ───────────────────────────────────────────── */
axiosInstance.interceptors.response.use(
    (res) => res,
    async (err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.message || "";
        const code = err.response?.data?.code || err.response?.data?.name || "";

        // CSRF 에러 패턴(환경별로 다를 수 있어 넓게 체크)
        const isCsrfError =
            status === 403 &&
            (code === "EBADCSRFTOKEN" ||
                /csrf/i.test(msg) ||
                /invalid csrf token/i.test(msg));

        // 무한루프 방지: 1회만 재시도
        const original = err.config || {};
        if (isCsrfError && !original._retryCsrf) {
            try {
                await fetchCsrfToken(); // 토큰 재발급
                original._retryCsrf = true;
                original.headers = original.headers || {};
                if (csrfToken) original.headers["X-CSRF-Token"] = csrfToken;
                return axiosInstance.request(original); // 재시도
            } catch (e) {
                // 재발급 실패시 아래로 떨어져서 그대로 에러 처리
            }
        }

        // 기존 “정지” 메시지 처리 유지
        if (status === 403 && msg?.includes("정지")) {
            toast(msg, { icon: "⚠️" });
            const bannedUntil =
                msg.match(/\d{4}-\d{2}-\d{2}[^ ]*/)?.[0] || null;
            window.dispatchEvent(
                new CustomEvent("ban-update", { detail: { bannedUntil } })
            );
        }

        return Promise.reject(err);
    }
);

export default axiosInstance;
