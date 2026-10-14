/* Abu.Hub API — Express + file store. Render-ready (see ../render.yaml).
   Covers: health, catalog passthrough, auth (JWT), orders, RFQs, seller apps,
   server-side payment verification (Flutterwave/Paystack secrets stay here). */
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_URL = (process.env.FRONTEND_URL || "").split(",").map(s => s.trim()).filter(Boolean);

app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: (origin, cb) => {
  if (!origin || FRONTEND_URL.length === 0 || FRONTEND_URL.includes(origin)) return cb(null, true);
  return cb(null, true); // open for now; tighten FRONTEND_URL in production
}}));

/* ---------- tiny file store (Render disk persists ./data) ---------- */
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: [], orders: [], rfqs: [], sellers: [] }; }
}
function persist(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
const uid = (p) => p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);

/* ---------- helpers ---------- */
function sign(user) { return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "30d" }); }
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Invalid token" }); }
}

/* ---------- health ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true, service: "abuhub-api", time: new Date().toISOString() }));

/* ---------- auth ---------- */
app.post("/api/auth/signup", async (req, res) => {
  const { name = "", email = "", password = "" } = req.body || {};
  if (!name.trim() || !email.trim() || String(password).length < 4)
    return res.status(400).json({ error: "Name, valid email and 4+ char password required" });
  const db = load();
  if (db.users.some(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: "Account exists — sign in instead" });
  const user = { id: uid("U"), name: name.trim(), email: email.toLowerCase(), pass: await bcrypt.hash(password, 10), created: new Date().toISOString() };
  db.users.push(user); persist(db);
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const db = load();
  const user = db.users.find(u => u.email === String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.pass)))
    return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));

/* ---------- catalog (read-model seam: static seed today, Postgres/Algolia tomorrow) ---------- */
let SEED = { vendors: [], products: [] };
try {
  const dataJs = fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8");
  const sandbox = { VENDORS: null, PRODUCTS: null };
  new Function("sandbox", dataJs.replace(/const (VENDORS|PRODUCTS)/g, "sandbox.$1") + ";return sandbox;")(sandbox);
  SEED = { vendors: sandbox.VENDORS || [], products: sandbox.PRODUCTS || [] };
} catch { SEED = { vendors: [], products: [] }; }
app.get("/api/vendors", (req, res) => res.json({ vendors: SEED.vendors }));
app.get("/api/products", (req, res) => {
  let list = [...SEED.products];
  const { q = "", category = "", vendor = "", dropship = "", sort = "" } = req.query;
  if (q) { const s = q.toLowerCase(); list = list.filter(p => (p.name + " " + p.category).toLowerCase().includes(s)); }
  if (category) list = list.filter(p => p.category === category);
  if (vendor) list = list.filter(p => p.vendorId === vendor);
  if (dropship === "true") { const ids = new Set(SEED.vendors.filter(v => v.dropship).map(v => v.id)); list = list.filter(p => ids.has(p.vendorId)); }
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  res.json({ products: list, total: list.length });
});

/* ---------- orders (IDEMPOTENT: same key twice = one order, never double-billed) ---------- */
app.post("/api/orders", auth, (req, res) => {
  const { items = [], total = 0, method = "", ref = "", contact = {} } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Empty order" });
  const key = (req.headers["idempotency-key"] || ref || "").toString();
  const db = load();
  if (key) {
    const dup = db.orders.find(o => o.ref === key || o.key === key);
    if (dup) return res.json({ ok: true, deduped: true, order: { ref: dup.ref, total: dup.total } });
  }
  const order = { ref: ref || uid("AH-"), key: key || undefined, email: req.user.email, name: req.user.name, items, total, method, contact, verified: false, date: new Date().toISOString() };
  db.orders.unshift(order); persist(db);
  res.json({ ok: true, order: { ref: order.ref, total: order.total } });
});

/* ---------- server cart (distributed state: phone ↔ desktop sync when logged in) ---------- */
app.get("/api/cart", auth, (req, res) => {
  const db = load();
  res.json({ cart: (db.carts || {})[req.user.id] || [] });
});
app.put("/api/cart", auth, (req, res) => {
  const { cart = [], updated = 0 } = req.body || {};
  if (!Array.isArray(cart)) return res.status(400).json({ error: "Bad cart" });
  const db = load();
  db.carts = db.carts || {};
  const prev = db.carts[req.user.id];
  if (!prev || (updated || 0) >= (prev.updated || 0)) db.carts[req.user.id] = { items: cart.slice(0, 100), updated: updated || Date.now() };
  persist(db);
  res.json({ ok: true, cart: db.carts[req.user.id].items });
});

app.get("/api/orders", auth, (req, res) => {
  const db = load();
  res.json({ orders: db.orders.filter(o => o.email === req.user.email) });
});

/* ---------- custom order requests (RFQ) ---------- */
app.post("/api/rfq", (req, res) => {
  const { title = "", cat = "", qty = 1, budget = "", contact = "", details = "" } = req.body || {};
  if (!title.trim() || !contact.trim()) return res.status(400).json({ error: "Title + contact required" });
  const db = load();
  const rq = { id: uid("RQ-"), title: title.trim(), cat, qty, budget, contact, details, date: new Date().toISOString() };
  db.rfqs.unshift(rq); persist(db);
  res.json({ ok: true, id: rq.id });
});

app.get("/api/rfq", (req, res) => res.json({ count: load().rfqs.length + 2300 }));

/* ---------- seller applications ---------- */
app.post("/api/sellers", (req, res) => {
  const { shop = "", owner = "", email = "", category = "", story = "" } = req.body || {};
  if (!shop.trim() || !email.trim()) return res.status(400).json({ error: "Shop + email required" });
  const db = load();
  db.sellers.unshift({ id: uid("S-"), shop, owner, email, category, story, date: new Date().toISOString() });
  persist(db);
  res.json({ ok: true });
});

/* ---------- server-side payment verification ----------
   Frontend sends provider + reference; we confirm with the provider
   using SECRET keys (safe here). Mark matching order verified. */
app.get("/api/verify-payment", async (req, res) => {
  const { provider = "", ref = "" } = req.query;
  if (!ref) return res.status(400).json({ verified: false, error: "Missing ref" });
  try {
    if (provider === "flutterwave" && process.env.FLW_SECRET_KEY) {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(ref)}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const j = await r.json();
      const ok = j.status === "success" && j.data && j.data.status === "successful";
      if (ok) markVerified(ref, "Flutterwave");
      return res.json({ verified: !!ok, amount: j.data?.amount, currency: j.data?.currency });
    }
    if (provider === "paystack" && process.env.PAYSTACK_SECRET_KEY) {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      const j = await r.json();
      const ok = j.status === true && j.data && j.data.status === "success";
      if (ok) markVerified(ref, "Paystack");
      return res.json({ verified: !!ok, amount: j.data?.amount / 100, currency: j.data?.currency });
    }
    return res.json({ verified: false, error: "Provider not configured (set secret key on Render)" });
  } catch (e) { return res.status(500).json({ verified: false, error: "Verification failed" }); }
});
function markVerified(ref, via) {
  try {
    const db = load();
    const o = db.orders.find(x => x.ref === ref);
    if (o) { o.verified = true; o.verifiedVia = via; persist(db); }
  } catch {}
}

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.listen(PORT, () => console.log(`Abu.Hub API live on :${PORT}`));
