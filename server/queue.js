/* Abu.Hub job queue — persistent + event-driven.
   API routes emit events and return FAST; this worker does the heavy lifting
   (receipts, vendor pings, reseller webhooks) in the background with retries.
   Swap `store` for BullMQ/Redis later without touching handlers. */
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data", "db.json");
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: [], orders: [], rfqs: [], sellers: [], jobs: [], outbox: [] }; }
}
function persist(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
const jid = () => "J" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);

/* Emit: persist a job, return immediately (never blocks checkout) */
function emit(event, payload = {}) {
  try {
    const db = load();
    db.jobs = db.jobs || [];
    db.jobs.unshift({ id: jid(), event, payload, status: "pending", attempts: 0, nextRun: Date.now(), log: [], created: new Date().toISOString() });
    db.jobs = db.jobs.slice(0, 500); // cap
    persist(db);
  } catch {}
}

/* Outbox entry (email/SMS stand-in until a provider is configured) */
function outbox(db, to, subject, body) {
  db.outbox = db.outbox || [];
  db.outbox.unshift({ to, subject, body, date: new Date().toISOString() });
  db.outbox = db.outbox.slice(0, 200);
}

/* ---- handlers: one per event type ---- */
const handlers = {
  async "order.created"(db, job) {
    const o = job.payload;
    outbox(db, o.email, `Receipt ${o.ref}`, `Thanks ${o.name}! ${o.items.length} item(s), ${o.total}. Makers ship in 1–2 days.`);
    outbox(db, "makers@abuhub.internal", `New order ${o.ref}`, `${o.items.length} item(s) via ${o.method}. Pack within 48h.`);
    if (process.env.ORDER_WEBHOOK) {
      const r = await fetch(process.env.ORDER_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "order.created", order: o })
      });
      if (!r.ok) throw new Error("webhook " + r.status);
      job.log.push("reseller webhook 200");
    } else job.log.push("no ORDER_WEBHOOK set — logged only");
  },
  async "rfq.created"(db, job) {
    const q = job.payload;
    outbox(db, "makers@abuhub.internal", `Custom request ${q.id}`, `${q.title} · budget ${q.budget} · qty ${q.qty}. Quote within 48h.`);
  },
  async "seller.applied"(db, job) {
    const s = job.payload;
    outbox(db, s.email, "Application received", `Karibu ${s.shop}! Review within 24h.`);
    outbox(db, "review@abuhub.internal", `Review seller ${s.shop}`, `${s.owner} · ${s.category} · dropship:${!!s.dropship}`);
  },
  async "order.released"(db, job) {
    const o = job.payload;
    outbox(db, o.seller, `Payout released ${o.ref}`, `${o.total} released from escrow (8% commission kept).`);
  },
  async "promo.sold"(db, job) {
    const p = job.payload;
    outbox(db, p.email, `Promotion invoice ${p.id}`, `${p.shelf} shelf · ${p.weeks} week(s) · fee $${p.fee}. Pay to activate pinning.`);
    outbox(db, "ads@abuhub.internal", `New promo ${p.id}`, `${p.productId} · ${p.shelf} · $${p.fee} · invoice ${p.status}.`);
  }
};

/* ---- worker loop ---- */
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const db = load();
    db.jobs = db.jobs || [];
    const job = db.jobs.find(j => j.status === "pending" && j.nextRun <= Date.now());
    if (job && handlers[job.event]) {
      job.attempts++;
      try {
        await handlers[job.event](db, job);
        job.status = "done"; job.log.push("done");
      } catch (e) {
        job.log.push("attempt " + job.attempts + ": " + e.message);
        if (job.attempts >= 3) job.status = "failed";
        else job.nextRun = Date.now() + job.attempts * 15000; // backoff
      }
      persist(db);
    }
  } catch (e) { console.warn("worker tick failed", e.message); }
  running = false;
}
function startWorker() { setInterval(tick, 2000); tick(); }

module.exports = { emit, startWorker };
