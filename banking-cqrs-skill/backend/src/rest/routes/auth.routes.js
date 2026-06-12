import { Router } from 'express';
import passport from '../../auth/oauthService.js';
import { login, refresh } from '../controllers/auth.controller.js';

const router = Router();
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/oauth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/oauth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const { accessToken, refreshToken } = req.user;
    res.redirect(`http://localhost:3000/auth/callback?access=${accessToken}&refresh=${refreshToken}`);
  }
);
export default router;
