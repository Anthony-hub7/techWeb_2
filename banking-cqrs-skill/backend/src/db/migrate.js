import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './eventStoreDB.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    await pool.query(sql);
    console.log(`OK: ${file}`);
  } catch (err) {
    console.error(`ERR: ${file} — ${err.message}`);
  }
}

await pool.end();
