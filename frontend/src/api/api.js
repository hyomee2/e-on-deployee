// 이 파일 대신 axiosInstance.js를 사용하세요.

import axios from 'axios';

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,               // 세션 쿠키 전송
  headers: { 'Content-Type': 'application/json' }
});

export default api;
