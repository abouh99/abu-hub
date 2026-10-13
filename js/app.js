/* Abu.Hub — app logic */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
/* ---------- Currency (USD base, multi-currency display) ---------- */
const CURRENCIES = { USD: { rate: 1, sym: "$", dec: 2 }, TZS: { rate: 2500, sym: "TSh ", dec: 0 } };
let currency = localStorage.getItem("abuhub_cur") || "USD";
if (!CURRENCIES[currency]) currency = "USD";
function money(n) {
  const c = CURRENCIES[currency];
  const v = Number(n) * c.rate;
  return c.sym + (c.dec ? v.toFixed(c.dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : Math.round(v).toLocaleString("en-US"));
}
function setCurrency(cur) {
  if (!CURRENCIES[cur]) return;
  currency = cur; localStorage.setItem("abuhub_cur", cur);
  $$("#curSel, select[onchange^='setCurrency']").forEach(s => s.value = cur);
  updateShipTexts(); refreshDynamic();
  toast(`Prices now in ${cur === "TZS" ? "Tanzanian Shillings" : "US Dollars"} ${CURRENCIES[cur].sym.trim()}`);
}
function updateShipTexts() {
  $$(".shipThreshTxt").forEach(e => e.textContent = `Free shipping over ${money(75)}`);
  $$(".shipThreshTxt2").forEach(e => e.textContent = `Free over ${money(75)} · 3–6 days avg.`);
}
/* ---------- Coupons (coupon centre) ---------- */
const COUPONS = {
  ABUHUB10: { pct: 10, min: 0, label: "10% off everything" },
  MAKER15: { pct: 15, min: 100, label: "15% off orders over $100" },
  KARIBU5: { pct: 5, min: 0, label: "5% off, karibu!" }
};
function couponFor(code) { return COUPONS[String(code || "").trim().toUpperCase()]; }
/* ---------- WhatsApp support ---------- */
const SUPPORT_WA = "255753026506"; // ← replace with the shop's real WhatsApp number
const vendorById = (id) => VENDORS.find(v => v.id === id);
const productById = (id) => PRODUCTS.find(p => p.id === id);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

let cart = JSON.parse(localStorage.getItem("abuhub_cart") || "[]"); // {id, qty, variant}
let wishlist = JSON.parse(localStorage.getItem("abuhub_wish") || "[]");
let filters = { q: "", cats: [], max: 600, minRating: 0, vendors: [], dropship: false, sort: "featured" };
let trendCat = "All";
let checkoutStep = 1, checkoutData = {};
let followed = JSON.parse(localStorage.getItem("abuhub_follow") || "[]");

/* ---------- Real payments (no backend needed) ----------
   HOW TO GO LIVE (5 min):
   1. Flutterwave (best for Gambia / Mobile Money / cards): dashboard.flutterwave.com → Settings → API Keys → copy PUBLIC key below.
   2. Paystack (NG/GH/ZA/KE cards + bank): dashboard.paystack.com → Settings → API Keys → copy PUBLIC key below.
   3. Stripe (international cards, no code): stripe.com → Payment Links → create link → paste below.
   4. PayPal (optional): paypal.com → create PayPal.Me link → paste below.
   Only PUBLIC keys / links go here — never put secret keys in frontend code. */
const PAYMENTS = JSON.parse(localStorage.getItem("abuhub_payments") || "null") || {
  currency: "USD",               // e.g. USD, GMD, NGN, GHS
  flutterwavePublicKey: "",      // FLWPUBK-...  (https://dashboard.flutterwave.com)
  paystackPublicKey: "",         // pk_live_... or pk_test_...
  stripePaymentLink: "",         // https://buy.stripe.com/...
  paypalMeLink: "",              // https://paypal.me/yourshop/...
  bankDetails: "M-Pesa / Airtel / bank transfer accepted — pay then tap “I’ve paid” and send proof on WhatsApp to confirm."
};
function savePayments(p){ Object.assign(PAYMENTS, p); localStorage.setItem("abuhub_payments", JSON.stringify(PAYMENTS)); }
const payReady = () => !!(PAYMENTS.flutterwavePublicKey || PAYMENTS.paystackPublicKey || PAYMENTS.stripePaymentLink || PAYMENTS.paypalMeLink);

/* ---------- Optional Render API (works fully offline without it) ----------
   After deploying server/ on Render, paste its URL here once:
   const API_BASE = "https://abuhub-api.onrender.com";
   Or set localStorage abuhub_api in the browser console. Empty = local mode. */
const API_BASE = (localStorage.getItem("abuhub_api") || "").replace(/\/$/, "");
let API_TOKEN = localStorage.getItem("abuhub_token") || "";
async function api(path, opts = {}) {
  if (!API_BASE) throw new Error("no-api");
  const r = await fetch(API_BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(API_TOKEN ? { Authorization: "Bearer " + API_TOKEN } : {}), ...(opts.headers || {}) }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ("HTTP " + r.status));
  return j;
}

/* ---------- Simple authentication (no setup needed) ---------- */
const AUTH_CFG = JSON.parse(localStorage.getItem("abuhub_auth") || "null") || {
  apiKey: "", authDomain: "", projectId: "", appId: ""
};
let _authUser = JSON.parse(localStorage.getItem("abuhub_user") || "null");
let _firebaseApp = null, _authMode = "signin";
const authReady = () => false; // simple mode: no external project required
function initAuth(){ updateAccountUI(); renderAuth(); }
function updateAccountUI(){
  const dot = $("#accountDot"), ic = $("#accountIcon");
  if (!_authUser) { dot?.classList.add("hidden"); if (ic) ic.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>`; return; }
  dot?.classList.remove("hidden");
  if (ic) ic.innerHTML = `<span class="w-6 h-6 rounded-full bg-ink text-cream grid place-items-center text-xs font-bold">${(_authUser.name || "A")[0].toUpperCase()}</span>`;
}

/* ---------- Stock urgency + social proof (deterministic per product) ---------- */
function hashN(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 997; return h; }
function stockFor(p) { return 2 + (hashN(p.id + "stock") % 8); }          // 2–9 left
function soldFor(p) { return 120 + (hashN(p.id + "sold") % 1800); }        // 120–1919 sold
function urgencyHTML(p, light) {
  const s = stockFor(p);
  if (s > 5) return `<p class="text-[12px] ${light ? "text-emerald-300" : "text-emerald-600"} font-semibold mt-1">✓ In stock · ${soldFor(p).toLocaleString()}+ sold</p>`;
  return `<p class="text-[12px] ${light ? "text-amber-300" : "text-[#BC5A28]"} font-bold mt-1">🔥 Only ${s} left · ${soldFor(p).toLocaleString()}+ sold</p>`;
}
function deliveryDate() {
  const d = new Date(Date.now() + 5 * 864e5);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
const save = () => {
  localStorage.setItem("abuhub_cart", JSON.stringify(cart));
  localStorage.setItem("abuhub_wish", JSON.stringify(wishlist));
  localStorage.setItem("abuhub_follow", JSON.stringify(followed));
  updateBadges();
};

/* ---------- Routing ---------- */
function go(view, cat) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  const map = { home: "view-home", shop: "view-shop", vendors: "view-vendors", vendor: "view-vendor", about: "view-about" };
  $("#" + (map[view] || "view-home")).classList.remove("hidden");
  $("#mobileNav").classList.add("hidden");
  if (cat) { filters.cats = [cat]; syncFilterUI(); }
  if (view === "shop") renderShop();
  if (view === "vendors") renderVendors();
  window.scrollTo({ top: 0, behavior: "smooth" });
  closeAll(true);
}

/* ---------- Toast ---------- */
function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === "ok" ? "✓" : "✦"}</span><span>${msg}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = ".4s"; setTimeout(() => el.remove(), 400); }, 3200);
}
function copyCode(){ navigator.clipboard?.writeText("ABUHUB10"); toast("Code ABUHUB10 copied — 10% off at checkout"); }

