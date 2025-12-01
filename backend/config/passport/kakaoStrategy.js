// ✅ kakaoStrategy.js 수정된 전체 코드
const KakaoStrategy = require('passport-kakao').Strategy;
const { User } = require('../../models');

module.exports = (passport) => {
  console.log('✅ passport-kakao 전략 등록 시작');

  console.log('✅ KAKAO_ID:', process.env.KAKAO_ID);
  console.log('✅ CALLBACK URL:', '/api/4000/auth/kakao/callback');

  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_ID,
        callbackURL: '/api/auth/kakao/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('✅ 카카오 로그인 성공. 프로필 정보 수신');
          console.log('✅ 카카오 프로필:', JSON.stringify(profile, null, 2));

          const snsId = profile.id.toString();
          const kakaoAccount = profile._json.kakao_account || {};
          const email = kakaoAccount.email || `${snsId}@kakao.com`;

          let user = await User.findOne({
            where: { sns_id: snsId, provider: 'kakao' },
          });

          if (!user) {
            console.log('🆕 신규 소셜 유저: 추가 정보 필요, DB에 저장하지 않음');

            // 임시 사용자 객체 세션에 저장할 수 있도록 반환
            const tempUser = {
              sns_id: snsId,
              provider: 'kakao',
              email,
              isNewSocialUser: true,
            };
            return done(null, tempUser);
          } else {
            console.log('👤 기존 유저 로그인');
            user.user_id = user.user_id || user.id;
            user.isNewSocialUser = false;
            return done(null, user);
          }
        } catch (err) {
          console.error('❌ KakaoStrategy error:', err);
          return done(err);
        }
      }
    )
  );
};
