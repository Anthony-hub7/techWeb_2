import bcrypt from 'bcrypt';
import { pool } from '../../db/readModelDB.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../auth/jwtService.js';
import { storeRefreshToken, getRefreshToken, clearRefreshToken } from '../../auth/refreshToken.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await storeRefreshToken(user.id, refreshToken);
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis' });

    const decoded = verifyRefreshToken(refreshToken);
    const stored = await getRefreshToken(decoded.id);
    if (stored !== refreshToken) return res.status(401).json({ error: 'Token révoqué' });

    const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.id]);
    if (rows.length === 0) return res.status(401).json({ error: 'Utilisateur introuvable' });

    const accessToken = signAccessToken(rows[0]);
    const newRefresh = signRefreshToken(rows[0]);
    await storeRefreshToken(rows[0].id, newRefresh);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
}