/* ---------- Cards ---------- */
function productCard(p) {
  const v = vendorById(p.vendorId);
  const wished = wishlist.includes(p.id);
  const sale = p.oldPrice ? `<span class="p-badge sale">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : (p.badge ? `<span class="p-badge">${p.badge}</span>` : "");
  return `
  <article class="p-card">
    <div class="p-img" onclick="openProduct('${p.id}')">
      <img loading="lazy" src="${p.img}" alt="${p.name}" />
      ${sale}
      <button class="p-wish ${wished ? "on" : ""}" onclick="event.stopPropagation();toggleWish('${p.id}')" aria-label="wishlist">${wished ? "♥" : "♡"}</button>
      <button class="p-quick" onclick="event.stopPropagation();quickAdd('${p.id}')">+ Quick add · ${money(p.price)}</button>
    </div>
    <div class="p-4 sm:p-5 flex flex-col gap-1.5 flex-1">
      <button onclick="openVendor('${v.id}')" class="text-[12px] font-semibold text-[#BC5A28] uppercase tracking-wider text-left hover:underline">${v.name} ✓</button>
      ${v.dropship ? `<span class="text-[11px] font-bold text-[#0AA5C2]">📦 SHIPS FROM MAKER</span>` : ""}
      <h3 onclick="openProduct('${p.id}')" class="font-display text-[16px] sm:text-[18px] leading-snug cursor-pointer hover:text-[#BC5A28] line-clamp-1">${p.name}</h3>
      <div class="flex items-center gap-1.5 text-[13px]"><span class="text-[#C8A15A] tracking-tight">${stars(p.rating)}</span><span class="text-muted">${p.rating} (${p.reviews})</span></div>
      ${urgencyHTML(p)}
      <div class="flex items-center gap-2 mt-auto pt-1">
        <strong class="text-[16px] sm:text-lg">${money(p.price)}</strong>
        ${p.oldPrice ? `<s class="text-muted text-sm">${money(p.oldPrice)}</s>` : ""}
        <button onclick="quickAdd('${p.id}')" class="ml-auto w-9 h-9 rounded-full bg-ink text-cream grid place-items-center hover:bg-[#BC5A28] transition text-lg leading-none">+</button>
      </div>
    </div>
  </article>`;
}

/* ---------- Home renders ---------- */
function renderHome() {
  // avatars
  $("#heroAvatars").innerHTML = VENDORS.slice(0, 4).map(v => `<img src="${v.avatar}" class="w-10 h-10 rounded-full border-2 border-[#FAF6F0] object-cover" alt="${v.name}" />`).join("");
  $("#heroStars").innerHTML = `<span class="text-gold tracking-tight">★★★★★</span>`;
  // categories
  $("#catGrid").innerHTML = CATEGORIES.map(c => `
    <div class="cat-card" onclick="go('shop','${c.name}')">
      <img loading="lazy" src="${c.img}" alt="${c.name}" />
      <div><strong class="font-display text-lg leading-tight">${c.name}</strong><span class="text-xs opacity-80">${c.count} goods</span></div>
    </div>`).join("");
  // trend filters
  const cats = ["All", ...new Set(PRODUCTS.map(p => p.category))];
  const chipHTML = cats.map(c => `<button onclick="setTrend('${c}')" class="chip ${c === trendCat ? "active" : ""}">${c}</button>`).join("");
  $("#trendFilters").innerHTML = chipHTML; $("#trendFiltersM").innerHTML = chipHTML;
  const list = (trendCat === "All" ? [...PRODUCTS].sort((a, b) => b.reviews - a.reviews) : PRODUCTS.filter(p => p.category === trendCat)).slice(0, 8);
  $("#trendGrid").innerHTML = list.map(productCard).join("");
  // collections
  $("#collectionGrid").innerHTML = COLLECTIONS.map(c => `
    <div class="relative rounded-[24px] overflow-hidden min-h-[320px] group cursor-pointer" onclick="go('shop')">
      <img src="${c.img}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="${c.title}" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"></div>
      <div class="absolute bottom-0 p-6 text-white"><h3 class="font-display text-2xl">${c.title}</h3><p class="text-sm opacity-80">${c.sub}</p><span class="inline-block mt-3 text-sm font-semibold bg-white text-ink rounded-full px-4 py-2">Explore →</span></div>
    </div>`).join("");
  // vendors preview (dark cards)
  $("#vendorPreview").innerHTML = VENDORS.slice(0, 4).map(v => `
    <div class="v-card overflow-hidden cursor-pointer" onclick="openVendor('${v.id}')">
      <div class="h-24 bg-cover bg-center" style="background-image:url('${v.cover}')"></div>
      <div class="p-5">
        <div class="flex items-center gap-3 -mt-10"><img src="${v.avatar}" class="w-14 h-14 rounded-2xl object-cover border-2 border-[#191512]" alt="" />
        ${v.verified ? `<span class="text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-300/30 rounded-full px-2 py-0.5">✓ Verified</span>` : ""}${v.dropship ? `<span class="text-[11px] font-bold bg-[#0AA5C2]/20 text-cyan-200 border border-cyan-300/30 rounded-full px-2 py-0.5">📦 Dropship</span>` : ""}</div>
        <h4 class="font-display text-xl mt-3">${v.name}</h4>
        <p class="text-sm text-white/60">${v.tagline} · ${v.location}</p>
        <p class="text-sm mt-2"><span class="text-gold">★ ${v.rating}</span> <span class="text-white/50">(${v.reviews}) · ${v.sales} sales</span></p>
      </div>
    </div>`).join("");
  // reviews
  const revs = [
    { n: "Maya R.", t: "The stoneware bowls are even more beautiful in person. Packaging felt like a gift to myself.", p: "Terra Speckled Serving Bowl", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80&auto=format&fit=crop" },
    { n: "James O.", t: "Ordered Yirgacheffe on Monday, brewing Friday. Roast date was 3 days before shipping. Unreal.", p: "Yirgacheffe Whole Bean", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop" },
    { n: "Sofia L.", t: "My pearl hoops survived the ocean, the gym and my toddler. Buying the necklace set next.", p: "Baroque Pearl Hoops", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop" }
  ];
  $("#reviewGrid").innerHTML = revs.map(r => `
    <div class="bg-white border border-line rounded-3xl p-6"><p class="text-gold tracking-tight">★★★★★</p>
    <p class="mt-3 leading-relaxed text-[15px]">“${r.t}”</p>
    <div class="flex items-center gap-3 mt-5"><img src="${r.img}" class="w-10 h-10 rounded-full object-cover" alt="" /><div><strong class="text-sm block">${r.n}</strong><span class="text-xs text-muted">Verified buyer · ${r.p}</span></div></div></div>`).join("");
  renderHot(); renderRanking(); renderDeals(); renderOrigins(); renderRfqCount(); renderCoupons(); renderRecent();
}
function setTrend(c){ trendCat = c; renderHome(); }

/* ----- Alibaba-style: hot searches ----- */
function renderHot(){
  const el = $("#hotGrid"); if (!el || typeof HOT_SEARCHES === "undefined") return;
  el.innerHTML = HOT_SEARCHES.map(h => `
    <div class="hot-card" onclick="hotSearch('${h.term}')">
      <img loading="lazy" src="${h.img}" alt="${h.label}" /><div>${h.label} →</div>
    </div>`).join("");
}
function hotSearch(term){
  filters = { q: term, cats: [], max: 600, minRating: 0, vendors: [], sort: "featured" };
  syncFilterUI(); go("shop");
}

/* ----- Alibaba-style: top ranking ----- */
function renderRanking(){
  const el = $("#rankRow"); if (!el) return;
  const top = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
  el.innerHTML = top.map((p, i) => `
    <div class="rank-card ${i < 3 ? "top3" : ""}" onclick="openProduct('${p.id}')">
      <span class="rank-num">${i + 1}</span>
      <img loading="lazy" src="${p.img}" alt="${p.name}" />
      <div class="p-3">
        <p class="text-[13px] font-semibold line-clamp-1">${p.name}</p>
        <p class="text-xs mt-0.5"><span class="text-[#C8A15A]">★ ${p.rating}</span> <span class="text-muted">(${p.reviews})</span></p>
        <strong class="text-sm">${money(p.price)}</strong>
      </div>
    </div>`).join("");
}

/* ----- Alibaba-style: deals + countdown + under $50 ----- */
function saleEnd(){
  let end = Number(localStorage.getItem("abuhub_sale_end") || 0);
  if (!end || end < Date.now()) { end = Date.now() + 3 * 24 * 3600 * 1000 + 7 * 3600 * 1000; localStorage.setItem("abuhub_sale_end", end); }
  return end;
}
function renderDeals(){
  const u = $("#under50Grid"); if (!u) return;
  u.innerHTML = PRODUCTS.filter(p => p.price < 50).slice(0, 4).map(p => `
    <div class="rounded-2xl overflow-hidden bg-white/10 border border-white/15 cursor-pointer hover:bg-white/20 transition" onclick="openProduct('${p.id}')">
      <img loading="lazy" src="${p.img}" class="w-full h-24 object-cover" alt="${p.name}" />
      <div class="p-2.5"><p class="text-[12px] font-semibold line-clamp-1">${p.name}</p><strong class="text-[13px] text-gold">${money(p.price)}</strong></div>
    </div>`).join("");
  tickClock();
}
function tickClock(){
  const end = saleEnd(); const t = Math.max(0, end - Date.now());
  const d = Math.floor(t / 864e5), h = Math.floor(t / 36e5) % 24, m = Math.floor(t / 6e4) % 60, s = Math.floor(t / 1e3) % 60;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = String(v).padStart(2, "0"); };
  set("cdD", d); set("cdH", h); set("cdM", m); set("cdS", s);
}
setInterval(tickClock, 1000);

/* ----- Alibaba-style: shop by origin pavilions ----- */
function countryOf(v){
  const loc = v.location || "";
  return loc.includes(",") ? loc.split(",")[1].trim() : loc;
}
function renderOrigins(){
  const el = $("#originGrid"); if (!el) return;
  const groups = {};
  VENDORS.forEach(v => { const c = countryOf(v); (groups[c] = groups[c] || []).push(v); });
  const cards = Object.keys(groups).sort().map(c => {
    const vs = groups[c];
    const n = PRODUCTS.filter(p => vs.some(v => v.id === p.vendorId)).length;
    return `<button class="origin-card" onclick="goOrigin('${c}')">
      <span class="flag">${(typeof ORIGIN_FLAGS !== "undefined" && ORIGIN_FLAGS[c]) || "🌍"}</span>
      <span><strong class="block text-[15px]">${c}</strong><span class="text-xs text-muted">${vs.length} shops · ${n} goods</span></span>
      <span class="ml-auto text-muted">→</span>
    </button>`;
  }).join("");
  const tz = `<button class="origin-card !border-dashed" onclick="openSeller()">
    <span class="flag">🇹🇿</span>
    <span><strong class="block text-[15px]">Tanzania</strong><span class="text-xs text-[#BC5A28] font-semibold">Your shop here? Join free →</span></span>
    <span class="ml-auto text-muted">+</span>
  </button>`;
  el.innerHTML = cards + (groups["Tanzania"] ? "" : tz);
}
function goOrigin(country){
  const ids = VENDORS.filter(v => countryOf(v) === country).map(v => v.id);
  filters = { q: "", cats: [], max: 600, minRating: 0, vendors: ids, dropship: false, sort: "featured" };
  syncFilterUI(); go("shop");
  toast(`Showing handmade goods from ${country} ${ (typeof ORIGIN_FLAGS !== "undefined" && ORIGIN_FLAGS[country]) || ""}`);
}

/* ----- Recently viewed (Amazon-style) ----- */
function pushRecent(id) {
  let r = JSON.parse(localStorage.getItem("abuhub_recent") || "[]").filter(x => x !== id);
  r.unshift(id); r = r.slice(0, 10);
  localStorage.setItem("abuhub_recent", JSON.stringify(r));
}
function clearRecent() { localStorage.setItem("abuhub_recent", "[]"); renderRecent(); }
function renderRecent() {
  const w = $("#recentWrap"), row = $("#recentRow"); if (!w || !row) return;
  const ids = JSON.parse(localStorage.getItem("abuhub_recent") || "[]").map(productById).filter(Boolean);
  w.classList.toggle("hidden", !ids.length);
  row.innerHTML = ids.map(p => `
    <div class="rank-card" onclick="openProduct('${p.id}')">
      <img loading="lazy" src="${p.img}" alt="${p.name}" />
      <div class="p-3"><p class="text-[13px] font-semibold line-clamp-1">${p.name}</p><strong class="text-sm">${money(p.price)}</strong></div>
    </div>`).join("");
}

/* ----- Coupon centre (SHEIN-style) ----- */
function renderCoupons() {
  const el = $("#couponRow"); if (!el) return;
  el.innerHTML = Object.keys(COUPONS).map(code => `
    <button onclick="copyCoupon('${code}')" class="flex items-center gap-2 bg-white/10 border border-dashed border-gold/70 rounded-xl px-3.5 py-2 text-sm hover:bg-white/20 transition">
      <span class="font-bold text-gold">−${COUPONS[code].pct}%</span><span class="font-mono font-bold">${code}</span><span class="opacity-60 text-xs">tap to copy</span>
    </button>`).join("");
}
function copyCoupon(code) {
  navigator.clipboard?.writeText(code);
  checkoutData.promo = code;
  toast(`Code ${code} copied — ${COUPONS[code].label} ✓ (applied at checkout)`);
}
function couponDiscount(sub) {
  const c = couponFor(checkoutData.promo);
  if (!c || sub < c.min) return 0;
  return sub * (c.pct / 100);
}

/* ----- Order tracking (Jumia-style) ----- */
function openTrack() { showModal("trackModal"); $("#trackOut").innerHTML = ""; }
function trackOrder() {
  const ref = ($("#trackIn").value || "").trim().toUpperCase();
  const out = $("#trackOut");
  if (!ref) { out.innerHTML = `<p class="text-sm text-muted">Enter your order reference first.</p>`; return; }
  const o = JSON.parse(localStorage.getItem("abuhub_orders") || "[]").find(x => x.ref.toUpperCase() === ref);
  if (!o) { out.innerHTML = `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">No order <strong>${ref}</strong> on this device. Orders live where they were placed — ${API_BASE ? "also checking cloud…" : "try the same browser you ordered with."}</div>`; return; }
  const ageH = (Date.now() - new Date(o.date || Date.now()).getTime()) / 36e5;
  const stage = ageH < 2 ? 1 : ageH < 24 ? 2 : ageH < 72 ? 3 : 4;
  const steps = ["Placed", "Packed", "Shipped", "Delivered"];
  out.innerHTML = `
    <div class="bg-white border border-line rounded-2xl p-4">
      <p class="text-sm"><strong>${o.ref}</strong> · ${money(o.total)} · ${o.method || ""}</p>
      <div class="flex items-center mt-3">${steps.map((s, i) => `
        <div class="flex-1 text-center"><div class="w-7 h-7 mx-auto rounded-full grid place-items-center text-xs font-bold ${i < stage ? "bg-emerald-500 text-white" : "bg-line text-muted"}">${i < stage ? "✓" : i + 1}</div>
        <p class="text-[11px] mt-1 ${i < stage ? "font-bold" : "text-muted"}">${s}</p></div>${i < 3 ? `<div class="flex-1 h-0.5 -mt-6 ${i < stage - 1 ? "bg-emerald-500" : "bg-line"}"></div>` : ""}`).join("")}</div>
      <p class="text-xs text-muted mt-3">Makers ship in 1–2 days · tracked 3–6 day delivery · need help? <a class="underline font-semibold" target="_blank" href="https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent("Hi Abu.Hub! Order " + o.ref)}">WhatsApp us</a></p>
    </div>`;
}

