import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../db/readModelDB.js';
import { signAccessToken, signRefreshToken } from './jwtService.js';
import { storeRefreshToken } from './refreshToken.js';

if (process.env.OAUTH_GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_CALLBACK_URL || 'http://localhost:4000/api/auth/oauth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, oauth_provider, oauth_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL
         DO UPDATE SET email = EXCLUDED.email
         RETURNING id, email`,
        [profile.emails?.[0]?.value || '', profile.provider, profile.id]
      );
      const user = rows[0];
      const access = signAccessToken(user);
      const refresh = signRefreshToken(user);
      await storeRefreshToken(user.id, refresh);
      done(null, { accessToken: access, refreshToken: refresh });
    } catch (err) {
      done(err, null);
    }
  }));
}

export default passport;
