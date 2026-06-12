import { pool } from '../db/readModelDB.js';

export async function storeRefreshToken(userId, token) {
  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [token, userId]);
}

export async function getRefreshToken(userId) {
  const { rows } = await pool.query('SELECT refresh_token FROM users WHERE id = $1', [userId]);
  return rows[0]?.refresh_token || null;
}

export async function clearRefreshToken(userId) {
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
}