/* ----- In-app chat assistant ----- */
let _chatOpened = false;
function toggleChat(force) {
  const p = $("#chatPanel"), open = force !== undefined ? force : p.classList.contains("hidden");
  p.classList.toggle("hidden", !open); p.classList.toggle("flex", open);
  $("#chatIcoOpen").classList.toggle("hidden", open);
  $("#chatIcoClose").classList.toggle("hidden", !open);
  if (open) {
    $("#chatDot").classList.add("hidden");
    if (!_chatOpened) { _chatOpened = true; botSay(`Karibu to <strong>Abu.Hub</strong> ✦ I can track orders, explain shipping & returns, or share discount codes. What do you need?`); }
    setTimeout(() => $("#chatIn").focus(), 100);
  }
}
function chipChat(t) { toggleChat(true); userSay(t); setTimeout(() => botReply(t), 350); }
function sendChat(e) {
  e.preventDefault();
  const inp = $("#chatIn"), t = inp.value.trim();
  if (!t) return;
  inp.value = ""; userSay(t);
  const tp = document.createElement("div");
  tp.className = "msg-bot typing"; tp.innerHTML = "<span></span> <span></span> <span></span>";
  $("#chatMsgs").appendChild(tp); scrollChat();
  setTimeout(() => { tp.remove(); botReply(t); }, 700);
}
function userSay(t) {
  const d = document.createElement("div");
  d.className = "msg-user"; d.textContent = t;
  $("#chatMsgs").appendChild(d); scrollChat();
}
function botSay(html) {
  const d = document.createElement("div");
  d.className = "msg-bot"; d.innerHTML = html;
  $("#chatMsgs").appendChild(d); scrollChat();
}
function scrollChat() { const m = $("#chatMsgs"); m.scrollTop = m.scrollHeight; }
function botReply(raw) {
  const t = raw.toLowerCase();
  const wa = (msg) => `<a target="_blank" href="https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(msg)}">WhatsApp us →</a>`;
  if (/(track|where.*order|status|delivery status)/.test(t)) {
    const orders = JSON.parse(localStorage.getItem("abuhub_orders") || "[]");
    botSay(orders.length
      ? `Your latest order is <strong>${orders[0].ref}</strong> (${money(orders[0].total)}). Tap <strong>📦 Track</strong> in the menu and enter the ref for the live timeline.`
      : `No orders on this device yet. After checkout you'll get a ref like <strong>AH-XXXXXX</strong> — paste it into <strong>📦 Track</strong> anytime.`);
    return;
  }
  if (/(ship|deliver|cost.*send|how long)/.test(t)) {
    botSay(`🚚 Tracked delivery in <strong>3–6 days</strong>. Shipping is <strong>${money(6.95)}</strong> — <strong>FREE over ${money(75)}</strong>. Makers dispatch in 1–2 days.`);
    return;
  }
  if (/(return|refund|exchange|wrong|damaged|broken)/.test(t)) {
    botSay(`↩️ <strong>30-day money-back guarantee.</strong> Wrong, damaged or not-as-described? Prepaid return label + full refund. Just ${wa("Hi Abu.Hub! I need a return.")} with your order ref.`);
    return;
  }
  if (/(discount|coupon|promo|code|offer|sale|deal)/.test(t)) {
    botSay(`🏷️ Active codes: <strong>ABUHUB10</strong> (−10%), <strong>MAKER15</strong> (−15% over ${money(100)}), <strong>KARIBU5</strong> (−5%). Tap them in the sale banner to copy — I applied nothing yet, add yours at checkout.`);
    return;
  }
  if (/(pay|mpesa|m-pesa|mobile|card|cash|delivery.*pay|flutterwave)/.test(t)) {
    botSay(`💳 We accept cards, Mobile Money & bank via Flutterwave/Paystack, PayPal, Stripe — or <strong>Cash / M-Pesa on delivery</strong> at checkout. 100% buyer protection on every order.`);
    return;
  }
  if (/(custom|bespoke|tailor|bulk|wedding|request)/.test(t)) {
    botSay(`✦ Love it — post it in <strong>Request a custom order</strong> (homepage) and matching makers quote you within ~48h. Free to post.`);
    return;
  }
  if (/(sell|vendor|shop.*open|become.*seller)/.test(t)) {
    botSay(`🛍️ Opening a shop is <strong>free</strong> — $0 listing fees, 8% max commission, live in 24h. Tap <strong>Sell on Abu.Hub</strong> up top.`);
    return;
  }
  if (/(dropship|drop ship|resell|reseller|wholesale|no stock|without stock)/.test(t)) {
    botSay(`📦 Yes! <strong>Dropship partners</strong> ship straight to your customer — you never hold stock. Look for the <strong>📦 SHIPS FROM MAKER</strong> tag, filter it in Shop → Filters, and keep your margin. Makers handle packing in unbranded boxes.`);
    return;
  }
  if (/(human|agent|person|call|phone|whatsapp|help|support)/.test(t)) {
    botSay(`💬 A human is one tap away: ${wa("Hi Abu.Hub! I need help.")} We usually reply within the hour, 8am–10pm EAT.`);
    return;
  }
  if (/(hi|hello|hey|mambo|habari|morning|evening)/.test(t)) {
    botSay(`Hello! 👋 Ask me about <strong>tracking, shipping, returns, discounts</strong> — or type <strong>human</strong> anytime.`);
    return;
  }
  if (/(thank|asante|shukran|great|bye)/.test(t)) {
    botSay(`Karibu sana! ✦ Anything else — or tap 🛍️ to keep shopping.`);
    return;
  }
  botSay(`Got it — for that one a human helps best: ${wa("Hi Abu.Hub! " + raw.slice(0, 120))} Or try asking about <strong>orders, shipping, returns or discounts</strong>.`);
}

