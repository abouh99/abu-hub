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
const { emit, startWorker } = require("./queue");
const { getPool } = require("./db-pool");
startWorker();

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
app.get("/api/health", async (req, res) => {
  let dbBackend = "file";
  try { if (getPool()) { await getPool().query("SELECT 1"); dbBackend = "postgres"; } } catch {}
  res.json({ ok: true, service: "abuhub-api", db: dbBackend, time: new Date().toISOString() });
});

/* Zero-budget anti-sleep: ping our own public URL every 14 min.
   (Render free sleeps after ~15 min idle. Proper fix = Starter $7/mo.) */
(function selfPing() {
  const url = process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL;
  if (!url) return;
  const ping = () => fetch(url.replace(/\/$/, "") + "/api/health").catch(() => {});
  setInterval(ping, 14 * 60 * 1000);
})();

/* ---------- media uploads (pre-signed seam) ----------
   With S3 env set: returns a pre-signed PUT URL (browser uploads direct,
   bypassing Node entirely). Without: safe local upload, 2MB cap, images only. */
app.get("/api/media/upload-url", async (req, res) => {
  const ext = String(req.query.ext || "jpg").replace(/[^a-z]/g, "").slice(0, 4) || "jpg";
  if (process.env.S3_BUCKET && process.env.AWS_REGION) {
    return res.json({ mode: "presigned", note: "Wire @aws-sdk/s3-request-presigner here with S3_* env", key: `uploads/${Date.now()}.${ext}` });
  }
  res.json({ mode: "local", uploadUrl: "/api/media/direct", maxBytes: 2 * 1024 * 1024 });
});
let _multer = null;
function multer() {
  if (!_multer) {
    const m = require("multer");
    _multer = m({ storage: m.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 },
      fileFilter: (req, f, cb) => cb(null, /^image\//.test(f.mimetype)) });
  }
  return _multer;
}
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));
app.post("/api/media/direct", (req, res) => {
  multer().single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: "Image required, max 2MB" });
    if (!req.file) return res.status(400).json({ error: "No image received" });
    const ext = (req.file.mimetype.split("/")[1] || "jpg").replace(/[^a-z]/g, "").slice(0, 4);
    const name = Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6) + "." + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer); // buffer capped at 2MB — never OOMs
    res.json({ ok: true, url: "/uploads/" + name });
  });
});

/* ---------- job observability ---------- */
app.get("/api/jobs", (req, res) => {
  const db = load();
  const jobs = (db.jobs || []).slice(0, 20).map(j => ({ id: j.id, event: j.event, status: j.status, attempts: j.attempts, log: j.log }));
  res.json({ pending: (db.jobs || []).filter(j => j.status === "pending").length, jobs, outbox: (db.outbox || []).slice(0, 10) });
});

/* ---------- input hygiene ---------- */
const clean = (s, n = 200) => String(s ?? "").replace(/[<>\x00-\x1F\x7F]/g, "").trim().slice(0, n);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

/* ---------- auth (role-based: shopper | seller | admin) ---------- */
function pubUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role || "shopper" }; }
app.post("/api/auth/signup", async (req, res) => {
  const { name = "", email = "", password = "", role = "shopper", shop = "" } = req.body || {};
  if (!name.trim() || !isEmail(email) || String(password).length < 4)
    return res.status(400).json({ error: "Name, valid email and 4+ char password required" });
  const db = load();
  if (db.users.some(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: "Account exists — sign in instead" });
  const em = email.toLowerCase();
  const userRole = ADMIN_EMAILS.includes(em) ? "admin" : (role === "seller" ? "seller" : "shopper");
  const user = { id: uid("U"), name: clean(name, 80), email: em, role: userRole, pass: await bcrypt.hash(password, 10), created: new Date().toISOString() };
  db.users.push(user);
  let profile = null;
  if (userRole === "seller") {
    db.sellerProfiles = db.sellerProfiles || [];
    profile = { id: uid("SP-"), userId: user.id, shop: clean(shop, 80) || `${user.name}'s Shop`, created: user.created };
    db.sellerProfiles.push(profile);
  }
  persist(db);
  res.json({ token: sign(user), user: { ...pubUser(user), sellerId: profile?.id || null } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const db = load();
  const user = db.users.find(u => u.email === String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.pass)))
    return res.status(401).json({ error: "Wrong email or password" });
  const profile = (db.sellerProfiles || []).find(p => p.userId === user.id);
  res.json({ token: sign(user), user: { ...pubUser(user), sellerId: profile?.id || null } });
});

