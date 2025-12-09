// src/hooks/useChallengeRecommendHistory.js
import { useState, useRef, useEffect } from 'react';

const LS_KEY = 'challenge_recommend_history_runs';

export function useChallengeRecommendHistory(opts) {
  const apiBase = (opts && opts.apiBase) || import.meta.env.VITE_API_BASE_URL + '/api/ai';
  const timeoutMs = 15000;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendedIds, setRecommendedIds] = useState([]);
  const [runs, setRuns] = useState([]); // { ts, userText, recommendedIds }

  const abortRef = useRef(null);

  // 초기 히스토리 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRuns(JSON.parse(raw));
    } catch {}
  }, []);

  // 히스토리 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(runs.slice(0, 20))); // 최근 20개만
    } catch {}
  }, [runs]);

  async function recommend(userText, challenges) {
    if (!userText || !challenges || challenges.length === 0) {
      setError('입력값 부족: user_text와 challenges를 확인하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendedIds([]);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${apiBase}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_text: userText,
          challenges: challenges.map(c => ({ id: c.id, text: c.text })),
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);

      const ids = data.recommended_ids || [];
      setRecommendedIds(ids);
      setRuns(prev => [{ ts: Date.now(), userText, recommendedIds: ids }, ...prev]);
    } catch (e) {
      setError(e?.name === 'AbortError' ? '요청이 취소되었어요. 다시 시도해 주세요.' : (e?.message || '서버 오류'));
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function clear() {
    setRecommendedIds([]);
    setError(null);
  }

  function clearHistory() {
    setRuns([]);
  }

  return { recommend, loading, error, recommendedIds, clear, runs, clearHistory };
}