/* ----- Alibaba-style: RFQ custom orders ----- */
function openRFQ(){ showModal("rfqModal"); }
function submitRFQ(e){
  e.preventDefault();
  const rq = { title: $("#rTitle").value.trim(), cat: $("#rCat").value, qty: $("#rQty").value, budget: $("#rBudget").value.trim(), contact: $("#rContact").value.trim(), details: $("#rDetails").value.trim(), date: new Date().toISOString() };
  // Try cloud API first, fall back to on-device store
  api("/api/rfq", { method: "POST", body: JSON.stringify(rq) }).catch(() => null).finally(() => {
    const all = JSON.parse(localStorage.getItem("abuhub_rfq") || "[]");
    all.unshift(rq); localStorage.setItem("abuhub_rfq", JSON.stringify(all));
  });
  e.target.reset(); closeAll(); renderRfqCount();
  toast("Request posted ✓ Matching makers reply within ~48h.");
}
function renderRfqCount(){
  const el = $("#rfqCount"); if (!el) return;
  const n = 2300 + JSON.parse(localStorage.getItem("abuhub_rfq") || "[]").length;
  el.textContent = `${n.toLocaleString()}+ custom requests posted · join them free`;
}

/* ---------- Shop ---------- */
function buildFilterUI() {
  const cats = [...new Set(PRODUCTS.map(p => p.category))];
  $("#catFilters").innerHTML = cats.map(c => `<label class="flex items-center gap-2.5 text-sm cursor-pointer hover:text-[#BC5A28]"><input type="checkbox" ${filters.cats.includes(c) ? "checked" : ""} onchange="toggleCat('${c}')" class="w-4 h-4 accent-[#BC5A28]" /> ${c}</label>`).join("");
  $("#rateFilters").innerHTML = [0, 4.5, 4.8].map(r => `<button onclick="setFilter('minRating',${r})" class="chip !text-[12px] ${filters.minRating === r ? "active" : ""}">${r === 0 ? "Any" : "★ " + r + "+"}</button>`).join("");
  $("#vendorFilters").innerHTML = VENDORS.map(v => `<label class="flex items-center gap-2.5 text-sm cursor-pointer"><input type="checkbox" ${filters.vendors.includes(v.id) ? "checked" : ""} onchange="toggleVendorF('${v.id}')" class="w-4 h-4 accent-[#BC5A28]" /> <span class="line-clamp-1">${v.name}</span></label>`).join("");
}
function syncFilterUI(){ buildFilterUI(); $("#shopSearch").value = filters.q; $("#priceRange").value = filters.max; $("#priceVal").textContent = money(filters.max); $("#sortSel").value = filters.sort; const ds = $("#dsCheck"); if (ds) ds.checked = !!filters.dropship; }
function toggleCat(c){ filters.cats.includes(c) ? filters.cats = filters.cats.filter(x => x !== c) : filters.cats.push(c); syncFilterUI(); renderShop(); }
function toggleVendorF(id){ filters.vendors.includes(id) ? filters.vendors = filters.vendors.filter(x => x !== id) : filters.vendors.push(id); syncFilterUI(); renderShop(); }
function setFilter(k, v){ if (k === "max") $("#priceVal").textContent = money(Number(v)); filters[k] = (k === "max" || k === "minRating") ? Number(v) : v; syncFilterUI(); renderShop(); }
function clearFilters(){ filters = { q: "", cats: [], max: 600, minRating: 0, vendors: [], dropship: false, sort: "featured" }; $("#headerSearch").value = ""; syncFilterUI(); renderShop(); }
function toggleFilters(){ $("#filterPanel").classList.toggle("hidden"); }
function toggleDropship(){ filters.dropship = !filters.dropship; syncFilterUI(); renderShop(); toast(filters.dropship ? "Showing ships-from-maker goods only 📦" : "Showing all goods"); }
function onHeaderSearch(v){ filters.q = v; if (!$("#view-shop").classList.contains("hidden")) { $("#shopSearch").value = v; renderShop(); } else if (v.length > 1) { go("shop"); $("#shopSearch").value = v; syncFilterUI(); renderShop(); } }

function filteredProducts() {
  let list = [...PRODUCTS];
  if (filters.q) { const q = filters.q.toLowerCase(); list = list.filter(p => (p.name + p.category + vendorById(p.vendorId).name).toLowerCase().includes(q)); }
  if (filters.cats.length) list = list.filter(p => filters.cats.includes(p.category));
  list = list.filter(p => p.price <= filters.max && p.rating >= filters.minRating);
  if (filters.vendors.length) list = list.filter(p => filters.vendors.includes(p.vendorId));
  if (filters.dropship) list = list.filter(p => vendorById(p.vendorId).dropship);
  if (filters.sort === "low") list.sort((a, b) => a.price - b.price);
  if (filters.sort === "high") list.sort((a, b) => b.price - a.price);
  if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  return list;
}
function renderShop() {
  buildFilterUI();
  const list = filteredProducts();
  $("#shopCount").textContent = `· ${list.length} goods`;
  $("#activeCats").innerHTML = filters.cats.map(c => `<span class="chipf">${c} <button onclick="toggleCat('${c}')">✕</button></span>`).join("") + (filters.dropship ? `<span class="chipf">📦 Ships from maker <button onclick="toggleDropship()">✕</button></span>` : "") + (filters.q ? `<span class="chipf">“${filters.q}” <button onclick="setFilter('q','');document.querySelector('#headerSearch').value=''">✕</button></span>` : "");
  $("#shopGrid").innerHTML = list.map(productCard).join("");
  $("#shopEmpty").classList.toggle("hidden", list.length > 0);
}

/* ---------- Vendors ---------- */
function renderVendors(q = "") {
  const query = (q || "").toLowerCase();
  const list = VENDORS.filter(v => (v.name + v.tagline + v.location).toLowerCase().includes(query));
  $("#vendorGrid").innerHTML = list.map(v => {
    const isF = followed.includes(v.id);
    return `
    <div class="v-card-light overflow-hidden">
      <div class="h-28 bg-cover bg-center cursor-pointer" style="background-image:url('${v.cover}')" onclick="openVendor('${v.id}')"></div>
      <div class="p-5">
        <div class="flex items-center gap-3 -mt-11"><img src="${v.avatar}" class="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow" alt="" />
        <span class="mt-8 text-[11px] font-bold ${v.verified ? "text-emerald-600" : "text-muted"}">${v.verified ? "✓ Verified seller" : ""}</span>${v.dropship ? `<span class="mt-8 text-[11px] font-bold text-[#0AA5C2]">📦 Dropship partner</span>` : ""}</div>
        <h4 class="font-display text-xl mt-2 cursor-pointer hover:text-[#BC5A28]" onclick="openVendor('${v.id}')">${v.name}</h4>
        <p class="text-sm text-muted">${v.tagline} · ${v.location}</p>
        <p class="text-sm mt-1.5"><span class="text-[#C8A15A]">★ ${v.rating}</span> <span class="text-muted">(${v.reviews}) · ${v.products} products</span></p>
        <div class="flex gap-2 mt-4">
          <button onclick="openVendor('${v.id}')" class="btn-line text-[13px] flex-1 !py-2.5">Visit shop</button>
          <button onclick="toggleFollow('${v.id}')" class="btn-line text-[13px] flex-1 !py-2.5 ${isF ? "!bg-ink !text-cream !border-ink" : ""}">${isF ? "✓ Following" : "+ Follow"}</button>
        </div>
      </div>
    </div>`;
  }).join("") || `<p class="text-muted col-span-full py-10 text-center">No vendors match “${q}”.</p>`;
}
function toggleFollow(id){
  followed.includes(id) ? followed = followed.filter(x => x !== id) : followed.push(id);
  save(); renderVendors($("#vendorSearch")?.value || "");
  toast(followed.includes(id) ? "Following — you'll hear about new drops first ✦" : "Unfollowed");
}
function openVendor(id){
  const v = vendorById(id); if (!v) return;
  const prods = PRODUCTS.filter(p => p.vendorId === id);
  const isF = followed.includes(id);
  $("#vendorHero").innerHTML = `
    <div class="rounded-[28px] overflow-hidden border border-line bg-white">
      <div class="h-48 sm:h-64 bg-cover bg-center" style="background-image:url('${v.cover}')"></div>
      <div class="p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center">
        <img src="${v.avatar}" class="w-20 h-20 rounded-3xl object-cover -mt-14 border-4 border-white shadow" alt="" />
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2"><h2 class="font-display text-3xl">${v.name}</h2>${v.verified ? `<span class="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">✓ VERIFIED SELLER</span>` : ""}${v.dropship ? `<span class="text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-2.5 py-1">📦 DROPSHIP PARTNER</span>` : ""}</div>
          <p class="text-muted text-sm mt-1">${v.tagline} · ${v.location} · On Abu.Hub since ${v.joined}</p>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed">${v.story}</p>
          <p class="text-sm mt-3"><span class="text-[#C8A15A] font-semibold">★ ${v.rating}</span> <span class="text-muted">${v.reviews} reviews · ${v.sales} sales · ${prods.length} goods live</span></p>
        </div>
        <div class="flex sm:flex-col gap-2 shrink-0">
          <button onclick="toggleFollow('${v.id}');openVendor('${v.id}')" class="btn-ink !py-3 text-sm whitespace-nowrap">${isF ? "✓ Following" : "+ Follow shop"}</button>
          <button onclick="toast('Message sent! Makers usually reply within a day ✦','warn')" class="btn-line text-sm whitespace-nowrap">💬 Message</button>
        </div>
      </div>
    </div>`;
  $("#vendorProducts").innerHTML = prods.map(productCard).join("") || `<p class="text-muted">No goods yet.</p>`;
  go("vendor");
  $("#view-vendor").classList.remove("hidden"); $("#view-vendors").classList.add("hidden"); $("#view-home").classList.add("hidden"); $("#view-shop").classList.add("hidden"); $("#view-about").classList.add("hidden");
}