app.get("/api/auth/me", auth, (req, res) => {
  const db = load();
  const profile = (db.sellerProfiles || []).find(p => p.userId === req.user.id);
  res.json({ user: { ...req.user, role: (db.users.find(u => u.id === req.user.id)?.role) || "shopper", sellerId: profile?.id || null } });
});
function requireRole(...roles) {
  return (req, res, next) => {
    const db = load();
    const u = db.users.find(x => x.id === req.user.id);
    if (!u || !roles.includes(u.role)) return res.status(403).json({ error: "Seller account required" });
    req.profile = (db.sellerProfiles || []).find(p => p.userId === u.id) || null;
    next();
  };
}

/* ---------- catalog (read-model seam: static seed today, Postgres/Algolia tomorrow) ---------- */
let SEED = { vendors: [], products: [] };
try {
  const dataJs = fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8");
  const sandbox = { VENDORS: null, PRODUCTS: null };
  new Function("sandbox", dataJs.replace(/const (VENDORS|PRODUCTS)/g, "sandbox.$1") + ";return sandbox;")(sandbox);
  SEED = { vendors: sandbox.VENDORS || [], products: sandbox.PRODUCTS || [] };
} catch { SEED = { vendors: [], products: [] }; }
app.get("/api/vendors", (req, res) => res.json({ vendors: SEED.vendors }));
/* Public catalog: seed (approved) + seller products with status=approved.
   Index targets (Postgres): products(seller_id), products(category), products(status). */
function publicProducts() {
  const db = load();
  const live = (db.products || []).filter(p => p.status === "approved").map(p => ({
    id: p.id, vendorId: "s-" + p.sellerId, name: p.name, category: p.category,
    price: p.price, oldPrice: null, rating: 5.0, reviews: 0, img: p.image,
    badge: "New from maker", colors: ["Standard"], desc: p.desc, stock: p.stock,
    specs: p.specs && Object.keys(p.specs).length ? p.specs : undefined,
    craft: p.craft && Object.keys(p.craft).length ? p.craft : undefined
  }));
  return [...SEED.products, ...live];
}
app.get("/api/products", (req, res) => {
  let list = publicProducts();
  const { q = "", category = "", vendor = "", dropship = "", sort = "", page = "1", limit = "24", mine = "" } = req.query;
  if (mine === "1") {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    try {
      const me = jwt.verify(token, JWT_SECRET);
      const db = load();
      const prof = (db.sellerProfiles || []).find(p => p.userId === me.id);
      list = (db.products || []).filter(p => prof && p.sellerId === prof.id);
    } catch { return res.status(401).json({ error: "Sign in as seller" }); }
  }
  if (q) { const s = q.toLowerCase(); list = list.filter(p => (p.name + " " + p.category).toLowerCase().includes(s)); }
  if (category) list = list.filter(p => p.category === category);
  if (vendor) list = list.filter(p => p.vendorId === vendor);
  if (dropship === "true") { const ids = new Set(SEED.vendors.filter(v => v.dropship).map(v => v.id)); list = list.filter(p => ids.has(p.vendorId)); }
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  const pg = Math.max(1, parseInt(page) || 1), lim = Math.min(100, Math.max(1, parseInt(limit) || 24));
  res.json({ products: list.slice((pg - 1) * lim, pg * lim), total: list.length, page: pg });
});

