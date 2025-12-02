// api/axiosFlask.ts
import axios from "axios";

export const axiosFlask = axios.create({
  baseURL: import.meta.env.VITE_FLASK_BASE_URL,
  withCredentials: false,              // 쿠키 절대 안 보냄
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// (선택) 요청 크기 큰 경우만 따로 처리(파일 X권장)
axiosFlask.interceptors.request.use((config) => {
  // Flask는 CSRF 안 쓰므로 X-CSRF-Token 붙이지 않음
  return config;
});