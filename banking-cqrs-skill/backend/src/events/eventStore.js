import { pool } from '../db/eventStoreDB.js';

export const eventStore = {
  async append(event) {
    const sql = `INSERT INTO events (aggregate_id, version, type, payload, created_by)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const { rows } = await pool.query(sql, [
      event.aggregate_id, event.version,
      event.type, JSON.stringify(event.payload), event.created_by
    ]);
    return rows[0];
  },

  async nextVersion(aggregateId) {
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM events WHERE aggregate_id = $1',
      [aggregateId]
    );
    return parseInt(rows[0].next, 10);
  },

  async replay(aggregateId) {
    const { rows } = await pool.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version ASC',
      [aggregateId]
    );
    return rows;
  },
};