/* ---------- Product modal ---------- */
let modalQty = 1, modalVariant = null;
function openProduct(id){
  const p = productById(id); if (!p) return;
  pushRecent(id);
  const v = vendorById(p.vendorId);
  modalQty = 1; modalVariant = p.colors[0];
  const wished = wishlist.includes(p.id);
  const related = PRODUCTS.filter(x => x.id !== p.id && (x.category === p.category || x.vendorId === p.vendorId)).slice(0, 4);
  $("#productCard").innerHTML = `
    <div class="grid md:grid-cols-2">
      <div class="relative bg-[#F3ECE1] min-h-[320px] md:min-h-[540px]">
        <img src="${p.img}" class="absolute inset-0 w-full h-full object-cover" alt="${p.name}" />
        ${p.oldPrice ? `<span class="p-badge sale !top-4 !left-4">Save ${money(p.oldPrice - p.price)}</span>` : ""}
      </div>
      <div class="p-6 sm:p-9">
        <div class="flex items-start justify-between gap-3">
          <button onclick="openVendor('${v.id}');closeModals()" class="text-[12px] font-bold text-[#BC5A28] uppercase tracking-widest hover:underline">${v.name} ✓ · ${v.location}</button>
          <button onclick="closeAll()" class="x-btn shrink-0">✕</button>
        </div>
        <h3 class="font-display text-3xl sm:text-4xl leading-tight mt-2">${p.name}</h3>
        <div class="flex items-center gap-2 mt-2 text-sm"><span class="text-[#C8A15A]">${stars(p.rating)}</span><span class="font-semibold">${p.rating}</span><span class="text-muted">· ${p.reviews} reviews · ${p.category}</span></div>
        <div class="flex items-baseline gap-3 mt-4"><strong class="font-display text-3xl">${money(p.price)}</strong>${p.oldPrice ? `<s class="text-muted">${money(p.oldPrice)}</s><span class="text-xs font-bold bg-[#BC5A28] text-white rounded-full px-2 py-1">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}</div>
        <p class="text-[15px] text-muted leading-relaxed mt-4">${p.desc}</p>
        ${urgencyHTML(p)}
        <p class="text-[13px] mt-1.5">🚚 Order today, get it by <strong>${deliveryDate()}</strong> · <span class="text-muted">Free over ${money(75)}</span></p>
        ${v.dropship ? `<p class="text-[13px] mt-1.5 bg-[#0AA5C2]/10 border border-[#0AA5C2]/30 rounded-xl px-3 py-2">📦 <strong>Dropship:</strong> ships directly from ${v.name} (${v.location}) in 5–9 days. Unbranded packaging on request.</p>` : `<p class="text-[12px] text-muted mt-1">Ships from Abu.Hub hub in 3–6 days, tracked.</p>`}
        <p class="f-label mt-5">Finish / Variant</p>
        <div class="flex flex-wrap gap-2" id="variantRow">${p.colors.map((c, i) => `<button onclick="pickVariant('${c}',this)" class="chip ${i === 0 ? "active" : ""}">${c}</button>`).join("")}</div>
        <div class="flex items-center gap-3 mt-6">
          <div class="flex items-center border border-line bg-white rounded-full">
            <button onclick="chQty(-1)" class="w-11 h-11 grid place-items-center text-lg">−</button>
            <strong id="mQty" class="w-8 text-center">1</strong>
            <button onclick="chQty(1)" class="w-11 h-11 grid place-items-center text-lg">+</button>
          </div>
          <button onclick="addToCart('${p.id}',true)" class="btn-ink flex-1 !py-3.5">Add to basket · <span id="mTotal">${money(p.price)}</span></button>
          <button onclick="toggleWish('${p.id}');openProduct('${p.id}')" class="w-[52px] h-[52px] rounded-full border border-line bg-white grid place-items-center text-xl hover:bg-ink hover:text-cream transition">${wished ? "♥" : "♡"}</button>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-5 text-center text-[12px]">
          <div class="bg-white border border-line rounded-2xl p-3">🚚<br><strong>Free over $75</strong><br><span class="text-muted">3–6 day track</span></div>
          <div class="bg-white border border-line rounded-2xl p-3">↩<br><strong>30-day returns</strong><br><span class="text-muted">Prepaid label</span></div>
          <div class="bg-white border border-line rounded-2xl p-3">🛡<br><strong>Buyer cover</strong><br><span class="text-muted">Full refund</span></div>
        </div>
        <button onclick="addToCart('${p.id}',true);closeModals();openCheckout()" class="w-full mt-3 bg-[#BC5A28] text-white font-bold rounded-full py-4 hover:bg-[#9A451C] transition">Buy it now →</button>
        ${related.length ? `<p class="f-label mt-6">Pairs well with</p>
        <div class="grid grid-cols-2 gap-2.5">${related.map(r => `
          <div class="bg-white border border-line rounded-2xl overflow-hidden cursor-pointer hover:border-ink transition" onclick="openProduct('${r.id}')">
            <img src="${r.img}" class="w-full h-24 object-cover" alt="${r.name}" />
            <div class="p-2.5"><p class="text-[12px] font-semibold line-clamp-1">${r.name}</p><strong class="text-[13px]">${money(r.price)}</strong></div>
          </div>`).join("")}</div>` : ""}
      </div>
    </div>`;
  showModal("productModal");
  window._modalPid = id;
}
function pickVariant(c, btn){ modalVariant = c; $$("#variantRow .chip").forEach(b => b.classList.remove("active")); btn.classList.add("active"); }
function chQty(d){ modalQty = Math.max(1, Math.min(9, modalQty + d)); $("#mQty").textContent = modalQty; const p = productById(window._modalPid); $("#mTotal").textContent = money(p.price * modalQty); }

/* ---------- Wishlist ---------- */
function toggleWish(id){
  wishlist.includes(id) ? wishlist = wishlist.filter(x => x !== id) : wishlist.push(id);
  save(); refreshDynamic();
  toast(wishlist.includes(id) ? "Saved to wishlist ♥" : "Removed from wishlist", wishlist.includes(id) ? "ok" : "warn");
}
function refreshDynamic(){
  if (!$("#view-home").classList.contains("hidden")) renderHome();
  if (!$("#view-shop").classList.contains("hidden")) renderShop();
  renderWishItems(); renderCartItems();
}

/* ---------- Cart ---------- */
function quickAdd(id){ addToCart(id, false, 1); openCart(); }
function addToCart(id, fromModal = false, qty = null){
  const q = qty || (fromModal ? modalQty : 1);
  const variant = fromModal ? modalVariant : (productById(id).colors[0]);
  const line = cart.find(l => l.id === id && l.variant === variant);
  line ? line.qty = Math.min(9, line.qty + q) : cart.push({ id, qty: q, variant });
  save(); renderCartItems();
  toast(`${productById(id).name} added to basket ✓`);
}
function setQty(idx, d){
  cart[idx].qty += d;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  save(); renderCartItems();
}
function removeLine(idx){ cart.splice(idx, 1); save(); renderCartItems(); }
function cartSubtotal(){ return cart.reduce((s, l) => s + productById(l.id).price * l.qty, 0); }

function renderCartItems(){
  const box = $("#cartItems");
  if (!cart.length) { box.innerHTML = `<div class="text-center py-12"><p class="text-5xl">🧺</p><p class="font-display text-2xl mt-4">Your basket is empty</p><p class="text-muted text-sm mt-1">Beautiful handmade things await.</p><button onclick="closeAll();go('shop')" class="btn-ink mt-5">Start shopping</button></div>`; }
  else box.innerHTML = cart.map((l, i) => {
    const p = productById(l.id); const v = vendorById(p.vendorId);
    return `<div class="flex gap-3 bg-white border border-line rounded-2xl p-3">
      <img src="${p.img}" onclick="openProduct('${p.id}')" class="w-[76px] h-[86px] rounded-xl object-cover cursor-pointer shrink-0" alt="" />
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-bold text-[#BC5A28] uppercase tracking-wider">${v.name}</p>
        <h4 class="font-semibold text-[14px] leading-snug line-clamp-1 cursor-pointer" onclick="openProduct('${p.id}')">${p.name}</h4>
        <p class="text-xs text-muted">${l.variant} · ${money(p.price)} each</p>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center border border-line rounded-full"><button onclick="setQty(${i},-1)" class="w-8 h-8 grid place-items-center">−</button><strong class="w-6 text-center text-sm">${l.qty}</strong><button onclick="setQty(${i},1)" class="w-8 h-8 grid place-items-center">+</button></div>
          <strong class="text-sm">${money(p.price * l.qty)}</strong>
        </div>
      </div>
      <button onclick="removeLine(${i})" class="text-muted hover:text-red-600 text-lg self-start">×</button>
    </div>`;
  }).join("");
  const sub = cartSubtotal();
  const ship = sub === 0 ? 0 : (sub >= 75 ? 0 : 6.95);
  $("#cartSub").textContent = money(sub);
  $("#cartShip").textContent = sub === 0 ? "—" : (ship === 0 ? "FREE ✓" : money(ship));
  $("#cartN").textContent = cart.length ? `(${cart.reduce((s, l) => s + l.qty, 0)} items)` : "";
  const pct = Math.min(100, (sub / 75) * 100);
  $("#shipBar").style.width = pct + "%";
  $("#shipBarTxt").innerHTML = sub >= 75 ? `<strong>🎉 FREE shipping unlocked!</strong>` : `You’re <strong>${money(75 - sub)}</strong> away from FREE shipping`;
}
function renderWishItems(){
  const box = $("#wishItems");
  box.innerHTML = wishlist.length ? wishlist.map(id => {
    const p = productById(id); if (!p) return "";
    return `<div class="flex gap-3 bg-white border border-line rounded-2xl p-3">
      <img src="${p.img}" class="w-[70px] h-[80px] rounded-xl object-cover cursor-pointer" onclick="openProduct('${p.id}')" alt="" />
      <div class="flex-1"><h4 class="font-semibold text-sm line-clamp-1">${p.name}</h4><p class="text-xs text-muted">${vendorById(p.vendorId).name}</p><strong class="text-sm">${money(p.price)}</strong>
      <div class="flex gap-2 mt-2"><button onclick="addToCart('${p.id}')" class="text-xs font-bold bg-ink text-cream rounded-full px-3 py-1.5">Add to basket</button><button onclick="toggleWish('${p.id}')" class="text-xs underline text-muted">Remove</button></div></div>
    </div>`;
  }).join("") : `<div class="text-center py-12"><p class="text-5xl">♡</p><p class="font-display text-2xl mt-3">Nothing saved yet</p><p class="text-muted text-sm">Tap the heart on anything you love.</p></div>`;
}
function updateBadges(){
  const n = cart.reduce((s, l) => s + l.qty, 0);
  const cc = $("#cartCount"), wc = $("#wishCount");
  cc.textContent = n; cc.classList.toggle("hidden", !n); cc.classList.toggle("flex", !!n);
  wc.textContent = wishlist.length; wc.classList.toggle("hidden", !wishlist.length); wc.classList.toggle("flex", !!wishlist.length);
}

/* ---------- Drawers & modals ---------- */
function showOverlay(){ const o = $("#overlay"); o.classList.remove("hidden"); requestAnimationFrame(() => o.style.opacity = "1"); }
function hideOverlay(){ const o = $("#overlay"); o.style.opacity = "0"; setTimeout(() => o.classList.add("hidden"), 250); }
function openCart(){ closeDrawers(true); renderCartItems(); $("#cartDrawer").classList.add("open"); showOverlay(); }
function openWishlist(){ closeDrawers(true); renderWishItems(); $("#wishDrawer").classList.add("open"); showOverlay(); }
function closeDrawers(silent){ $$(".drawer").forEach(d => d.classList.remove("open")); if (!silent) hideOverlay(); }
function showModal(id){ closeModals(true); $("#" + id).classList.remove("hidden"); showOverlay(); document.body.style.overflow = "hidden"; }
function closeModals(silent){ ["productModal", "checkoutModal", "authModal", "sellerModal", "rfqModal", "trackModal"].forEach(m => $("#" + m).classList.add("hidden")); if (!silent) { hideOverlay(); document.body.style.overflow = ""; } }
function closeAll(silent){ closeDrawers(true); closeModals(true); if (!silent) { hideOverlay(); document.body.style.overflow = ""; } }
function openAuth(){ showModal("authModal"); renderAuth(); }
function openSeller(){ showModal("sellerModal"); }
function mockAuth(via){ toast("Old demo login retired — connect Firebase below for real auth.", "warn"); renderAuth(); }
/* ----- Simple auth with password (stored on this device, no setup) ----- */
function getAccounts(){ return JSON.parse(localStorage.getItem("abuhub_accounts") || "[]"); }
function saveAccounts(a){ localStorage.setItem("abuhub_accounts", JSON.stringify(a)); }
function renderAuth(){
  const body = $("#authBody"); if (!body) return;
  if (_authUser) {
    const orders = JSON.parse(localStorage.getItem("abuhub_orders") || "[]").filter(o => !_authUser.email || o.email === _authUser.email);
    body.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <span class="w-11 h-11 rounded-full bg-ink text-cream grid place-items-center font-bold">${(_authUser.name || "A")[0].toUpperCase()}</span>
        <div class="min-w-0"><strong class="block truncate">${_authUser.name || "Member"}</strong><span class="text-xs text-muted truncate block">${_authUser.email || ""}</span></div>
      </div>
      <p class="f-label mt-4">Your orders (${orders.length})</p>
      <div class="max-h-40 overflow-auto space-y-2">${orders.map(o => `<div class="flex justify-between text-[13px] bg-white border border-line rounded-xl px-3 py-2"><span><strong>${o.ref}</strong> · ${o.items.length} items</span><strong>$${Number(o.total).toFixed(2)}</strong></div>`).join("") || `<p class="text-sm text-muted">No orders yet — they’ll appear here after checkout.</p>`}</div>
      <button onclick="logout()" class="btn-line w-full mt-4">Sign out</button>`;
    return;
  }
  const isSignup = _authMode === "signup";
  body.innerHTML = `
    <div class="flex gap-3 text-[14px] font-semibold mb-3">
      <button onclick="setAuthMode('signin');renderAuth()" class="${!isSignup ? "underline" : "text-muted"}">Sign in</button>
      <button onclick="setAuthMode('signup');renderAuth()" class="${isSignup ? "underline" : "text-muted"}">Create account</button>
    </div>
    <form onsubmit="simpleLogin(event, ${isSignup})" class="space-y-2.5">
      ${isSignup ? `<input id="a_name" required placeholder="Your name" class="f-input" />` : ""}
      <input id="a_email" required type="email" placeholder="Email address" class="f-input" />
      <input id="a_pass" required type="password" minlength="4" placeholder="Password" class="f-input" />
      <button class="btn-ink w-full">${isSignup ? "Create account →" : "Sign in →"}</button>
    </form>
    <p class="text-xs text-muted text-center mt-3">Protected by password on this device.</p>`;
}
function simpleLogin(e, isSignup){
  e.preventDefault();
  const email = $("#a_email").value.trim().toLowerCase(), pass = $("#a_pass").value;
  const nameEl = $("#a_name"); const name = nameEl ? nameEl.value.trim() : "";
  const done = (u) => {
    _authUser = u;
    localStorage.setItem("abuhub_user", JSON.stringify(_authUser));
    if (checkoutData) checkoutData.email = _authUser.email;
    updateAccountUI(); closeAll(); toast(`Karibu, ${_authUser.name.split(" ")[0]} ✓`);
  };
  // Cloud auth when API configured — falls back to on-device accounts
  if (API_BASE) {
    api(isSignup ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST", body: JSON.stringify({ name, email, password: pass })
    }).then(j => { API_TOKEN = j.token; localStorage.setItem("abuhub_token", API_TOKEN); done(j.user); })
      .catch(err => {
        if (String(err.message).includes("exists")) { _authMode = "signin"; renderAuth(); }
        toast(err.message, "warn");
      });
    return;
  }
  const accs = getAccounts();
  const found = accs.find(a => a.email === email);
  if (isSignup) {
    if (!name) { toast("Enter your name.", "warn"); return; }
    if (found) { toast("Account exists — sign in instead.", "warn"); _authMode = "signin"; renderAuth(); return; }
    accs.push({ name, email, pass: btoa(pass) });
    saveAccounts(accs);
    _authUser = { name, email };
  } else {
    if (!found) { toast("No account for this email — create one first.", "warn"); _authMode = "signup"; renderAuth(); return; }
    if (found.pass !== btoa(pass)) { toast("Wrong password. Try again.", "warn"); return; }
    _authUser = { name: found.name, email: found.email };
  }
  localStorage.setItem("abuhub_user", JSON.stringify(_authUser));
  if (checkoutData) checkoutData.email = _authUser.email;
  updateAccountUI(); closeAll(); toast(`Karibu, ${_authUser.name.split(" ")[0]} ✓`);
}
function setAuthMode(m){ _authMode = m; renderAuth(); }
function saveAuthCfg(){ toast("No setup needed — just enter name + email.", "warn"); }
function resetAuthCfg(){ renderAuth(); }
function demoLogin(){ renderAuth(); }
function fb(){ return firebase.auth(); }
async function emailLogin(e){ e.preventDefault(); simpleLogin(e); }
async function emailSignup(e){ e.preventDefault(); simpleLogin(e); }
async function googleLogin(){ toast("Google login needs a Firebase project — skipped for now. Use name + email.", "warn"); }
let _confirm = null;
async function phoneLogin(){ toast("Phone OTP needs a Firebase project — skipped for now. Use name + email.", "warn"); }
async function verifyCode(){ toast("Phone OTP disabled in simple mode.", "warn"); }
async function logout(){
  try { if (authReady() && typeof firebase !== "undefined" && firebase.apps.length) await fb().signOut(); } catch (e) {}
  _authUser = null; localStorage.setItem("abuhub_user", JSON.stringify(null));
  API_TOKEN = ""; localStorage.removeItem("abuhub_token");
  updateAccountUI(); renderAuth(); toast("Signed out.");
}
function submitSeller(e){
  e.preventDefault();
  const payload = { shop: $("#sName").value, owner: $("#sOwner").value, email: $("#sEmail").value, category: $("#sCat").value, story: $("#sStory").value, dropship: $("#sDropship")?.checked || false };
  if (API_BASE) api("/api/sellers", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
  const apps = JSON.parse(localStorage.getItem("abuhub_sellers") || "[]");
  apps.unshift({ ...payload, date: new Date().toISOString() });
  localStorage.setItem("abuhub_sellers", JSON.stringify(apps));
  closeAll(); e.target.reset();
  toast(payload.dropship ? `“${payload.shop}” received + dropship enabled 📦 We'll review in 24h.` : `Application received for “${payload.shop}”! We'll review within 24h ✦`);
}
function subscribe(e){ e.preventDefault(); const em = $("#nlEmail").value; $("#nlEmail").value = ""; toast(`Welcome to The Sunday Shelf! 10% code sent to ${em} ✓`); }
function toggleSearchMobile(){ $("#mobileSearch").classList.toggle("hidden"); }

/* ---------- Checkout ---------- */
function openCheckout(){
  if (!cart.length) { toast("Your basket is empty — add something beautiful first", "warn"); return; }
  closeDrawers(true); checkoutStep = 1; renderCheckout(); showModal("checkoutModal");
}
function renderCheckout(){
  const sub = cartSubtotal(), ship = sub >= 75 ? 0 : 6.95, discount = couponDiscount(sub);
  const total = Math.max(0, sub + ship - discount);
  const coupon = couponFor(checkoutData.promo);
  const steps = ["Details", "Shipping", "Payment"].map((s, i) => `<div class="flex items-center gap-2 text-[13px] font-semibold ${checkoutStep > i + 1 ? "text-emerald-600" : checkoutStep === i + 1 ? "text-ink" : "text-muted"}"><span class="w-6 h-6 rounded-full grid place-items-center text-xs ${checkoutStep > i + 1 ? "bg-emerald-500 text-white" : checkoutStep === i + 1 ? "bg-ink text-cream" : "bg-line"}">${checkoutStep > i + 1 ? "✓" : i + 1}</span>${s}</div>`).join(`<span class="flex-1 h-px bg-line mx-1"></span>`);
  let body = "";
  if (checkoutStep === 1) body = `
    <div class="grid sm:grid-cols-2 gap-2.5">
      <input id="co_fname" value="${checkoutData.fname || ""}" placeholder="First name *" class="f-input" />
      <input id="co_lname" value="${checkoutData.lname || ""}" placeholder="Last name *" class="f-input" />
    </div>
    <input id="co_email" value="${checkoutData.email || ""}" placeholder="Email *" type="email" class="f-input mt-2.5" />
    <input id="co_phone" value="${checkoutData.phone || ""}" placeholder="Phone / WhatsApp" class="f-input mt-2.5" />
    <button onclick="coNext(1)" class="btn-ink w-full mt-4">Continue to shipping →</button>`;
  if (checkoutStep === 2) body = `
    <input id="co_addr" value="${checkoutData.addr || ""}" placeholder="Street address *" class="f-input" />
    <div class="grid sm:grid-cols-3 gap-2.5 mt-2.5">
      <input id="co_city" value="${checkoutData.city || ""}" placeholder="City *" class="f-input" />
      <input id="co_country" value="${checkoutData.country || ""}" placeholder="Country *" class="f-input" />
      <input id="co_zip" value="${checkoutData.zip || ""}" placeholder="ZIP" class="f-input" />
    </div>
    <label class="flex items-center gap-2.5 mt-3 text-sm bg-white border border-line rounded-2xl p-3.5 cursor-pointer"><input type="radio" name="ship" checked class="accent-[#BC5A28]" /> <span><strong>Standard tracked · ${ship === 0 ? "FREE" : money(ship)}</strong><br><span class="text-muted">3–6 business days</span></span></label>
    <label class="flex items-center gap-2.5 mt-2 text-sm bg-white border border-line rounded-2xl p-3.5 cursor-pointer"><input type="radio" name="ship" class="accent-[#BC5A28]" /> <span><strong>Express · $14.95</strong><br><span class="text-muted">1–2 business days</span></span></label>
    <div class="flex gap-2 mt-4"><button onclick="checkoutStep=1;renderCheckout()" class="btn-line flex-1">← Back</button><button onclick="coNext(2)" class="btn-ink flex-[2]">Continue to payment →</button></div>`;
  if (checkoutStep === 3) {
    const hasFW = !!PAYMENTS.flutterwavePublicKey, hasPS = !!PAYMENTS.paystackPublicKey;
    const hasStripe = !!PAYMENTS.stripePaymentLink, hasPP = !!PAYMENTS.paypalMeLink;
    body = `
    <div class="bg-white border border-line rounded-2xl p-4">
      <p class="f-label !mb-2">Pay securely · ${money(total)} ${PAYMENTS.currency}</p>
      ${payReady() ? `
      <div class="grid gap-2">
        ${hasFW ? `<button onclick="payWithFlutterwave(${total})" class="btn-ink w-full !py-3.5">Pay ${money(total)} — Card / Mobile Money / Bank (Flutterwave)</button>` : ""}
        ${hasPS ? `<button onclick="payWithPaystack(${total})" class="btn-ink w-full !py-3.5 !bg-[#0AA5C2]">Pay ${money(total)} — Card / Bank (Paystack)</button>` : ""}
        ${hasStripe ? `<a href="${PAYMENTS.stripePaymentLink}" target="_blank" rel="noopener" onclick="pendingOrder(${total},'Stripe')" class="btn-line w-full !py-3.5 font-bold">Pay with Stripe (international cards) →</a>` : ""}
        ${hasPP ? `<a href="${PAYMENTS.paypalMeLink}" target="_blank" rel="noopener" onclick="pendingOrder(${total},'PayPal')" class="btn-line w-full !py-3.5">Pay with PayPal →</a>` : ""}
      </div>
      <div class="text-xs bg-cream2 border border-line rounded-xl p-3 mt-3 leading-relaxed">${PAYMENTS.bankDetails} Then tap “I’ve paid” below — we confirm in the provider dashboard before shipping.</div>
      <button onclick="pendingOrder(${total},'Manual transfer')" class="w-full mt-2 text-sm font-semibold underline underline-offset-4">I’ve paid via transfer — confirm order →</button>
      ` : `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[13px] leading-relaxed">
        <strong>⚙️ Payments not connected yet.</strong><br>
        Add your public key below to take live payments (no backend needed). Until then, orders are recorded as <em>pending</em> for manual confirmation.
      </div>
      <div class="grid gap-2 mt-3">
        <input id="cfg_fw" value="${PAYMENTS.flutterwavePublicKey}" placeholder="Flutterwave PUBLIC key (FLWPUBK-...)" class="f-input !text-[13px]" />
        <input id="cfg_ps" value="${PAYMENTS.paystackPublicKey}" placeholder="Paystack PUBLIC key (pk_...)" class="f-input !text-[13px]" />
        <div class="grid grid-cols-2 gap-2">
          <input id="cfg_stripe" value="${PAYMENTS.stripePaymentLink}" placeholder="Stripe payment link" class="f-input !text-[13px]" />
          <input id="cfg_pp" value="${PAYMENTS.paypalMeLink}" placeholder="PayPal.Me link" class="f-input !text-[13px]" />
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
          <select id="cfg_cur" class="f-input !text-[13px]"><option ${PAYMENTS.currency === "USD" ? "selected" : ""}>USD</option><option ${PAYMENTS.currency === "TZS" ? "selected" : ""}>TZS</option><option ${PAYMENTS.currency === "KES" ? "selected" : ""}>KES</option><option ${PAYMENTS.currency === "GMD" ? "selected" : ""}>GMD</option><option ${PAYMENTS.currency === "NGN" ? "selected" : ""}>NGN</option><option ${PAYMENTS.currency === "GHS" ? "selected" : ""}>GHS</option><option ${PAYMENTS.currency === "EUR" ? "selected" : ""}>EUR</option><option ${PAYMENTS.currency === "GBP" ? "selected" : ""}>GBP</option></select>
          <button onclick="savePaymentSettings()" class="btn-ink !py-2.5 text-sm whitespace-nowrap">Save & enable →</button>
        </div>
      </div>
      <button onclick="pendingOrder(${total},'Pending (no gateway yet)')" class="btn-ink w-full mt-3 !py-3.5">Place order (pay on confirmation) →</button>
      `}
    </div>
    <div class="flex gap-2 mt-3">
      <input id="promoIn" value="${checkoutData.promo || ""}" placeholder="Coupon code (try MAKER15)" class="f-input" />
      <button onclick="applyPromo()" class="btn-line whitespace-nowrap">Apply</button>
    </div>
    <div class="flex gap-2 mt-3"><button onclick="checkoutStep=2;renderCheckout()" class="btn-line flex-1">← Back</button>${payReady() ? `<button onclick="openPaySettings()" class="btn-line">⚙️ Keys</button>` : ""}</div>
    <button onclick="pendingOrder(${total},'Cash / M-Pesa on delivery')" class="w-full mt-2 bg-white border border-line rounded-full py-3.5 text-sm font-bold hover:border-ink transition">💵 Cash / M-Pesa on delivery →</button>
    <p class="text-xs text-muted text-center mt-3">🔒 Paid on provider-hosted pages (PCI compliant) · Abu.Hub never sees card numbers · Confirm each payment in your dashboard before shipping</p>`;
  }
  $("#checkoutCard").innerHTML = `
    <div class="p-6 sm:p-8">
      <div class="flex items-center justify-between mb-5"><h3 class="font-display text-2xl sm:text-3xl">Secure checkout</h3><button onclick="closeAll()" class="x-btn">✕</button></div>
      <div class="flex items-center mb-6">${steps}</div>
      <div class="grid md:grid-cols-[1fr_240px] gap-6">
        <div>${body}</div>
        <div class="bg-white border border-line rounded-2xl p-4 h-fit">
          <p class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Order summary</p>
          <div class="space-y-2.5 max-h-48 overflow-auto">${cart.map(l => { const p = productById(l.id); return `<div class="flex gap-2 items-center"><img src="${p.img}" class="w-10 h-12 rounded-lg object-cover" /><div class="min-w-0"><p class="text-xs font-semibold line-clamp-1">${p.name}</p><p class="text-xs text-muted">×${l.qty} · ${l.variant}</p></div><strong class="ml-auto text-xs">${money(p.price * l.qty)}</strong></div>`; }).join("")}</div>
          <div class="border-t border-line mt-3 pt-3 space-y-1 text-[13px]">
            <div class="flex justify-between"><span class="text-muted">Subtotal</span><strong>${money(sub)}</strong></div>
            <div class="flex justify-between"><span class="text-muted">Shipping</span><strong>${ship === 0 ? "FREE" : money(ship)}</strong></div>
            ${discount ? `<div class="flex justify-between text-emerald-600"><span>Coupon ${checkoutData.promo} −${coupon.pct}%</span><strong>−${money(discount)}</strong></div>` : ""}
            <div class="flex justify-between text-base pt-1"><span class="font-semibold">Total</span><strong class="font-display text-xl">${money(total)}</strong></div>
          </div>
        </div>
      </div>
    </div>`;
}
function coNext(step){
  const g = (id) => document.getElementById("co_" + id)?.value.trim() || "";
  if (step === 1) {
    if (!g("fname") || !g("email")) { toast("Please add your name and email", "warn"); return; }
    Object.assign(checkoutData, { fname: g("fname"), lname: g("lname"), email: g("email"), phone: g("phone") });
  }
  if (step === 2) {
    if (!g("addr") || !g("city") || !g("country")) { toast("Please complete your shipping address", "warn"); return; }
    Object.assign(checkoutData, { addr: g("addr"), city: g("city"), country: g("country"), zip: g("zip") });
  }
  checkoutStep = step + 1; renderCheckout();
}
function applyPromo(){
  const v = $("#promoIn").value.trim().toUpperCase();
  const c = couponFor(v);
  checkoutData.promo = v; renderCheckout();
  if (!c) { toast(`Code “${v}” not recognised`, "warn"); return; }
  const sub = cartSubtotal();
  toast(sub < c.min ? `Needs ${money(c.min)}+ — add a little more ✦` : `Coupon applied — ${c.pct}% off ✓`, sub < c.min ? "warn" : "ok");
}
/* ----- Real payments: inline popups (public key only) ----- */
function orderRef(){ return "AH-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10); }
function savePaymentSettings(){
  savePayments({
    flutterwavePublicKey: $("#cfg_fw").value.trim(),
    paystackPublicKey: $("#cfg_ps").value.trim(),
    stripePaymentLink: $("#cfg_stripe").value.trim(),
    paypalMeLink: $("#cfg_pp").value.trim(),
    currency: $("#cfg_cur").value
  });
  renderCheckout();
  toast(payReady() ? "Live payments enabled ✓ Do a small test payment first." : "Settings saved — add at least one key/link to go live.", payReady() ? "ok" : "warn");
}
function openPaySettings(){
  localStorage.removeItem("abuhub_payments");
  ["flutterwavePublicKey","paystackPublicKey","stripePaymentLink","paypalMeLink"].forEach(k => PAYMENTS[k] = "");
  renderCheckout(); toast("Keys cleared — paste new ones to reconnect.", "warn");
}
function payWithFlutterwave(total){
  if (typeof FlutterwaveCheckout === "undefined") { toast("Flutterwave script blocked — check connection or disable ad-blocker, then retry.", "warn"); return; }
  const ref = orderRef();
  FlutterwaveCheckout({
    public_key: PAYMENTS.flutterwavePublicKey,
    tx_ref: ref,
    amount: Number(total.toFixed(2)),
    currency: PAYMENTS.currency,
    customer: { email: checkoutData.email, name: (checkoutData.fname || "") + " " + (checkoutData.lname || ""), phone_number: checkoutData.phone || "" },
    customizations: { title: "Abu.Hub", description: "Order " + ref, logo: location.origin + "/favicon.ico" },
    callback: (res) => { completeOrder(ref, total, "Flutterwave · " + (res.transaction_id || res.tx_ref)); },
    onclose: () => toast("Payment window closed — no charge made.", "warn")
  });
}
function payWithPaystack(total){
  if (typeof PaystackPop === "undefined") { toast("Paystack script blocked — check connection or disable ad-blocker, then retry.", "warn"); return; }
  const ref = orderRef();
  const handler = PaystackPop.setup({
    key: PAYMENTS.paystackPublicKey,
    email: checkoutData.email,
    amount: Math.round(total * 100), // smallest unit
    currency: PAYMENTS.currency,
    ref,
    metadata: { order: ref, name: (checkoutData.fname || "") + " " + (checkoutData.lname || "") },
    callback: (res) => completeOrder(res.reference || ref, total, "Paystack · " + (res.reference || "")),
    onClose: () => toast("Payment window closed — no charge made.", "warn")
  });
  handler.openIframe();
}
function pendingOrder(total, method){
  if (!checkoutData.email) { toast("Add your email in Step 1 first.", "warn"); checkoutStep = 1; renderCheckout(); return; }
  completeOrder(orderRef(), total, method + " — VERIFY in dashboard before shipping");
}
function completeOrder(ref, total, method){
  const lineItems = cart.map(l => ({ id: l.id, qty: l.qty, variant: l.variant }));
  // Mirror to cloud API when signed in + configured (never blocks checkout)
  if (API_BASE && API_TOKEN) {
    api("/api/orders", { method: "POST", body: JSON.stringify({ items: lineItems, total, method, ref, contact: checkoutData }) }).catch(() => null);
  }
  const orders = JSON.parse(localStorage.getItem("abuhub_orders") || "[]");
  orders.unshift({ ref, total, method, email: checkoutData.email, name: checkoutData.fname, items: cart.map(l => ({ id: l.id, qty: l.qty, variant: l.variant })), date: new Date().toISOString() });
  localStorage.setItem("abuhub_orders", JSON.stringify(orders));
  cart = []; save(); renderCartItems();
  $("#checkoutCard").innerHTML = `<div class="p-10 text-center">
    <div class="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center text-4xl mx-auto">✓</div>
    <h3 class="font-display text-4xl mt-5">Thank you${checkoutData.fname ? ", " + checkoutData.fname : ""}!</h3>
    <p class="text-muted mt-2">Order <strong class="text-ink">${ref}</strong> · ${money(total)} via ${method}.</p>
    <p class="text-sm mt-3 bg-cream2 border border-line rounded-2xl p-4">Receipt sent to <strong>${checkoutData.email || "your email"}</strong>. Sellers are notified and ship in 1–2 days. ⚠️ Owner: confirm “${ref}” as <em>successful</em> in your provider dashboard before shipping.</p>
    <div class="flex flex-col sm:flex-row gap-2 justify-center mt-6"><button onclick="closeAll();go('shop')" class="btn-ink">Keep shopping →</button><button onclick="closeAll();go('home')" class="btn-line">Back home</button></div>
  </div>`;
  toast(`Order ${ref} recorded ✓ (${method.split("—")[0].trim()})`);
}
function placeOrder(total){ pendingOrder(total, "Manual"); }

/* ---------- Misc ---------- */
$("#mobileBtn").addEventListener("click", () => $("#mobileNav").classList.toggle("hidden"));
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#headerSearch")?.focus(); }
  if (e.key === "Escape") closeAll();
});
window.addEventListener("scroll", () => $("#siteHeader").classList.toggle("scrolled", scrollY > 10));
document.addEventListener("click", (e) => { if (e.target.classList?.contains("modal")) closeAll(); });

/* ---------- 3D tilt on cards (desktop pointers only) ---------- */
(function initTilt(){
  if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  let raf = null;
  const SEL = ".p-card,.cat-card,.v-card-light,.v-card,.rank-card,.hot-card";
  document.addEventListener("mousemove", (e) => {
    const card = e.target.closest ? e.target.closest(SEL) : null;
    if (!card) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add("tilt3d");
      card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
  });
  document.addEventListener("mouseout", (e) => {
    const card = e.target.closest ? e.target.closest(SEL) : null;
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
      card.style.transform = "";
      setTimeout(() => card.classList.remove("tilt3d"), 200);
    }
  }, true);
})();

/* init */
renderHome(); syncFilterUI(); renderShop(); renderVendors(); renderCartItems(); renderWishItems(); updateBadges(); updateAccountUI(); updateShipTexts();
$$("#curSel, select[onchange^='setCurrency']").forEach(s => s.value = currency);
$("#waFloat").href = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent("Hi Abu.Hub! I need help with my order.")}`;
window.addEventListener("load", () => setTimeout(initAuth, 400));
initAuth();
