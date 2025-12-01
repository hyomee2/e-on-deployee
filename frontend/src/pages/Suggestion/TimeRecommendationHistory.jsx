// src/pages/TimeRecommendationHistory.jsx
import React from 'react';
import ChallengeRecommendPanelHistory from '../components/ChallengeRecommendPanelHistory';

// 데모 데이터 (실서비스에선 API로 로드)
const SAMPLE = [
  { id: 1, title: '아침 조깅 20분', text: '매일 아침 20분 조깅하며 컨디션 관리', tags:['운동','건강'] },
  { id: 2, title: '독서 30분', text: '관심 분야 도서 30분 읽기', tags:['자기계발'] },
  { id: 3, title: '코딩 문제 2문제', text: '백준 알고리즘 문제 2개 풀기', tags:['개발','알고리즘'] },
  { id: 4, title: '블로그 회고 쓰기', text: '일주일 회고를 블로그에 작성', tags:['글쓰기'] },
  { id: 5, title: '영어 쉐도잉', text: '뉴스 클립로 10분 쉐도잉', tags:['언어'] },
  { id: 6, title: '요가 스트레칭', text: '저녁에 요가 스트레칭 15분', tags:['운동'] },
  { id: 7, title: '오픈소스 PR', text: '관심 저장소에 작은 PR 보내보기', tags:['개발','커뮤니티'] },
  { id: 8, title: '포트폴리오 업뎃', text: '포트폴리오 페이지를 최신화', tags:['커리어'] },
];

export default function TimeRecommendationHistory() {
  function handlePick(id) {
    // 예: 추천 결과를 사용자 장바구니/위시리스트에 추가
    console.log('picked challenge:', id);
  }

  return (
    <main style={{ padding: 16 }}>
      <ChallengeRecommendPanelHistory
        challenges={SAMPLE}
        apiBase={process.env.NEXT_PUBLIC_AI_API_BASE}
        title="프로필 맞춤 추천 (History)"
        placeholder="예: 개발 역량을 키우고 싶고, 매일 30분만 투자할 수 있어요."
        defaultText=""
        ctaText="AI 추천"
        onPick={handlePick}
      />
    </main>
  );
}