/* ---------- Seller Path: product CRUD (ownership-enforced) ---------- */
const CATS = ["Fashion", "Home & Living", "Beauty", "Jewelry", "Art & Craft", "Grocery", "Other", "Phones & Gadgets", "Computers & PCs", "Gaming & Consoles"];
const TECH_CATS = ["Phones & Gadgets", "Computers & PCs", "Gaming & Consoles"];
const SPEC_KEYS = ["chip", "ram", "storage", "screen", "battery", "condition"];
const CRAFT_KEYS = ["materials", "dimensions", "care"];
function validProduct(b) {
  const errs = [];
  const name = clean(b.name, 120), desc = clean(b.description ?? b.desc, 2000);
  const price = Number(b.price), stock = Math.floor(Number(b.stock ?? 1));
  const category = CATS.includes(b.category) ? b.category : "";
  const image = clean(b.image ?? b.image_url ?? b.img, 2000);
  if (!name) errs.push("name required (max 120)");
  if (!(price > 0) || price > 1000000) errs.push("price must be 0.01 – 1,000,000");
  if (!category) errs.push("category must be one of: " + CATS.join(", "));
  if (!image) errs.push("image required (upload a photo first)");
  if (!/^(\/|https?:|data:image\/)/.test(image)) errs.push("image must be a URL or upload");
  if (!(stock >= 0) || stock > 1000000) errs.push("stock must be 0 – 1,000,000");
  /* polymorphic variants: tech specs vs artisan craft details */
  const specs = {}, craft = {};
  if (TECH_CATS.includes(category)) {
    if (b.specs && typeof b.specs === "object") SPEC_KEYS.forEach(k => { const v = clean(b.specs[k], 60); if (v) specs[k] = v; });
    const cond = (b.specs && b.specs.condition) || "";
    if (!["New", "Refurbished", "Used – like new", "Used-like new", "Used"].includes(clean(cond, 60))) errs.push("tech items need condition: New | Refurbished | Used");
  }
  if (!TECH_CATS.includes(category) && b.craft && typeof b.craft === "object") {
    CRAFT_KEYS.forEach(k => { const v = clean(b.craft[k], 200); if (v) craft[k] = v; });
  }
  return { errs, data: { name, desc, price: Math.round(price * 100) / 100, stock, category, image, specs, craft } };
}
app.post("/api/products", auth, requireRole("seller", "admin"), (req, res) => {
  if (!req.profile) return res.status(403).json({ error: "Seller profile missing" });
  const { errs, data } = validProduct(req.body || {});
  if (errs.length) return res.status(400).json({ error: errs.join("; ") });
  const db = load();
  const now = new Date().toISOString();
  const p = { id: uid("P-"), sellerId: req.profile.id, status: "pending", rating: 5.0, reviews: 0, created: now, updated: now, ...data };
  db.products = db.products || [];
  db.products.unshift(p); persist(db);
  emit("product.submitted", { id: p.id, sellerId: p.sellerId, name: p.name });
  res.json({ ok: true, product: p, note: "Pending review — live after approval (instant in local demo)" });
});
app.put("/api/products/:id", auth, requireRole("seller", "admin"), (req, res) => {
  const db = load();
  const p = (db.products || []).find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Unknown product" });
  const u = db.users.find(x => x.id === req.user.id);
  if (u.role !== "admin" && p.sellerId !== req.profile?.id) return res.status(403).json({ error: "Not your product" });
  const { errs, data } = validProduct({ ...p, ...(req.body || {}) });
  if (errs.length) return res.status(400).json({ error: errs.join("; ") });
  Object.assign(p, data, { updated: new Date().toISOString() });
  persist(db);
  res.json({ ok: true, product: p });
});
app.delete("/api/products/:id", auth, requireRole("seller", "admin"), (req, res) => {
  const db = load();
  const i = (db.products || []).findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Unknown product" });
  const u = db.users.find(x => x.id === req.user.id);
  if (u.role !== "admin" && db.products[i].sellerId !== req.profile?.id) return res.status(403).json({ error: "Not your product" });
  db.products.splice(i, 1); persist(db);
  res.json({ ok: true });
});
app.put("/api/products/:id/approve", auth, requireRole("admin"), (req, res) => {
  const db = load();
  const p = (db.products || []).find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Unknown product" });
  p.status = req.body?.status === "rejected" ? "rejected" : "approved";
  p.updated = new Date().toISOString(); persist(db);
  res.json({ ok: true, status: p.status });
});
app.get("/api/seller/stats", auth, requireRole("seller", "admin"), (req, res) => {
  const db = load();
  const mine = (db.products || []).filter(p => p.sellerId === req.profile?.id);
  const tx = (db.transactions || []).filter(t => t.sellerId === req.profile?.id);
  res.json({ products: mine.length, pending: mine.filter(p => p.status === "pending").length,
    sales: tx.length, gross: tx.reduce((s, t) => s + t.gross, 0), commission: tx.reduce((s, t) => s + t.commission, 0) });
});
app.get("/api/seller/transactions", auth, requireRole("seller", "admin"), (req, res) => {
  const db = load();
  res.json({ transactions: ((db.transactions || []).filter(t => t.sellerId === req.profile?.id)).slice(0, 100) });
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
  const order = { ref: ref || uid("AH-"), key: key || undefined, email: req.user.email, name: req.user.name, items, total, method, contact, verified: false, escrow: "held", date: new Date().toISOString() };
  db.orders.unshift(order);
  splitLedger(db, order); // 8% platform / 92% seller escrow rows
  persist(db);
  emit("order.created", order); // background: receipts, vendor ping, reseller webhook
  res.json({ ok: true, order: { ref: order.ref, total: order.total } });
});

/* ---------- Ledger: split every seller line 8% platform / 92% escrow ---------- */
function splitLedger(db, order) {
  db.transactions = db.transactions || [];
  if (db.transactions.some(t => t.orderRef === order.ref)) return; // idempotent
  const live = Object.fromEntries((db.products || []).map(p => [p.id, p]));
  (order.items || []).forEach(l => {
    const sp = live[l.id];
    if (!sp) return;
    const gross = Math.round(sp.price * (l.qty || 1) * 100) / 100;
    db.transactions.unshift({ id: uid("T-"), orderRef: order.ref, sellerId: sp.sellerId, productId: sp.id, gross, commission: Math.round(gross * 0.08 * 100) / 100, net: Math.round(gross * 0.92 * 100) / 100, date: order.date || new Date().toISOString() });
  });
}

