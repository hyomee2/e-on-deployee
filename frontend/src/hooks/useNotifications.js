// src/hooks/useNotifications.js
import { useEffect, useState, useCallback } from "react";
import api from "../api/axiosInstance";
import { io } from "socket.io-client";

let socket; // singleton

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 백엔드 주소 (.env에 VITE_API_URL=http://localhost:4000 권장)
  const BASE_URL = import.meta.env?.VITE_API_URL;

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notifications/unread-count", {
        withCredentials: true,
      });
      setUnread(data?.count ?? 0);
    } catch (e) {
      console.error("[notifications] unread-count fail:", e);
    }
  }, []);

  const fetchPage = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notifications", {
        params: { page, pageSize },
        withCredentials: true,
      });
      // created_at 필드 사용 (백엔드가 timestamps:false)
      const list = (data?.items ?? []).map((n) => ({
        ...n,
        created_at: n.created_at || n.createdAt || n.createdat, // 혹시 모를 변형 대비
      }));
      setItems(list);
    } catch (e) {
      console.error("[notifications] list fail:", e);
    }
  }, [page]);

  useEffect(() => {
    fetchUnread();
    fetchPage();
  }, [fetchUnread, fetchPage]);

  // socket 연결
  useEffect(() => {
    if (!socket) {
      socket = io(BASE_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"], // 네트워크 환경 폴백 허용
      });
      socket.on("connect", () =>
        console.log("[socket] connected:", socket.id)
      );
      socket.on("connect_error", (err) =>
        console.error("[socket] connect_error:", err?.message || err)
      );
    }

    const onNew = (n) => {
      // 실시간 수신도 created_at 보정
      const normalized = {
        ...n,
        created_at: n.created_at || n.createdAt || n.createdat || new Date().toISOString(),
      };
      setItems((prev) => [normalized, ...prev]);
      setUnread((u) => u + 1);
    };

    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
    // BASE_URL은 빌드 타임 상수라 의존성에 넣지 않아도 됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = async () => {
    try {
      await api.post(
        "/api/notifications/mark-all-read",
        {},
        { withCredentials: true }
      );
      setUnread(0);
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (e) {
      console.error("[notifications] mark-all-read fail:", e);
    }
  };

  const markRead = async (ids) => {
    if (!Array.isArray(ids) || !ids.length) return;
    try {
      await api.post(
        "/api/notifications/mark-read",
        { ids },
        { withCredentials: true }
      );
      setUnread((u) => Math.max(0, u - ids.length));
      setItems((prev) =>
        prev.map((x) => (ids.includes(x.id) ? { ...x, is_read: true } : x))
      );
    } catch (e) {
      console.error("[notifications] mark-read fail:", e);
    }
  };

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  return {
    items,
    unread,
    open,
    toggle,
    close,
    page,
    setPage,
    pageSize,
    markAllRead,
    markRead,
    refetch: fetchPage, // 필요 시 외부에서 새로고침용
  };
}
