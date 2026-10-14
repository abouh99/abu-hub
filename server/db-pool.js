/* Abu.Hub DB seam — file store today, pooled Postgres tomorrow.
   When DATABASE_URL is set (Render Postgres/Supabase), getPool() returns a
   capped pg Pool (max 10 — never stampede the database). Otherwise null and
   the app keeps using the file store. Health reports which backend is live.
   ---- Target Postgres DDL (monetization-aligned) ----
   vendors(id, name, tier TEXT DEFAULT 'standard',        -- (2) pro unlocks analytics + verified badge
           wallet NUMERIC DEFAULT 0, phone_enc TEXT);     -- phone_enc: AES, never selected by storefront role
   products(id, vendor_id, variants JSONB,               -- JSONB: fashion sizes vs pottery configs, no migrations
            dropship BOOL DEFAULT false, stock INT);
   orders(id, ref UNIQUE, buyer, items JSONB, total,      -- idempotency-key UNIQUE
          escrow TEXT DEFAULT 'held',                     -- (1) held -> released, 8% ledger on release
          promo JSONB);
   promotions(id, vendor_id, shelf TEXT,                 -- (4) 'hot' | 'trending' flat-fee featured slots
              starts, ends, fee);
   rfq_bids(id, rfq_id, vendor_id, quote, eta, status);   -- B2B bidding quotes
   subscriptions(vendor_id, tier, period, status);        -- (2) recurring premium tiers
   chat_acks(id, vendor_id, ip, created);                 -- disintermediation audit trail
*/
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
