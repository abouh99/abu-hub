/* Abu.Hub DB seam — file store today, pooled Postgres tomorrow.
   When DATABASE_URL is set (Render Postgres/Supabase), getPool() returns a
   capped pg Pool (max 10 — never stampede the database). Otherwise null and
   the app keeps using the file store. Health reports which backend is live. */
let _pool = null;
function getPool() {
  if (_pool !== undefined) return _pool;
  _pool = null;
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require("pg");
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10, min: 0, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000,
        ssl: process.env.PGSSL === "off" ? false : { rejectUnauthorized: false }
      });
      _pool.on("error", (e) => console.warn("pg pool error", e.message));
    } catch (e) { console.warn("pg unavailable", e.message); _pool = null; }
  }
  return _pool;
}
module.exports = { getPool };