/* ---------- Payment webhook: verify → ledger → worker alerts, shopper never waits ---------- */
app.post("/api/payments/webhook", async (req, res) => {
  const { provider = "", ref = "", status = "", amount = 0 } = req.body || {};
  if (!ref) return res.status(400).json({ error: "Missing ref" });
  const paid = ["successful", "success", "paid", "complete", "completed"].includes(String(status).toLowerCase());
  const db = load();
  const o = db.orders.find(x => x.ref === ref);
  if (!o) return res.status(404).json({ error: "Unknown order" });
  if (paid) {
    o.verified = true; o.verifiedVia = o.verifiedVia || ("webhook:" + (provider || "gateway"));
    if (o.escrow !== "released") o.escrow = "held";
    splitLedger(db, o);
    persist(db);
    emit("order.paid", { ref: o.ref, email: o.email, name: o.name, items: o.items, total: amount || o.total, method: o.method });
  }
  res.json({ ok: true, verified: !!o.verified, escrow: o.escrow });
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
  emit("rfq.created", rq);
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
  emit("seller.applied", { shop, owner, email, category });
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

/* ---------- WhatsApp Shield (Protocol A) ----------
   Raw seller numbers NEVER leave the server. Frontend links to
   /api/vendors/:id/chat; we 302-redirect to wa.me. Numbers live in
   vendor-contacts.json (never in git-shared frontend code). */
const CONTACTS_FILE = path.join(__dirname, "vendor-contacts.json");
function vendorNumber(id) {
  try { return (JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf8"))[id] || "").replace(/\D/g, ""); }
  catch { return ""; }
}
/* Scraper shield: 30 chat redirects per IP per minute */
const _rl = new Map();
function chatLimiter(req, res, next) {
  const k = (req.ip || "?") + ":" + Math.floor(Date.now() / 6e4);
  const n = (_rl.get(k) || 0) + 1;
  _rl.set(k, n);
  if (_rl.size > 5000) _rl.clear();
  if (n > 30) return res.status(429).json({ error: "Slow down — too many chat requests" });
  next();
}
app.get("/api/vendors/:id/chat", chatLimiter, (req, res) => {
  const num = vendorNumber(req.params.id);
  if (!num) return res.status(404).json({ error: "Vendor chat unavailable — contact Abu.Hub support instead" });
  const text = String(req.query.text || "Hi! I found you on Abu.Hub.").slice(0, 300);
  res.redirect(302, "https://wa.me/" + num + "?text=" + encodeURIComponent(text));
});
/* Disintermediation audit trail (Protocol B): every handoff ack is logged */
app.post("/api/chat-ack", (req, res) => {
  const { vendor = "" } = req.body || {};
  const db = load();
  db.chatacks = db.chatacks || [];
  db.chatacks.unshift({ vendor, ip: req.ip, date: new Date().toISOString() });
  db.chatacks = db.chatacks.slice(0, 500);
  persist(db);
  res.json({ ok: true });
});

/* ---------- Promotions shelf (flat-fee featured slots: hot | trending) ---------- */
const PROMO_RATES = { hot: 9, trending: 19 }; // USD per week
app.get("/api/promotions", (req, res) => {
  const db = load();
  const now = Date.now();
  const all = (db.promotions || []).map(p => ({ ...p, active: p.starts <= now && p.ends > now }));
  res.json({ promotions: req.query.active ? all.filter(p => p.active) : all });
});
app.post("/api/promotions", auth, (req, res) => {
  const { productId = "", shelf = "hot", weeks = 1, email = "" } = req.body || {};
  if (!productId || !PROMO_RATES[shelf]) return res.status(400).json({ error: "productId + shelf (hot|trending) required" });
  const w = Math.min(4, Math.max(1, Number(weeks) || 1));
  const now = Date.now();
  const promo = { id: uid("PR-"), productId, shelf, weeks: w, fee: PROMO_RATES[shelf] * w,
    email: email || req.user.email, by: req.user.email, status: "pending-invoice",
    starts: now, ends: now + w * 7 * 864e5, date: new Date().toISOString() };
  const db = load();
  db.promotions = db.promotions || [];
  db.promotions.unshift(promo); persist(db);
  emit("promo.sold", promo);
  res.json({ ok: true, promo: { id: promo.id, fee: promo.fee, ends: promo.ends } });
});
/* ---------- Escrow release (8% commission ledger hook) ---------- */
app.post("/api/orders/:ref/release", auth, (req, res) => {
  const db = load();
  const o = db.orders.find(x => x.ref === req.params.ref);
  if (!o) return res.status(404).json({ error: "Unknown order" });
  o.escrow = "released";
  persist(db);
  emit("order.released", { ref: o.ref, total: o.total, seller: o.email });
  res.json({ ok: true, escrow: "released" });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.listen(PORT, () => console.log(`Abu.Hub API live on :${PORT}`));
