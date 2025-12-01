// services/embeddingApi.js
const axios = require('axios');

module.exports = async function callEmbeddingRecommendation(userText, challengeTexts) {
  try {
    const base = process.env.PY_RECO_BASE_URL;
    const response = await axios.post(
      `${base}/recommend`,
      {
        user_text: userText,
        challenges: challengeTexts, // [{ id, text }]
      },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );

    console.log('🔥 백엔드에서 받은 추천 ID:', response.data.recommended_ids);
    return response.data.recommended_ids || [];
  } catch (error) {
    console.error('🔥 추천 서버 오류:', error.message);
    console.error('📦 오류 응답:', error.response?.data || error);
    return [];
  }
};
