// 📁 config/passport/googleStrategy.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../../models');

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const existingUser = await User.findOne({
            where: { sns_id: profile.id, provider: 'google' },
          });

          if (existingUser) {
            return done(null, existingUser);
          }

          const email = profile.emails?.[0]?.value || null;

          return done(null, {
            provider: 'google',
            sns_id: profile.id,
            email,
            isNewSocialUser: true,
          });
        } catch (err) {
          console.error('❌ 구글 로그인 오류:', err);
          return done(err);
        }
      }
    )
  );
};
