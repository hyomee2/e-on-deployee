const NaverStrategy = require('passport-naver').Strategy;
const { User } = require('../../models');

module.exports = (passport) => {
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: `/api/auth/naver/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const exUser = await User.findOne({ where: { sns_id: profile.id, provider: 'naver' } });
          if (exUser) return done(null, exUser);

          return done(null, {
            isNewSocialUser: true,
            provider: 'naver',
            sns_id: profile.id,
            email: profile.emails[0].value,
          });
        } catch (err) {
          console.error('❌ NAVER 로그인 오류:', err);
          done(err);
        }
      }
    )
  );
};
