/* Abu.Hub — app logic */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
/* ---------- World currencies (code, symbol, units per 1 USD fallback) ----------
   Live rates refresh daily from a free FX feed when online; static values below are fallback. */
const CURR_LIST = [
["USD","$",1],["TZS","TSh ",2500],["KES","KSh ",129],["UGX","USh ",3700],["RWF","RWF ",1300],
["NGN","₦ ",1550],["GHS","GH₵ ",15],["ZAR","R ",18],["EGP","E£ ",50],["MAD","DH ",10],
["ETB","Br ",125],["XOF","CFA ",605],["XAF","FCFA ",605],["ZMW","ZK ",27],["MWK","MWK ",1700],
["MZN","MT ",64],["AOA","Kz ",910],["CDF","CDF ",2850],["BIF","BIF ",3000],["DJF","DJF ",178],
["SDG","SDG ",600],["SSP","SSP ",4500],["SOS","SOS ",570],["LYD","LD ",4.8],["TND","DT ",3.1],
["DZD","DA ",134],["GMD","D ",70],["SLL","SLL ",23],["LRD","LRD ",195],["GNF","GNF ",8700],
["CVE","CVE ",100],["STN","STN ",24],["KMF","KMF ",450],["MUR","₨ ",46],["SCR","SCR ",14],
["LSL","LSL ",18],["NAD","N$ ",18],["SZL","SZL ",18],["BWP","P ",13.7],["ZWG","ZiG ",26],
["MGA","Ar ",4600],["MRU","UM ",40],["ERN","ERN ",15],["EUR","€ ",0.92],["GBP","£ ",0.79],
["CHF","CHF ",0.89],["SEK","kr ",11],["NOK","kr ",11],["DKK","kr ",6.9],["ISK","kr ",138],
["PLN","zł ",4.0],["CZK","Kč ",23],["HUF","Ft ",390],["RON","lei ",4.6],["BGN","лв ",1.8],
["RSD","RSD ",108],["BAM","KM ",1.8],["MKD","MKD ",57],["ALL","L ",92],["MDL","MDL ",18],
["UAH","₴ ",41],["BYN","BYN ",3.3],["RUB","₽ ",100],["GEL","₾ ",2.7],["AMD","֏ ",390],
["AZN","₼ ",1.7],["TRY","₺ ",34],["CAD","CA$ ",1.4],["MXN","MX$ ",20],["BRL","R$ ",5.8],
["ARS","AR$ ",1000],["CLP","CL$ ",980],["COP","CO$ ",4400],["PEN","S/ ",3.75],["UYU","$U ",43],
["PYG","₲ ",7800],["BOB","Bs ",6.9],["VES","VES ",50],["DOP","RD$ ",60],["GTQ","Q ",7.7],
["HNL","L ",25],["NIO","C$ ",36.6],["CRC","₡ ",520],["PAB","B/. ",1],["JMD","J$ ",157],
["CUP","CUP ",24],["HTG","HTG ",130],["BSD","B$ ",1],["BBD","BBD ",2],["BZD","BZ$ ",2],
["XCD","EC$ ",2.7],["AWG","AWG ",1.8],["ANG","ANG ",1.8],["TTD","TT$ ",6.8],["GYD","GY$ ",208],
["SRD","SRD ",35],["KYD","CI$ ",0.83],["BMD","BD$ ",1],["FKP","FK£ ",0.79],["GIP","£ ",0.79],
["CNY","¥ ",7.25],["JPY","¥ ",155],["KRW","₩ ",1380],["TWD","NT$ ",32],["HKD","HK$ ",7.8],
["MOP","MOP ",8.06],["MNT","₮ ",3400],["KZT","₸ ",500],["UZS","UZS ",12800],["KGS","с ",87],
["TJS","SM ",10.9],["TMT","TMT ",3.5],["AFN","؋ ",70],["PKR","₨ ",278],["INR","₹ ",84],
["NPR","₨ ",134],["BTN","BTN ",84],["BDT","৳ ",120],["LKR","₨ ",295],["MVR","MVR ",15.4],
["MMK","MMK ",2100],["THB","฿ ",34],["LAK","₭ ",22000],["VND","₫ ",25400],["KHR","៛ ",4100],
["MYR","RM ",4.5],["SGD","S$ ",1.35],["BND","B$ ",1.35],["IDR","Rp ",15800],["PHP","₱ ",58],
["ILS","₪ ",3.7],["JOD","JOD ",0.71],["LBP","LBP ",89500],["SYP","SYP ",11000],["IQD","IQD ",1310],
["IRR","IRR ",42000],["SAR","﷼ ",3.75],["AED","AED ",3.67],["QAR","QR ",3.64],["KWD","KWD ",0.31],
["BHD","BHD ",0.38],["OMR","OMR ",0.38],["YER","YER ",240],["AUD","A$ ",1.53],["NZD","NZ$ ",1.7],
["PGK","K ",4],["FJD","FJ$ ",2.3],["WST","WS$ ",2.8],["TOP","T$ ",2.4],["SBD","SI$ ",8.4],
["VUV","VT ",120],["XPF","₣ ",110]
];
const CURRENCIES = {};
CURR_LIST.forEach(([c, s, r]) => CURRENCIES[c] = { rate: r, sym: s });
let currency = localStorage.getItem("abuhub_cur") || "USD";
if (!CURRENCIES[currency]) currency = "USD";
function liveRate() {
  try {
    const c = JSON.parse(localStorage.getItem("abuhub_rates") || "null");
    if (c && c.rates && c.rates[currency] && CURRENCIES[currency]) return c.rates[currency];
  } catch {}
  return CURRENCIES[currency].rate;
}
function money(n) {
  const v = Number(n) * liveRate();
  const s = CURRENCIES[currency].sym;
  if (liveRate() >= 100) return s + Math.round(v).toLocaleString("en-US");
  return s + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
async function refreshRates() {
  try {
    const c = JSON.parse(localStorage.getItem("abuhub_rates") || "null");
    if (c && Date.now() - c.ts < 24 * 36e5) return;
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const j = await r.json();
    if (j && j.result === "success" && j.rates) {
      localStorage.setItem("abuhub_rates", JSON.stringify({ ts: Date.now(), rates: j.rates }));
      refreshDynamic(); updateShipTexts();
    }
  } catch {}
}
function buildCurrSelectors() {
  const opts = Object.keys(CURRENCIES).sort().map(c => {
    const s = CURRENCIES[c].sym.trim();
    const label = (s && s !== c) ? s + " " + c : c;
    return `<option value="${c}">${label}</option>`;
  }).join("");
  $$("select[onchange^='setCurrency']").forEach(s => { s.innerHTML = opts; s.value = currency; });
}
function setCurrency(cur) {
  if (!CURRENCIES[cur]) return;
  currency = cur; localStorage.setItem("abuhub_cur", cur);
  $$("#curSel, select[onchange^='setCurrency']").forEach(s => s.value = cur);
  updateShipTexts(); refreshDynamic();
  toast(`Prices now in ${cur} ${CURRENCIES[cur].sym.trim()}`);
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
const SUPPORT_WA = "255753026506"; // shop WhatsApp (Dar es Salaam)

/* ---------- Unified catalog: seed + seller-uploaded products ---------- */
let ALL_PRODUCTS = [...PRODUCTS];
const SELLER_SHOPS = {};
let CLOUD_MINE = [];
function shopOf() {
  return localStorage.getItem("abuhub_shop") || ((_authUser || {}).name ? _authUser.name.split(" ")[0] + "'s Shop" : "My Shop");
}
function sellerKey() {
  if (!_authUser?.email) return null;
  return "s-" + btoa(_authUser.email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
}
function virtualVendor(key, shop, tier) {
  const initial = (shop || "M")[0].toUpperCase();
  return {
    id: key, name: shop || "Independent maker", tagline: "Independent seller", location: "Marketplace",
    avatar: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='#191512'/><text x='50' y='68' font-size='52' text-anchor='middle' fill='#FAF6F0' font-family='Georgia'>${initial}</text></svg>`),
    cover: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop",
    rating: 5.0, reviews: 0, products: 0, sales: "new", verified: false, joined: "2026", tier: tier || null,
    story: "An independent seller on Abu.Hub.", virtual: true
  };
}
/* premium tiers: local sub or cloud map */
let CLOUD_TIERS = {};
function myTier() {
  try {
    const s = JSON.parse(localStorage.getItem("abuhub_sub") || "null");
    if (s && s.ends > Date.now()) return s.tier;
  } catch {}
  const own = CLOUD_MINE[0]?.sellerId;
  if (own && CLOUD_TIERS["s-" + own]) return CLOUD_TIERS["s-" + own].tier;
  const mine = Object.keys(SELLER_SHOPS).find(k => k === sellerKey());
  if (mine && CLOUD_TIERS[mine]) return CLOUD_TIERS[mine].tier;
  return null;
}
async function fetchTiers() {
  if (!API_BASE) return;
  try {
    const j = await (await fetch(API_BASE + "/api/sellers/tiers")).json();
    CLOUD_TIERS = j.tiers || {};
  } catch {}
}
async function subscribeTier(tier) {
  if (!_authUser) { openAuth(); toast("Sign in first, then pick a plan.", "warn"); return; }
  const fee = tier === "elite" ? 29 : 9;
  const rec = { tier, fee, ends: Date.now() + 30 * 864e5, date: new Date().toISOString() };
  localStorage.setItem("abuhub_sub", JSON.stringify(rec));
  if (API_BASE && API_TOKEN) api("/api/subscriptions", { method: "POST", body: JSON.stringify({ tier }) }).catch(() => null);
  await refreshCatalog(); renderSell(); refreshDynamic();
  toast(`${tier === "elite" ? "Elite" : "Pro"} activated — invoice $${fee}/mo sent ✓ Badge live on your shop.`);
}
function proBadge(v) {
  return v.tier ? `<span class="text-[11px] font-bold text-[#C8A15A]">◆ ${String(v.tier).toUpperCase()}</span>` : "";
}
async function refreshCatalog() {
  for (const k in SELLER_SHOPS) delete SELLER_SHOPS[k];
  ALL_PRODUCTS = [...PRODUCTS];
  CLOUD_MINE = [];
  if (API_BASE && API_TOKEN) {
    try {
      const j = await api("/api/products?mine=1&limit=100");
      CLOUD_MINE = (j.products || []).map(p => ({ id: p.id, vendorId: "s-" + p.sellerId, name: p.name, category: p.category, price: p.price, oldPrice: null, rating: 5.0, reviews: 0, img: p.image, badge: p.status === "approved" ? "New from maker" : "Pending review", colors: ["Standard"], desc: p.description || p.desc || "", stock: p.stock, status: p.status, _cloud: true, _raw: p }));
    } catch {}
  }
  const locals = JSON.parse(localStorage.getItem("abuhub_myproducts") || "[]");
  const items = locals.concat(CLOUD_MINE);
  const byShop = {};
  items.forEach(p => { (byShop[p.vendorId] = byShop[p.vendorId] || []).push(p); });
  Object.keys(byShop).forEach(key => {
    const own = key === sellerKey();
    const shop = (own ? shopOf() : null) || byShop[key][0].shop || "Independent maker";
    let tier = null;
    if (own) {
      try { const s = JSON.parse(localStorage.getItem("abuhub_sub") || "null"); if (s && s.ends > Date.now()) tier = s.tier; } catch {}
      if (!tier && CLOUD_TIERS[key]) tier = CLOUD_TIERS[key].tier;
    } else if (CLOUD_TIERS[key]) tier = CLOUD_TIERS[key].tier;
    SELLER_SHOPS[key] = virtualVendor(key, shop, tier);
    SELLER_SHOPS[key].products = byShop[key].length;
  });
  ALL_PRODUCTS = ALL_PRODUCTS.concat(items);
}
const vendorById = (id) => VENDORS.find(v => v.id === id) || SELLER_SHOPS[id] || null;
const productById = (id) => ALL_PRODUCTS.find(p => p.id === id);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

let cart = JSON.parse(localStorage.getItem("abuhub_cart") || "[]"); // {id, qty, variant}
let wishlist = JSON.parse(localStorage.getItem("abuhub_wish") || "[]");
let filters = { q: "", cats: [], max: 600, minRating: 0, vendors: [], dropship: false, tech: { ram: 0, storage: 0, cond: "" }, sort: "featured" };
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

/* ---------- Multi-language EN/SW/FR (auto-translates UI, seller content stays) ---------- */
let lang = localStorage.getItem("abuhub_lang") || "en";
const I18N = { sw: {}, fr: {} };
const _origText = new Map(), _origPh = new Map();
function T(en) { return (lang !== "en" && I18N[lang][en]) || en; }
function setLang(l) {
  lang = I18N[l] ? l : "en";
  localStorage.setItem("abuhub_lang", lang);
  $$("#langSel, select[onchange^='setLang']").forEach(s => s.value = lang);
  document.documentElement.lang = lang;
  restoreLang(); applyLang(); refreshDynamic();
  setTimeout(applyLang, 400);
  toast(lang === "sw" ? "Lugha: Kiswahili ✓" : lang === "fr" ? "Langue : Français ✓" : "Language: English ✓");
}
function restoreLang() {
  _origText.forEach((o, n) => { try { if (n.isConnected) n.nodeValue = o; } catch {} });
  _origText.clear();
  _origPh.forEach((o, el) => { try { if (el.isConnected) el.setAttribute("placeholder", o); } catch {} });
  _origPh.clear();
}
function applyLang() {
  if (lang === "en") return;
  const dict = I18N[lang]; if (!dict) return;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || p.closest("script,style,noscript")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => {
    const key = n.nodeValue.trim();
    if (dict[key] && !_origText.has(n)) { _origText.set(n, n.nodeValue); n.nodeValue = n.nodeValue.replace(key, dict[key]); }
  });
  $$("[placeholder]").forEach(el => {
    const key = (el.getAttribute("placeholder") || "").trim();
    if (key && dict[key] && !_origPh.has(el)) { _origPh.set(el, el.getAttribute("placeholder")); el.setAttribute("placeholder", dict[key]); }
  });
}
let _langT = null;
function observeLang() {
  new MutationObserver(() => { clearTimeout(_langT); _langT = setTimeout(() => { if (lang !== "en") applyLang(); }, 250); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
}
/* --- dictionary: header / hero / home --- */
Object.assign(I18N.sw, {
  "Shop all": "Duka", "Fashion": "Mitindo", "Home": "Nyumbani", "Vendors": "Wauzaji", "Our story": "Hadithi yetu",
  "2,400+ sellers live": "Wauzaji 2,400+ mtandaoni", "Search makers, goods…": "Tafuta mafundi, bidhaa…",
  "Search the marketplace…": "Tafuta sokoni…", "Sell on Abu.Hub": "Uza kwenye Abu.Hub",
  "Home & Living": "Nyumba na Maisha", "Our impact →": "Athari yetu →",
  "✦ New season drop": "✦ Msimu mpya umefika", "Verified artisans only": "Mafundi walioidhinishwa tu",
  "Beautiful things,": "Vitu vizuri,", "made by": "vilivyotengenezwa na", "real hands.": "mikono halisi.",
  "Shop 12,000+ small-batch goods from 2,400 independent sellers — fashion, home, beauty & craft, all in one elegant market.": "Nunua bidhaa 12,000+ za kipekee kutoka kwa wauzaji 2,400 huru — mitindo, nyumbani, urembo na ufundi, zote katika soko moja maridadi.",
  "Shop the marketplace": "Nunua sokoni", "Meet the makers": "Kutana na mafundi",
  "from 48,000+ happy shoppers": "kutoka kwa wanunuzi 48,000+ wenye furaha",
  "Curated · 214 pieces": "Iliyochaguliwa · vipande 214", "The Handmade Table": "Meza ya Mafundi",
  "Shop home →": "Nunua vya nyumbani →", "For makers": "Kwa mafundi",
  "Sell to 190k monthly shoppers. 0 listing fees.": "Wauzie wanunuzi 190k kila mwezi. Ada 0 kuorodhesha.",
  "Open your shop": "Fungua duka lako", "Glow Rituals": "Mila za Kung'aa", "Botanical bestsellers": "Vinavyouzwa sana vya mimea",
  "Buyer protection": "Ulinzi wa mnunuzi", "Full refund if it’s not as described": "Rudishiwa pesa kamili kama si kama ilivyoelezwa",
  "Verified sellers": "Wauzaji walioidhinishwa", "Every maker is ID & quality checked": "Kila fundi amehakikiwa ubora",
  "Fast, tracked shipping": "Usafirishaji wa haraka", "30-day returns": "Kurudisha siku 30",
  "No questions, prepaid label": "Bila maswali, lebo hulipwa",
  "Browse by craft": "Tafuta kwa ufundi", "Shop by category": "Nunua kwa kategoria", "View everything →": "Tazama vyote →",
  "Loved right now": "Vinavyopendwa sasa", "Trending across the Hub": "Zinazotrendi Hub",
  "Explore all 12,000+ goods": "Gundua bidhaa 12,000+", "All": "Zote",
  "Hot right now": "Moto sasa hivi", "Frequently searched": "Zinazotafutwa sana", "Search everything →": "Tafuta vyote →",
  "Verified by 48,000+ reviews": "Imethibitishwa na tathmini 48,000+", "Top ranking this week": "Bora wiki hii",
  "Shop all →": "Nunua zote →", "Autumn Market Week · ends in": "Wiki ya Soko · inaisha baada ya",
  "days": "siku", "hrs": "saa", "min": "dak", "sec": "sek",
  "Up to 30% off handmade icons": "Punguzo hadi 30% kwa bidhaa asilia",
  "Stack code": "Tumia msimbo", "on top of sale prices.": "pamoja na bei za ofa.",
  "Shop the sale →": "Nunua ofa →", "Coupon centre · tap to copy": "Kituo cha kuponi · gusa kunakili",
  "Steals under $50": "Ofa chini ya $50",
  "Picked up where you left off": "Endelea ulipoishia", "Recently viewed": "Uliyotazama hivi karibuni", "Clear": "Futa",
  "Visit their shop": "Tembelea duka lake", "Makers": "Mafundi", "Paid to sellers": "Zimelipwa kwa wauzaji",
  "5-star reviews": "Tathmini 5-nyota", "Editor’s curation": "Uchaguzi wa mhariri", "Collections to get lost in": "Makusanyo ya kupotelea",
  "Independent & proud": "Huru na wenye fahari", "Star sellers this week": "Wauzaji nyota wiki hii",
  "All vendors →": "Wauzaji wote →", "Pavilions": "Mabanda", "Shop by origin": "Nunua kwa asili"
});
/* --- dictionary: sellers / custom / promise / reviews / newsletter / footer --- */
Object.assign(I18N.sw, {
  "For sellers": "Kwa wauzaji", "Open your shop in an afternoon": "Fungua duka lako mchana mmoja",
  "No listing fees, no code, no warehouse. Just your craft and our 190,000 monthly shoppers. Keep up to 92% of every sale.": "Hakuna ada za kuorodhesha, hakuna kodi, hakuna ghala. Ufundi wako tu na wanunuzi wetu 190,000 kila mwezi. Baki na hadi 92% ya kila mauzo.",
  "Start selling — it’s free": "Anza kuuza — ni bure",
  "Create your storefront": "Tengeneza duka lako", "Logo, story, policies — guided in 10 minutes.": "Nembo, hadithi, sera — mwongozo wa dakika 10.",
  "List your goods": "Orodhesha bidhaa zako", "Photos, variants, stock. We handle VAT & fees.": "Picha, aina, akiba. Tunashughulikia VAT na ada.",
  "Get paid fast": "Lipwa haraka", "Daily payouts to bank or mobile money.": "Malipo ya kila siku kwa benki au pesa za simu.",
  "Custom & bespoke": "Vya kuagiza maalum", "Dream it. A maker will quote it.": "Iote. Fundi atakupa bei.",
  "Wedding sets, bulk gifts, your measurements, your colours. Post one request — matching makers reply with quotes, usually within 48 hours. Free to post.": "Seti za harusi, zawadi za jumla, vipimo vyako, rangi zako. Tuma ombi moja — mafundi hujibu na bei, kawaida ndani ya saa 48. Bure kutuma.",
  "Request a custom order →": "Agiza maalum →", "Browse makers": "Tafuta mafundi",
  "2,300+ custom orders": "Maagizo maalum 2,300+", "delivered this year · avg. quote in 31 hrs": "yametolewa mwaka huu · wastani wa bei saa 31",
  "Dropshipping centre": "Kituo cha dropshipping", "Sell handmade. Hold zero stock.": "Uza vya mikono. Bila stok yoyote.",
  "List goods from verified makers in your own shop. They pack & ship directly to your customer — unbranded on request — and you keep the margin. No warehouse, no upfront stock.": "Orodhesha bidhaa za mafundi walioidhinishwa dukani kwako. Wanafunga na kutuma moja kwa moja kwa mteja wako — bila chapa ukiomba — na wewe unabaki na faida. Hakuna ghala, hakuna stok ya awali.",
  "01 · Pick": "01 · Chagua", "02 · List": "02 · Orodhesha", "03 · Earn": "03 · Pata",
  "Filter Shop → 📦 Ships from maker. 9 goods live.": "Chuja Duka → 📦 Zinazosafirishwa na fundi. Bidhaa 9 mtandaoni.",
  "Re-list in your shop with your price. Maker ships.": "Orodhesha tena dukani kwako na bei yako. Fundi anatuma.",
  "You keep the margin. Payouts to bank or mobile money.": "Unabaki na faida. Malipo kwa benki au pesa za simu.",
  "Browse dropship goods 📦": "Tazama bidhaa za dropshipping 📦", "Become a reseller →": "Kuwa muuzaji wa jumla →",
  "4 dropship partners": "Washirika 4 wa dropshipping", "· 5–9 day direct delivery · buyer protection included": "· uwasilishaji wa moja kwa moja siku 5–9 · ulinzi wa mnunuzi umejumuishwa",
  "📦 Dropship partner": "📦 Mshirika wa dropshipping", "📦 DROPSHIP PARTNER": "📦 MSHIRIKA WA DROPSHIPPING",
  "The Abu.Hub Promise": "Ahadi ya Abu.Hub", "Every order, protected end-to-end": "Kila agizo, limelindwa kuanzia mwanzo hadi mwisho",
  "Secure payments": "Malipo salama", "Cards, M-Pesa & bank via PCI-compliant gateways. We never see your card number.": "Kadi, M-Pesa na benki kupitia malango salama. Hatuoni namba ya kadi yako.",
  "Guaranteed delivery": "Uwasilishaji wa uhakika", "Tracked 3–6 day shipping. Late or lost? Full refund, no forms marathon.": "Usafirishaji wa siku 3–6 unaofuatiliwa. Kuchelewa au kupotea? Rudishiwa pesa kamili.",
  "Money-back guarantee": "Dhamana ya kurejeshewa pesa", "Not as described? 30 days, prepaid return label, money back.": "Si kama ilivyoelezwa? Siku 30, lebo ya kurudisha hulipwa, pesa zinarudi.",
  "After-sales care": "Huduma baada ya mauzo", "Real humans + makers on chat. Disputes resolved in under 72 hours.": "Watu halisi + mafundi kwenye gumzo. Migogoro hutatuliwa chini ya saa 72.",
  "Wall of love": "Ukuta wa mapenzi", "48,000+ five-star moments": "Matukio 48,000+ ya nyota tano",
  "The Sunday Shelf": "Rafu ya Jumapili", "Get 10% off your first maker order": "Pata 10% kwa agizo lako la kwanza",
  "One beautiful email a week. New drops, maker stories, private sales. No spam, ever.": "Barua moja nzuri kwa wiki. Bidhaa mpya, hadithi za mafundi, ofa za siri. Hakuna taka, kamwe.",
  "Claim 10% off": "Dai 10%", "By joining you agree to our Terms. Unsubscribe anytime.": "Kwa kujiunga unakubali Masharti yetu. Jiondoe wakati wowote.",
  "The premium marketplace for independent makers. Verified sellers, buyer protection, and beautiful goods — delivered worldwide.": "Soko bora kwa mafundi huru. Wauzaji walioidhinishwa, ulinzi wa mnunuzi, na bidhaa nzuri — zinawasilishwa duniani kote.",
  "Shop": "Duka", "All goods": "Bidhaa zote", "Beauty": "Urembo", "Jewelry": "Mapambo",
  "Sellers": "Wauzaji", "Start selling": "Anza kuuza", "Find vendors": "Tafuta wauzaji",
  "Seller handbook": "Mwongozo wa muuzaji", "Fees & payouts": "Ada na malipo", "Support": "Msaada",
  "📦 Track your order": "📦 Fuatilia agizo lako", "Help centre": "Kituo cha msaada",
  "Shipping & returns": "Usafirishaji na kurudisha",
  "© 2026 Abu.Hub Marketplace · Crafted for makers, with care.": "© 2026 Soko la Abu.Hub · Imetengenezwa kwa mafundi, kwa upendo."
});
Object.assign(I18N.fr, {
  "For sellers": "Pour les vendeurs", "Open your shop in an afternoon": "Ouvrez votre boutique en un après-midi",
  "No listing fees, no code, no warehouse. Just your craft and our 190,000 monthly shoppers. Keep up to 92% of every sale.": "Ni frais d'annonce, ni code, ni entrepôt. Juste votre artisanat et nos 190 000 acheteurs mensuels. Gardez jusqu'à 92 % de chaque vente.",
  "Start selling — it’s free": "Commencez à vendre — c'est gratuit",
  "Create your storefront": "Créez votre vitrine", "Logo, story, policies — guided in 10 minutes.": "Logo, histoire, règles — guidé en 10 minutes.",
  "List your goods": "Listez vos articles", "Photos, variants, stock. We handle VAT & fees.": "Photos, variantes, stock. Nous gérons TVA et frais.",
  "Get paid fast": "Soyez payé vite", "Daily payouts to bank or mobile money.": "Paiements quotidiens par banque ou mobile money.",
  "Custom & bespoke": "Sur mesure", "Dream it. A maker will quote it.": "Rêvez-le. Un créateur vous le chiffrera.",
  "Wedding sets, bulk gifts, your measurements, your colours. Post one request — matching makers reply with quotes, usually within 48 hours. Free to post.": "Parures de mariage, cadeaux en gros, vos mesures, vos couleurs. Une demande — les créateurs répondent sous 48h. Gratuit.",
  "Request a custom order →": "Commander sur mesure →", "Browse makers": "Parcourir les créateurs",
  "2,300+ custom orders": "2 300+ commandes sur mesure", "delivered this year · avg. quote in 31 hrs": "livrées cette année · devis moyen en 31 h",
  "Dropshipping centre": "Centre dropshipping", "Sell handmade. Hold zero stock.": "Vendez artisanal. Zéro stock.",
  "List goods from verified makers in your own shop. They pack & ship directly to your customer — unbranded on request — and you keep the margin. No warehouse, no upfront stock.": "Listez les articles de créateurs vérifiés dans votre boutique. Ils emballent et expédient directement — sans marque sur demande — et vous gardez la marge. Ni entrepôt, ni stock initial.",
  "01 · Pick": "01 · Choisir", "02 · List": "02 · Lister", "03 · Earn": "03 · Gagner",
  "Filter Shop → 📦 Ships from maker. 9 goods live.": "Filtrez Boutique → 📦 Expédié par le créateur. 9 articles en ligne.",
  "Re-list in your shop with your price. Maker ships.": "Re-listez avec votre prix. Le créateur expédie.",
  "You keep the margin. Payouts to bank or mobile money.": "Vous gardez la marge. Paiements par banque ou mobile money.",
  "Browse dropship goods 📦": "Voir les articles dropshipping 📦", "Become a reseller →": "Devenir revendeur →",
  "4 dropship partners": "4 partenaires dropshipping", "· 5–9 day direct delivery · buyer protection included": "· livraison directe 5–9 jours · protection acheteur incluse",
  "📦 Dropship partner": "📦 Partenaire dropshipping", "📦 DROPSHIP PARTNER": "📦 PARTENAIRE DROPSHIPPING",
  "The Abu.Hub Promise": "La Promesse Abu.Hub", "Every order, protected end-to-end": "Chaque commande, protégée de bout en bout",
  "Secure payments": "Paiements sécurisés", "Cards, M-Pesa & bank via PCI-compliant gateways. We never see your card number.": "Cartes, M-Pesa et banque via passerelles conformes PCI. Nous ne voyons jamais votre numéro.",
  "Guaranteed delivery": "Livraison garantie", "Tracked 3–6 day shipping. Late or lost? Full refund, no forms marathon.": "Livraison suivie 3–6 jours. En retard ou perdu ? Remboursement intégral.",
  "Money-back guarantee": "Garantie satisfait ou remboursé", "Not as described? 30 days, prepaid return label, money back.": "Non conforme ? 30 jours, étiquette prépayée, argent rendu.",
  "After-sales care": "Service après-vente", "Real humans + makers on chat. Disputes resolved in under 72 hours.": "De vrais humains + créateurs sur le chat. Litiges résolus en moins de 72 h.",
  "Wall of love": "Mur d'amour", "48,000+ five-star moments": "48 000+ moments 5 étoiles",
  "The Sunday Shelf": "L'Étagère du Dimanche", "Get 10% off your first maker order": "−10% sur votre première commande",
  "One beautiful email a week. New drops, maker stories, private sales. No spam, ever.": "Un bel e-mail par semaine. Nouveautés, histoires de créateurs, ventes privées. Zéro spam, jamais.",
  "Claim 10% off": "Recevoir −10%", "By joining you agree to our Terms. Unsubscribe anytime.": "En vous inscrivant, vous acceptez nos CGU. Désinscription à tout moment.",
  "The premium marketplace for independent makers. Verified sellers, buyer protection, and beautiful goods — delivered worldwide.": "La place premium des créateurs indépendants. Vendeurs vérifiés, protection acheteur, beaux articles — livrés dans le monde entier.",
  "Shop": "Boutique", "All goods": "Tous les articles", "Beauty": "Beauté", "Jewelry": "Bijoux",
  "Sellers": "Vendeurs", "Start selling": "Commencer à vendre", "Find vendors": "Trouver des vendeurs",
  "Seller handbook": "Guide du vendeur", "Fees & payouts": "Frais et paiements", "Support": "Assistance",
  "📦 Track your order": "📦 Suivre ma commande", "Help centre": "Centre d'aide",
  "Shipping & returns": "Livraison et retours",
  "© 2026 Abu.Hub Marketplace · Crafted for makers, with care.": "© 2026 Place Abu.Hub · Fait pour les créateurs, avec soin."
});
/* --- dictionary: shop / vendors / about / cart / product / checkout / accounts --- */
Object.assign(I18N.sw, {
  "The marketplace": "Soko", "Shop all goods": "Nunua bidhaa zote", "☰ Filters": "☰ Vichujio",
  "Filters": "Vichujio", "Clear all": "Futa vyote", "Search": "Tafuta", "Try ‘lamp’, ‘pearl’…": "Jaribu ‘taa’, ‘lulu’…",
  "Category": "Kategoria", "Max price ·": "Bei ya juu ·", "Rating": "Tathmini", "Any": "Zote",
  "Vendor": "Muuzaji", "Fulfilment": "Utekelezaji", "📦 Ships from maker (dropship)": "📦 Inasafirishwa na fundi",
  "Sort": "Panga", "Featured": "Zilizoangaziwa", "Price: low → high": "Bei: chini → juu",
  "Price: high → low": "Bei: juu → chini", "Top rated": "Zilizopewa juu",
  "Nothing found — yet.": "Hakuna kilichopatikana — bado.", "Try a different search or clear filters.": "Jaribu utafutaji mwingine au futa vichujio.",
  "Clear filters": "Futa vichujio",
  "2,400+ independent shops": "Maduka huru 2,400+", "Meet the vendors": "Kutana na wauzaji",
  "Every seller is identity-verified and quality-checked. Follow your favourites and get notified of new drops.": "Kila muuzaji amethibitishwa na ubora umehakikiwa. Wafuate vipendwa vyako upate taarifa za bidhaa mpya.",
  "Search vendors… e.g. ‘kiln’, ‘coffee’": "Tafuta wauzaji… mf. ‘kinu’, ‘kahawa’",
  "← All vendors": "← Wauzaji wote", "Goods from this shop": "Bidhaa za duka hili",
  "A market where makers keep the magic": "Soko ambapo mafundi huhifadhi uchawi", "— and the margin.": "— na faida.",
  "paid to makers": "zimelipwa kwa mafundi", "monthly shoppers": "wanunuzi wa kila mwezi", "countries served": "nchi zinazohudumiwa",
  "Have something beautiful to sell?": "Una kitu kizuri cha kuuza?",
  "Join 2,400+ makers. Free to start, live in a day.": "Jiunge na mafundi 2,400+. Bure kuanza, mtandaoni kwa siku.",
  "Your basket": "Kikapu chako", "Subtotal": "Jumla ndogo", "Shipping": "Usafirishaji",
  "Checkout securely →": "Lipa kwa usalama →", "Continue shopping": "Endelea kununua",
  "Your basket is empty": "Kikapu chako kiko wazi", "Beautiful handmade things await.": "Vitu vizuri vya mikono vinakungoja.",
  "Start shopping": "Anza kununua", "Wishlist": "Orodha ya matamanio", "Nothing saved yet": "Hakuna kilichohifadhiwa",
  "Tap the heart on anything you love.": "Gusa moyo kwa chochote unachokipenda.",
  "Finish / Variant": "Malizia / Aina", "Add to basket ·": "Weka kikapuni ·",
  "🚚 Order today, get it by": "🚚 Agiza leo, pokea", "Buy it now →": "Nunua sasa →",
  "Pairs well with": "Vinaendana na", "3–6 day track": "ufuatiliaji siku 3–6", "Prepaid label": "Lebo hulipwa",
  "Buyer cover": "Ulinzi wa mnunuzi", "Full refund": "Rudishiwa kamili",
  "Secure checkout": "Malipo salama", "Details": "Maelezo", "Payment": "Malipo",
  "First name *": "Jina la kwanza *", "Last name *": "Jina la ukoo *", "Email address": "Barua pepe",
  "Phone / WhatsApp": "Simu / WhatsApp", "Continue to shipping →": "Endelea kwa usafirishaji →",
  "Street address *": "Anwani ya mtaa *", "City *": "Jiji *", "Country *": "Nchi *",
  "Standard tracked ·": "Kawaida inayofuatiliwa ·", "3–6 business days": "siku 3–6 za kazi",
  "1–2 business days": "siku 1–2 za kazi", "← Back": "← Nyuma", "Continue to payment →": "Endelea kwa malipo →",
  "Order summary": "Muhtasari wa agizo", "Promo code (try ABUHUB10)": "Msimbo wa ofa (jaribu ABUHUB10)",
  "Coupon code (try MAKER15)": "Msimbo wa kuponi (jaribu MAKER15)", "Apply": "Tumia",
  "Keep shopping →": "Endelea kununua →", "Back home": "Rudi nyumbani",
  "Welcome to Abu.Hub": "Karibu Abu.Hub", "Sign in to track orders & follow makers.": "Ingia kufuatilia maagizo na kufuata mafundi.",
  "Sign in": "Ingia", "Create account": "Fungua akaunti", "Your name": "Jina lako", "Your email": "Barua pepe yako",
  "Email *": "Barua pepe *", "Password": "Nenosiri", "Continue →": "Endelea →",
  "Protected by password on this device.": "Imelindwa na nenosiri kwenye kifaa hiki.",
  "No orders yet — they’ll appear here after checkout.": "Hakuna maagizo bado — yataonekana hapa baada ya malipo.",
  "Sign out": "Toka",
  "Open your shop today. Keep 92%.": "Fungua duka lako leo. Baki na 92%.",
  "listing fees": "ada za kuorodhesha", "max commission": "kamisheni ya juu", "to go live": "kwenda mtandaoni",
  "Shop name *": "Jina la duka *", "Tell shoppers what you make…": "Waambie wanunuzi unachotengeneza…",
  "Submit application →": "Tuma ombi →",
  "Custom order request · free": "Ombi maalum · bure", "What should makers create for you?": "Mafundi wakutengenezee nini?",
  "Post request → get quotes in ~48h": "Tuma ombi → pata bei ndani ya ~saa 48",
  "Makers reply with price + timeline. You pick — no obligation.": "Mafundi hujibu na bei + muda. Unachagua — hakuna lazima.",
  "Order tracking": "Ufuatiliaji wa agizo", "Where’s my order?": "Agizo langu liko wapi?",
  "Order ref e.g. AH-XXXXXX": "Kumbukumbu mf. AH-XXXXXX", "Track": "Fuatilia",
  "Online · replies instantly": "Mtandaoni · anajibu papo hapo", "Type a message…": "Andika ujumbe…",
  "Your shop here? Join free →": "Duka lako hapa? Jiunge bure →",
  "Signed out.": "Umetoka.", "Saved to wishlist ♥": "Imehifadhiwa ♥", "Removed from wishlist": "Imeondolewa kwenye orodha"
});
/* --- dictionary: tech wings, seller hub, sell page, promote, ledger --- */
Object.assign(I18N.sw, {
  "Artisan ▾": "Ufundi ▾", "Tech Hub ▾": "Teknolojia ▾",
  "Phones & Gadgets": "Simu na Vifaa", "Computers & PCs": "Kompyuta", "Gaming & Consoles": "Michezo",
  "📱 Phones & Gadgets": "📱 Simu na Vifaa", "💻 Computers & PCs": "💻 Kompyuta", "🎮 Gaming & Consoles": "🎮 Michezo",
  "🎮 Gaming": "🎮 Michezo",
  "⚡ Hardware specs": "⚡ Vipimo vya kifaa", "RAM: any": "RAM: zote", "Storage: any": "Hifadhi: zote",
  "Condition: any": "Hali: zote", "New": "Mpya", "Refurbished": "Iliyokarabatiwa",
  "Seller hub": "Kituo cha muuzaji", "My products": "Bidhaa zangu", "+ Add product": "+ Weka bidhaa",
  "Products live": "Bidhaa mtandaoni", "Pending review": "Inasubiri uhakiki", "Units sold": "Viliouzwa",
  "Earnings (92%)": "Mapato (92%)", "List a new product": "Orodhesha bidhaa mpya",
  "One product per submission · goes live after review (instant in demo).": "Bidhaa moja kwa kuwasilisha · inaenda mtandaoni baada ya uhakiki.",
  "Photo *": "Picha *", "JPG/PNG, max 2MB. Auto-compressed on device.": "JPG/PNG, max MB 2.",
  "Product name *": "Jina la bidhaa *", "Price (USD) *": "Bei (USD) *", "Stock *": "Akiba *",
  "Category *": "Kategoria *", "Choose…": "Chagua…", "Description *": "Maelezo *",
  "⚡ Technical specifications": "⚡ Vipimo vya kiufundi", "❋ Artisan details": "❋ Maelezo ya ufundi",
  "Save product →": "Hifadhi bidhaa →", "Cancel": "Ghairi", "No products yet": "Hakuna bidhaa bado",
  "List your first piece — it takes a minute.": "Orodhesha kipande chako cha kwanza.",
  "Edit": "Hariri", "Delete": "Futa", "Sellers sign in here": "Wauzaji ingieni hapa",
  "One account for shopping and selling.": "Akaunti moja kwa kununua na kuuza.",
  "Sign in / Create account →": "Ingia / Fungua akaunti →", "🏪 Open seller hub →": "🏪 Fungua kituo cha muuzaji →",
  "New from maker": "Mpya kutoka kwa fundi", "Live": "Mtandaoni",
  "Ships from Abu.Hub hub in 3–6 days, tracked.": "Inatoka kituo cha Abu.Hub siku 3–6.",
  "Sell on Abu.Hub · 0 listing fees": "Uza Abu.Hub · ada 0",
  "Your craft. Our": "Ufundi wako. Wateja wetu", "190,000 shoppers.": "190,000.",
  "Start application →": "Anza ombi →", "Copy my invite link": "Nakili kiungo changu",
  "Earnings calculator": "Kikokotoo cha mapato", "What would you keep?": "Utabaki na kipi?",
  "Monthly sales:": "Mauzo ya mwezi:", "You keep · 92%": "Unabaki · 92%", "Typical market · 70%": "Soko la kawaida · 70%",
  "Invite & earn": "Alika na upate", "Bring a maker, both win": "Mlete fundi, mshinde wote",
  "Share your link — makers who join with your code get fast-track review, and you get 0% commission for 30 days per joined seller.": "Shiriki kiungo chako — wanaojiunga na msimbo wako wanahakikiwa haraka, nawe unapata 0% kamisheni siku 30.",
  "Your code:": "Msimbo wako:", "Joined via you:": "Waliojiunga kupitia wewe:",
  "Apply as a seller →": "Omba kama muuzaji →",
  "Plans that grow with you": "Mipango inayokua nawe",
  "Every plan keeps the 8% max commission. Pro unlocks the badge + analytics.": "Kila mpango unabaki na 8% kamisheni. Pro inafungua beji + takwimu.",
  "Standard": "Kawaida", "Unlimited listings": "Uorodheshaji usio na kikomo", "Daily payouts": "Malipo ya kila siku",
  "Basic stats": "Takwimu za msingi", "Start free →": "Anza bure →", "POPULAR": "Maarufu",
  "Everything in Standard": "Vyote vya Kawaida", "PRO badge on shop": "Beji ya PRO dukani",
  "Advanced sales ledger": "Leja ya mauzo ya hali ya juu", "Priority review": "Uhakiki wa kipaumbele",
  "Go Pro →": "Kuwa Pro →", "Everything in Pro": "Vyote vya Pro", "Homepage feature slot": "Nafasi ya ukurasa mkuu",
  "Dedicated manager": "Meneja maalum", "0% promo fees": "0% ada za matangazo", "Go Elite →": "Kuwa Elite →",
  "Seller questions, answered": "Maswali ya wauzaji, yamejibiwa", "What does it cost?": "Inagharimu kiasi gani?",
  "$0 listing fees. 8% max commission only when you sell. Payouts daily.": "$0 ada. 8% kamisheni unapouza tu. Malipo kila siku.",
  "How do I get paid?": "Nitalipwaje?",
  "Daily payouts to bank or mobile money (M-Pesa, Airtel). Track everything from your inbox.": "Malipo ya kila siku kwa benki au pesa za simu. Fuatilia kila kitu.",
  "Can resellers dropship my goods?": "Je, wauzaji wanaweza kudondosha bidhaa zangu?",
  "Yes — tick “I want dropship resellers” in your application. You ship direct in unbranded packaging and keep your wholesale margin.": "Ndiyo — weka alama unapoomba. Unatuma moja kwa moja bila chapa na unabaki na faida.",
  "Who can join?": "Nani anaweza kujiunga?",
  "Independent makers, artisans and small brands with original goods. Every shop is reviewed within 24 hours.": "Mafundi huru na chapa ndogo zenye bidhaa asilia. Kila duka linahakikiwa ndani ya saa 24.",
  "Vendor advertising · flat fee": "Matangazo ya muuzaji · ada", "Pin it where shoppers look": "Ibandike wanunuzi wanapoangalia",
  "1 week": "wiki 1", "2 weeks": "wiki 2", "4 weeks": "wiki 4",
  "Billing email *": "Barua pepe ya malipo *", "Pinning fee": "Ada ya kubandika",
  "Pay fee → pin my product": "Lipa ada → bandika bidhaa",
  "Invoice + receipt by email. Pinning starts on payment, refundable in 24h.": "Ankara na risiti kwa barua pepe. Kubandika kunaanza ukilipa.",
  "Advanced sales ledger is a Pro feature": "Leja ya hali ya juu ni ya Pro",
  "Per-order commission breakdown, payouts and history — plus the ◆ badge.": "Mgawanyo wa kamisheni, malipo na historia — pamoja na beji.",
  "See Pro $9/mo →": "Tazama Pro $9/mwezi →", "Sales ledger": "Leja ya mauzo",
  "Cart": "Kikapu", "Account": "Akaunti",
  "📦 Track order": "📦 Fuatilia agizo", "🚚 Shipping": "🚚 Usafirishaji", "🏷️ Discounts": "🏷️ Punguzo", "💬 Human": "💬 Mtu"
});
Object.assign(I18N.fr, {
  "Artisan ▾": "Artisanat ▾", "Tech Hub ▾": "Tech ▾",
  "Phones & Gadgets": "Téléphones & Gadgets", "Computers & PCs": "Ordinateurs & PC", "Gaming & Consoles": "Jeux & Consoles",
  "📱 Phones & Gadgets": "📱 Téléphones & Gadgets", "💻 Computers & PCs": "💻 Ordinateurs & PC", "🎮 Gaming & Consoles": "🎮 Jeux & Consoles",
  "🎮 Gaming": "🎮 Jeux",
  "⚡ Hardware specs": "⚡ Caractéristiques", "RAM: any": "RAM : tous", "Storage: any": "Stockage : tous",
  "Condition: any": "État : tous", "New": "Neuf", "Refurbished": "Reconditionné",
  "Seller hub": "Espace vendeur", "My products": "Mes articles", "+ Add product": "+ Ajouter",
  "Products live": "Articles en ligne", "Pending review": "En révision", "Units sold": "Vendus",
  "Earnings (92%)": "Gains (92%)", "Cancel": "Annuler", "Edit": "Modifier", "Delete": "Supprimer",
  "Save product →": "Enregistrer →", "Sign in / Create account →": "Se connecter / Créer un compte →",
  "Cart": "Panier", "Account": "Compte",
  "📦 Track order": "📦 Suivre commande", "🚚 Shipping": "🚚 Livraison", "🏷️ Discounts": "🏷️ Promos", "💬 Human": "💬 Humain",
  "Start selling — it’s free": "Commencez à vendre — c'est gratuit"
});
Object.assign(I18N.fr, {
  "The marketplace": "Le marché", "Shop all goods": "Tous les articles", "☰ Filters": "☰ Filtres",
  "Filters": "Filtres", "Clear all": "Tout effacer", "Search": "Rechercher", "Try ‘lamp’, ‘pearl’…": "Essayez ‘lampe’, ‘perle’…",
  "Category": "Catégorie", "Max price ·": "Prix max ·", "Rating": "Note", "Any": "Tous",
  "Vendor": "Vendeur", "Fulfilment": "Expédition", "📦 Ships from maker (dropship)": "📦 Expédié par le créateur",
  "Sort": "Trier", "Featured": "En vedette", "Price: low → high": "Prix croissant",
  "Price: high → low": "Prix décroissant", "Top rated": "Mieux notés",
  "Nothing found — yet.": "Rien trouvé — pour l'instant.", "Try a different search or clear filters.": "Essayez une autre recherche ou effacez les filtres.",
  "Clear filters": "Effacer les filtres",
  "2,400+ independent shops": "2 400+ boutiques indépendantes", "Meet the vendors": "Rencontrez les vendeurs",
  "Every seller is identity-verified and quality-checked. Follow your favourites and get notified of new drops.": "Chaque vendeur est vérifié. Suivez vos favoris pour les nouveautés.",
  "Search vendors… e.g. ‘kiln’, ‘coffee’": "Rechercher vendeurs… ex. ‘four’, ‘café’",
  "← All vendors": "← Tous les vendeurs", "Goods from this shop": "Articles de cette boutique",
  "A market where makers keep the magic": "Un marché où les créateurs gardent la magie", "— and the margin.": "— et la marge.",
  "paid to makers": "versés aux créateurs", "monthly shoppers": "acheteurs mensuels", "countries served": "pays desservis",
  "Have something beautiful to sell?": "Quelque chose de beau à vendre ?",
  "Join 2,400+ makers. Free to start, live in a day.": "Rejoignez 2 400+ créateurs. Gratuit, en ligne en un jour.",
  "Your basket": "Votre panier", "Subtotal": "Sous-total", "Shipping": "Livraison",
  "Checkout securely →": "Payer en sécurité →", "Continue shopping": "Continuer mes achats",
  "Your basket is empty": "Votre panier est vide", "Beautiful handmade things await.": "De beaux articles artisanaux vous attendent.",
  "Start shopping": "Commencer mes achats", "Wishlist": "Favoris", "Nothing saved yet": "Rien enregistré",
  "Tap the heart on anything you love.": "Touchez le cœur de vos coups de cœur.",
  "Finish / Variant": "Finition / Variante", "Add to basket ·": "Ajouter au panier ·",
  "🚚 Order today, get it by": "🚚 Commandez, reçu le", "Buy it now →": "Acheter →",
  "Pairs well with": "Va bien avec", "3–6 day track": "suivi 3–6 jours", "Prepaid label": "Étiquette prépayée",
  "Buyer cover": "Protection acheteur", "Full refund": "Remboursement intégral",
  "Secure checkout": "Paiement sécurisé", "Details": "Coordonnées", "Payment": "Paiement",
  "First name *": "Prénom *", "Last name *": "Nom *", "Email address": "E-mail",
  "Phone / WhatsApp": "Téléphone / WhatsApp", "Continue to shipping →": "Continuer vers la livraison →",
  "Street address *": "Adresse *", "City *": "Ville *", "Country *": "Pays *",
  "Standard tracked ·": "Standard suivi ·", "3–6 business days": "3–6 jours ouvrés",
  "1–2 business days": "1–2 jours ouvrés", "← Back": "← Retour", "Continue to payment →": "Continuer vers le paiement →",
  "Order summary": "Résumé", "Promo code (try ABUHUB10)": "Code promo (essayez ABUHUB10)",
  "Coupon code (try MAKER15)": "Code coupon (essayez MAKER15)", "Apply": "Appliquer",
  "Keep shopping →": "Continuer mes achats →", "Back home": "Accueil",
  "Welcome to Abu.Hub": "Bienvenue sur Abu.Hub", "Sign in to track orders & follow makers.": "Connectez-vous pour suivre commandes et créateurs.",
  "Sign in": "Se connecter", "Create account": "Créer un compte", "Your name": "Votre nom", "Your email": "Votre e-mail",
  "Email *": "E-mail *", "Password": "Mot de passe", "Continue →": "Continuer →",
  "Protected by password on this device.": "Protégé par mot de passe sur cet appareil.",
  "No orders yet — they’ll appear here after checkout.": "Aucune commande — elles apparaîtront ici après achat.",
  "Sign out": "Déconnexion",
  "Open your shop today. Keep 92%.": "Ouvrez votre boutique aujourd'hui. Gardez 92 %.",
  "listing fees": "frais d'annonce", "max commission": "commission max", "to go live": "pour être en ligne",
  "Shop name *": "Nom de boutique *", "Tell shoppers what you make…": "Dites ce que vous créez…",
  "Submit application →": "Envoyer ma demande →",
  "Custom order request · free": "Demande sur mesure · gratuit", "What should makers create for you?": "Que doivent créer les créateurs ?",
  "Post request → get quotes in ~48h": "Publier → devis sous ~48h",
  "Makers reply with price + timeline. You pick — no obligation.": "Les créateurs répondent avec prix et délai. Vous choisissez — sans obligation.",
  "Order tracking": "Suivi de commande", "Where’s my order?": "Où est ma commande ?",
  "Order ref e.g. AH-XXXXXX": "Réf ex. AH-XXXXXX", "Track": "Suivre",
  "Online · replies instantly": "En ligne · répond aussitôt", "Type a message…": "Écrivez un message…",
  "Your shop here? Join free →": "Votre boutique ici ? Gratuit →",
  "Signed out.": "Déconnecté.", "Saved to wishlist ♥": "Ajouté aux favoris ♥", "Removed from wishlist": "Retiré des favoris"
});
Object.assign(I18N.fr, {
  "Shop all": "Boutique", "Fashion": "Mode", "Home": "Maison", "Vendors": "Vendeurs", "Our story": "Notre histoire",
  "2,400+ sellers live": "2 400+ vendeurs en ligne", "Search makers, goods…": "Rechercher créateurs, articles…",
  "Search the marketplace…": "Rechercher sur la place…", "Sell on Abu.Hub": "Vendre sur Abu.Hub",
  "Home & Living": "Maison & Vie", "Our impact →": "Notre impact →",
  "✦ New season drop": "✦ Nouvelle collection", "Verified artisans only": "Artisans vérifiés uniquement",
  "Beautiful things,": "De belles choses,", "made by": "faites par", "real hands.": "de vraies mains.",
  "Shop 12,000+ small-batch goods from 2,400 independent sellers — fashion, home, beauty & craft, all in one elegant market.": "12 000+ articles artisanaux de 2 400 vendeurs indépendants — mode, maison, beauté et artisanat, sur une place élégante.",
  "Shop the marketplace": "Acheter sur le marché", "Meet the makers": "Rencontrer les créateurs",
  "from 48,000+ happy shoppers": "de plus de 48 000 acheteurs satisfaits",
  "Curated · 214 pieces": "Sélection · 214 pièces", "The Handmade Table": "La Table Artisanale",
  "Shop home →": "Voir maison →", "For makers": "Pour les créateurs",
  "Sell to 190k monthly shoppers. 0 listing fees.": "Vendez à 190k acheteurs mensuels. 0 frais d'annonce.",
  "Open your shop": "Ouvrez votre boutique", "Glow Rituals": "Rituels Éclat", "Botanical bestsellers": "Best-sellers botaniques",
  "Buyer protection": "Protection acheteur", "Full refund if it’s not as described": "Remboursement intégral si non conforme",
  "Verified sellers": "Vendeurs vérifiés", "Every maker is ID & quality checked": "Chaque créateur est vérifié",
  "Fast, tracked shipping": "Livraison rapide et suivie", "30-day returns": "Retours 30 jours",
  "No questions, prepaid label": "Sans questions, étiquette prépayée",
  "Browse by craft": "Parcourir par artisanat", "Shop by category": "Acheter par catégorie", "View everything →": "Tout voir →",
  "Loved right now": "Adorés en ce moment", "Trending across the Hub": "Tendances du Hub",
  "Explore all 12,000+ goods": "Explorer 12 000+ articles", "All": "Tous",
  "Hot right now": "Populaire actuellement", "Frequently searched": "Recherches fréquentes", "Search everything →": "Tout rechercher →",
  "Verified by 48,000+ reviews": "Vérifié par 48 000+ avis", "Top ranking this week": "Top de la semaine",
  "Shop all →": "Tout acheter →", "Autumn Market Week · ends in": "Semaine du Marché · se termine dans",
  "days": "jours", "hrs": "h", "min": "min", "sec": "sec",
  "Up to 30% off handmade icons": "Jusqu'à -30% sur les icônes artisanales",
  "Stack code": "Utilisez le code", "on top of sale prices.": "en plus des prix soldés.",
  "Shop the sale →": "Voir les promos →", "Coupon centre · tap to copy": "Coupons · touchez pour copier",
  "Steals under $50": "Pépites à moins de 50 $",
  "Picked up where you left off": "Reprenez où vous étiez", "Recently viewed": "Vus récemment", "Clear": "Effacer",
  "Visit their shop": "Visiter sa boutique", "Makers": "Créateurs", "Paid to sellers": "Versés aux vendeurs",
  "5-star reviews": "Avis 5 étoiles", "Editor’s curation": "Sélection de la rédaction", "Collections to get lost in": "Collections à explorer",
  "Independent & proud": "Indépendants et fiers", "Star sellers this week": "Vendeurs stars de la semaine",
  "All vendors →": "Tous les vendeurs →", "Pavilions": "Pavillons", "Shop by origin": "Acheter par origine"
});
/* ---------- Neon dark mode ---------- */
let theme = localStorage.getItem("abuhub_theme") || "light";
function setTheme(t) {
  theme = t === "dark" ? "dark" : "light";
  localStorage.setItem("abuhub_theme", theme);
  document.body.classList.toggle("dark", theme === "dark");
  $("#themeIco").textContent = theme === "dark" ? "☀️" : "🌙";
  document.querySelector("meta[name='theme-color']").setAttribute("content", theme === "dark" ? "#12100D" : "#191512");
}
function toggleTheme() { setTheme(theme === "dark" ? "light" : "dark"); toast(theme === "dark" ? "Neon dark mode on 🌙" : "Light mode ☀️"); }

/* ---------- Liquid nav blob ---------- */
function moveBlob(el) {
  const nav = $("#mainNav"), blob = $("#navBlob");
  if (!nav || !blob || !el) return;
  nav.classList.add("blob-on");
  const n = nav.getBoundingClientRect(), r = el.getBoundingClientRect();
  blob.style.left = (r.left - n.left) + "px";
  blob.style.width = r.width + "px";
}
document.addEventListener("click", (e) => {
  const link = e.target.closest ? e.target.closest("#mainNav .navlink") : null;
  if (link) moveBlob(link);
});

/* ---------- 3D auth flip ---------- */
/* (flip runs inside setAuthMode above) */

/* ---------- Interactive shape slider ---------- */
const MOODS = [
  { title: "Earthy Calm", sub: "Clay, oat & stoneware for slow mornings", img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80&auto=format&fit=crop", q: "bowl", glow: "#BC5A28" },
  { title: "Golden Hour", sub: "Pearls & gold that catch the light", img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&auto=format&fit=crop", q: "pearl", glow: "#C8A15A" },
  { title: "Deep Forest", sub: "Wool throws & oak for cozy nights", img: "https://images.unsplash.com/photo-1580301762395-83604735c6c0?w=800&q=80&auto=format&fit=crop", q: "throw", glow: "#2F3A2E" },
  { title: "Bold Muse", sub: "Statement dresses & prints", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80&auto=format&fit=crop", q: "dress", glow: "#9A451C" },
  { title: "Ritual Glow", sub: "Botanical oils & butters", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format&fit=crop", q: "oil", glow: "#606C38" }
];
let moodIdx = 0, moodTimer = null;
function renderMoods() {
  const track = $("#moodTrack"), dots = $("#moodDots");
  if (!track || !dots) return;
  track.innerHTML = MOODS.map((m, i) => `
    <div class="mood-slide shrink-0 w-[78%] sm:w-[46%] lg:w-[31.5%] cursor-pointer" onclick="moodShop('${m.q}')">
      <div class="blob-img overflow-hidden h-64 sm:h-72" style="box-shadow:0 0 0 3px ${m.glow}55, 0 0 44px ${m.glow}44">
        <img src="${m.img}" loading="lazy" class="w-full h-full object-cover" alt="${m.title}" />
      </div>
      <h3 class="font-display text-2xl mt-4">${m.title}</h3>
      <p class="text-sm text-muted">${m.sub}</p>
      <span class="link-more text-sm">Shop the mood →</span>
    </div>`).join("");
  dots.innerHTML = MOODS.map((_, i) => `<span class="mood-dot ${i === 0 ? "on" : ""}" onclick="moodShow(${i})"></span>`).join("");
  moodShow(0); moodAuto(); moodDrag();
}
function moodShow(i) {
  moodIdx = (i + MOODS.length) % MOODS.length;
  const track = $("#moodTrack"); if (!track || !track.children.length) return;
  const slide = track.children[moodIdx];
  track.style.transform = `translateX(${-slide.offsetLeft + 8}px)`;
  $$("#moodDots .mood-dot").forEach((d, j) => d.classList.toggle("on", j === moodIdx));
}
function moodGo(d) { moodShow(moodIdx + d); moodAuto(); }
function moodShop(q) { hotSearch(q); }
function moodAuto() {
  clearInterval(moodTimer);
  moodTimer = setInterval(() => { if (!document.hidden) moodShow(moodIdx + 1); }, 4500);
}
function moodDrag() {
  const track = $("#moodTrack"); if (!track || track.dataset.drag) return;
  track.dataset.drag = "1";
  let x0 = 0, dx = 0, on = false;
  track.addEventListener("pointerdown", (e) => { on = true; x0 = e.clientX; track.setPointerCapture(e.pointerId); });
  track.addEventListener("pointermove", (e) => { if (on) dx = e.clientX - x0; });
  track.addEventListener("pointerup", () => {
    if (!on) return; on = false;
    if (dx < -40) moodShow(moodIdx + 1);
    else if (dx > 40) moodShow(moodIdx - 1);
    dx = 0; moodAuto();
  });
}

/* ---------- Simple authentication (password accounts on this device, cloud API when set) ---------- */
let _authUser = JSON.parse(localStorage.getItem("abuhub_user") || "null");
let _authMode = "signin";
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
  const map = { home: "view-home", shop: "view-shop", vendors: "view-vendors", vendor: "view-vendor", about: "view-about", sell: "view-sell", seller: "view-seller" };
  $("#" + (map[view] || "view-home")).classList.remove("hidden");
  $("#mobileNav").classList.add("hidden");
  if (cat) { filters.cats = [cat]; syncFilterUI(); }
  if (view === "shop") renderShop();
  if (view === "vendors") renderVendors();
  if (view === "sell") renderSell();
  if (view === "seller") renderSellerHub();
  $$("#mobileTabs .mtab").forEach(b => b.classList.toggle("on", b.dataset.tab === view || (view === "vendor" && b.dataset.tab === "shop")));
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
  const v = vendorById(p.vendorId) || virtualVendor(p.vendorId, "Independent maker");
  const wished = wishlist.includes(p.id);
  const feat = promoFor(p.id);
  const sale = feat ? `<span class="p-badge sale">★ Featured</span>` : (p.oldPrice ? `<span class="p-badge sale">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : (p.badge ? `<span class="p-badge">${p.badge}</span>` : ""));
  return `
  <article class="p-card">
    <div class="p-img" onclick="openProduct('${p.id}')">
      <img loading="lazy" src="${p.img}" alt="${p.name}" />
      ${sale}
      <button class="p-wish ${wished ? "on" : ""}" onclick="event.stopPropagation();toggleWish('${p.id}')" aria-label="wishlist">${wished ? "♥" : "♡"}</button>
      <button class="p-quick" onclick="event.stopPropagation();quickAdd('${p.id}')">+ Quick add · ${money(p.price)}</button>
    </div>
    <div class="p-4 sm:p-5 flex flex-col gap-1.5 flex-1">
      <button onclick="openVendor('${v.id}')" class="text-[12px] font-semibold text-[#BC5A28] uppercase tracking-wider text-left hover:underline">${v.name}${v.verified ? " ✓" : ""}</button>
      ${v.tier ? `<span class="text-[11px] font-bold text-[#C8A15A]">◆ ${String(v.tier).toUpperCase()} SELLER</span>` : ""}
      ${v.dropship ? `<span class="text-[11px] font-bold text-[#0AA5C2]">📦 SHIPS FROM MAKER</span>` : ""}
      <h3 onclick="openProduct('${p.id}')" class="font-display text-[16px] sm:text-[18px] leading-snug cursor-pointer hover:text-[#BC5A28] line-clamp-1">${p.name}</h3>
      <div class="flex items-center gap-1.5 text-[13px]"><span class="text-[#C8A15A] tracking-tight">${stars(p.rating)}</span><span class="text-muted">${p.rating} (${p.reviews})</span></div>
      ${p.specs ? `<p class="text-[11px] font-bold text-[#0AA5C2] mt-1">⚡ ${[p.specs.ram, p.specs.storage, p.specs.condition].filter(Boolean).join(" · ")}</p>` : ""}
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
  const list = pinPromoted((trendCat === "All" ? [...ALL_PRODUCTS].sort((a, b) => b.reviews - a.reviews) : ALL_PRODUCTS.filter(p => p.category === trendCat))).slice(0, 8);
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
  renderHot(); renderRanking(); renderDeals(); renderOrigins(); renderRfqCount(); renderCoupons(); renderRecent(); renderMoods();
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
  const top = [...ALL_PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
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
  u.innerHTML = ALL_PRODUCTS.filter(p => p.price < 50).slice(0, 4).map(p => `
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
  filters = { q: "", cats: [], max: 600, minRating: 0, vendors: ids, dropship: false, tech: { ram: 0, storage: 0, cond: "" }, sort: "featured" };
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

/* ----- Shielded vendor chat (Protocol A+B: no raw numbers + disclaimer) ----- */
let _pendingVendorChat = null;
function vendorChat(id) {
  const v = vendorById(id); if (!v) return;
  _pendingVendorChat = id;
  $("#protectVendor").textContent = v.name;
  showModal("protectModal");
}
function protectContinue() {
  const id = _pendingVendorChat, v = vendorById(id);
  const ack = { vendor: id, date: new Date().toISOString(), user: (_authUser || {}).email || "guest" };
  const a = JSON.parse(localStorage.getItem("abuhub_chatack") || "[]");
  a.unshift(ack); localStorage.setItem("abuhub_chatack", JSON.stringify(a.slice(0, 50)));
  if (API_BASE) api("/api/chat-ack", { method: "POST", body: JSON.stringify({ vendor: id }) }).catch(() => null);
  closeAll();
  const isVirtual = id && id.startsWith("s-");
  const url = (API_BASE && !isVirtual)
    ? API_BASE + "/api/vendors/" + id + "/chat?text=" + encodeURIComponent("Hi " + v.name + "! I found you on Abu.Hub.")
    : "https://wa.me/" + SUPPORT_WA + "?text=" + encodeURIComponent("Hi Abu.Hub! Connect me to " + v.name + ".");
  window.open(url, "_blank");
  toast("Chat opened — pay through Abu.Hub checkout to keep your guarantee ✓");
}
function protectCheckout() { closeAll(); openCart(); }

/* ---------- Promotions shelf (paid pinning: Hot $9/wk, Trending $19/wk) ---------- */
const PROMO_RATES = { hot: 9, trending: 19 };
let CLOUD_PROMOS = [];
async function fetchPromos() {
  if (!API_BASE) return;
  try {
    const j = await (await fetch(API_BASE + "/api/promotions?active=1")).json();
    CLOUD_PROMOS = (j.promotions || []).map(p => ({ productId: p.productId, shelf: p.shelf, ends: p.ends }));
  } catch {}
}
function localPromos() {
  const now = Date.now();
  return JSON.parse(localStorage.getItem("abuhub_promos") || "[]").filter(p => p.ends > now);
}
function promoFor(pid) {
  const now = Date.now();
  return localPromos().concat(CLOUD_PROMOS).find(p => p.productId === pid && p.ends > now) || null;
}
function pinPromoted(list) {
  return [...list].sort((a, b) => ((promoFor(b.id) ? 1 : 0) - (promoFor(a.id) ? 1 : 0)));
}
function openPromote(pid, vendorId) {
  const list = vendorId ? ALL_PRODUCTS.filter(p => p.vendorId === vendorId) : ALL_PRODUCTS;
  const opts = list.map(p => `<option value="${p.id}" ${p.id === pid ? "selected" : ""}>${p.name} — ${money(p.price)}</option>`).join("");
  $("#promoteBody").innerHTML = `
    <div class="grid gap-2.5">
      <select id="pmProduct" class="f-input">${opts}</select>
      <div class="grid grid-cols-2 gap-2.5">
        <select id="pmShelf" onchange="pmFee()" class="f-input"><option value="hot">🔥 Hot Right Now — $9/wk</option><option value="trending">📈 Trending shelf — $19/wk</option></select>
        <select id="pmWeeks" onchange="pmFee()" class="f-input"><option value="1">1 week</option><option value="2">2 weeks</option><option value="4">4 weeks</option></select>
      </div>
      <input id="pmEmail" type="email" value="${(_authUser || {}).email || checkoutData.email || ""}" placeholder="Billing email *" class="f-input" />
      <div class="bg-cream2 border border-line rounded-2xl p-4 text-sm flex justify-between"><span>Pinning fee</span><strong id="pmFee" class="font-display text-xl">$9</strong></div>
      <button onclick="submitPromote()" class="btn-ink w-full">Pay fee → pin my product</button>
      <p class="text-xs text-muted text-center">Invoice + receipt by email. Pinning starts on payment, refundable in 24h.</p>
    </div>`;
  pmFee();
  showModal("promoteModal");
}
function pmFee() {
  const fee = (PROMO_RATES[$("#pmShelf").value] || 9) * Number($("#pmWeeks").value || 1);
  $("#pmFee").textContent = money(fee);
}
async function submitPromote() {
  const productId = $("#pmProduct").value, shelf = $("#pmShelf").value, weeks = Number($("#pmWeeks").value || 1);
  const email = $("#pmEmail").value.trim();
  if (!email) { toast("Billing email required", "warn"); return; }
  const fee = PROMO_RATES[shelf] * weeks, now = Date.now();
  const rec = { productId, shelf, weeks, fee, email, ends: now + weeks * 7 * 864e5, date: new Date().toISOString() };
  const all = JSON.parse(localStorage.getItem("abuhub_promos") || "[]");
  all.unshift(rec); localStorage.setItem("abuhub_promos", JSON.stringify(all));
  if (API_BASE && API_TOKEN) api("/api/promotions", { method: "POST", body: JSON.stringify({ productId, shelf, weeks, email }) }).catch(() => null);
  closeAll(); refreshDynamic();
  toast(`“${productById(productId).name}” pinned on ${shelf} for ${weeks}wk · invoice $${fee} sent to ${email} ✓`);
}

/* ----- Seller hub: dashboard + upload flow ----- */
let _editingId = null, _upImg = "", _sellerTab = "products";
function sellerTab(t) {
  _sellerTab = t;
  $("#sellerProducts").classList.toggle("hidden", t !== "products");
  $("#sellerForm").classList.toggle("hidden", t !== "add");
  $("#tabBtnProducts").className = "px-5 py-3 font-semibold text-[15px] border-b-2 -mb-px " + (t === "products" ? "border-ink" : "border-transparent text-muted");
  $("#tabBtnAdd").className = "px-5 py-3 font-semibold text-[15px] border-b-2 -mb-px " + (t === "add" ? "border-ink" : "border-transparent text-muted");
}
async function renderSellerHub() {
  const gate = $("#sellerGate"), dash = $("#sellerDash");
  if (!_authUser) {
    gate.innerHTML = `<div class="rounded-[28px] border border-line bg-white p-10 text-center max-w-lg mx-auto">
      <p class="text-5xl">🏪</p><h3 class="font-display text-3xl mt-4">Sellers sign in here</h3>
      <p class="text-muted text-sm mt-2">One account for shopping and selling.</p>
      <button onclick="openAuth()" class="btn-ink mt-5">Sign in / Create account →</button></div>`;
    dash.classList.add("hidden"); return;
  }
  gate.innerHTML = ""; dash.classList.remove("hidden");
  $("#sellerShopName").textContent = shopOf().replace(/'s Shop$/, "");
  let stats = { products: 0, pending: 0, sales: 0, gross: 0, commission: 0 };
  const key = sellerKey();
  const locals = JSON.parse(localStorage.getItem("abuhub_myproducts") || "[]");
  if (API_BASE && API_TOKEN) {
    try { Object.assign(stats, await api("/api/seller/stats")); } catch {}
  } else {
    const orders = JSON.parse(localStorage.getItem("abuhub_orders") || "[]");
    let sales = 0, gross = 0;
    orders.forEach(o => (o.items || []).forEach(l => {
      const p = ALL_PRODUCTS.find(x => x.id === l.id);
      if (p && p.vendorId === key) { sales += l.qty; gross += p.price * l.qty; }
    }));
    stats = { products: locals.length, pending: 0, sales, gross, commission: gross * 0.08 };
  }
  $("#sellerStats").innerHTML = [
    ["Products live", stats.products], ["Pending review", stats.pending || 0],
    ["Units sold", stats.sales || 0], ["Earnings (92%)", money((stats.gross || 0) * 0.92)]
  ].map(([l, v]) => `<div class="statbox"><strong>${v}</strong><span>${l}</span></div>`).join("");
  const items = locals.concat(CLOUD_MINE);
  $("#sellerProducts").innerHTML = items.map(p => `
    <article class="p-card">
      <div class="p-img" onclick="openProduct('${p.id}')">
        <img loading="lazy" src="${p.img}" alt="${p.name}" />
        <span class="p-badge ${p.status === "approved" ? "" : "sale"}">${p.status === "approved" ? (p.badge || "Live") : "⏳ Pending"}</span>
      </div>
      <div class="p-4 flex flex-col gap-1">
        <h3 class="font-display text-[16px] line-clamp-1">${p.name}</h3>
        <p class="text-[13px] text-muted">${p.category} · stock ${p.stock}</p>
        <div class="flex items-center gap-2 mt-1">
          <strong>${money(p.price)}</strong>
          <span class="ml-auto flex gap-1.5">
            <button onclick="editProduct('${p.id}')" class="text-xs font-bold bg-cream2 rounded-full px-3 py-1.5 hover:bg-ink hover:text-cream transition">Edit</button>
            <button onclick="delProduct('${p.id}')" class="text-xs font-bold bg-red-50 text-red-700 rounded-full px-3 py-1.5 hover:bg-red-600 hover:text-white transition">Delete</button>
          </span>
        </div>
      </div>
    </article>`).join("") || `<div class="col-span-full text-center py-14 bg-white border border-line rounded-[24px]">
      <p class="text-5xl">📦</p><p class="font-display text-2xl mt-3">No products yet</p>
      <p class="text-sm text-muted">List your first piece — it takes a minute.</p>
      <button onclick="sellerTab('add')" class="btn-ink mt-4">+ Add product</button></div>`;
  sellerTab(_sellerTab);
  const tier = myTier();
  const led = $("#sellerLedger");
  if (!tier) {
    led.innerHTML = `<div class="rounded-[24px] border border-dashed border-gold bg-[#C8A15A]/10 p-6 text-center">
      <p class="font-display text-xl">🔒 Advanced sales ledger is a Pro feature</p>
      <p class="text-sm text-muted mt-1">Per-order commission breakdown, payouts and history — plus the ◆ badge.</p>
      <button onclick="go('sell')" class="btn-ink mt-4 !py-3 text-sm">See Pro $9/mo →</button></div>`;
    return;
  }
  let rows = [];
  if (API_BASE && API_TOKEN) {
    try { rows = (await api("/api/seller/transactions")).transactions || []; } catch {}
  } else {
    const orders = JSON.parse(localStorage.getItem("abuhub_orders") || "[]");
    const key = sellerKey();
    orders.forEach(o => (o.items || []).forEach(l => {
      const p = ALL_PRODUCTS.find(x => x.id === l.id);
      if (p && p.vendorId === key) {
        const gross = p.price * l.qty;
        rows.push({ orderRef: o.ref, productId: p.id, gross, commission: gross * 0.08, net: gross * 0.92, date: o.date });
      }
    }));
  }
  led.innerHTML = `<div class="rounded-[24px] bg-white border border-line p-6">
    <div class="flex items-center justify-between"><h3 class="font-display text-2xl">Sales ledger <span class="text-xs font-sans font-bold text-[#C8A15A] align-middle">◆ ${tier.toUpperCase()}</span></h3></div>
    ${rows.map(t => `<div class="flex justify-between text-[13px] border-b border-line py-2.5 last:border-0"><span><strong>${t.orderRef}</strong> · ${(productById(t.productId) || {}).name || t.productId}</span><span class="text-right">+${money(t.net)} <span class="text-muted">(−${money(t.commission)} fee)</span></span></div>`).join("") || `<p class="text-sm text-muted mt-2">No sales yet — share your shop link!</p>`}
  </div>`;
}
function resetUpload() {
  _editingId = null; _upImg = "";
  ["upName", "upPrice", "upStock", "upCat", "upDesc", "upChip", "upRam", "upStorage", "upScreen", "upBattery", "upMaterials", "upDims", "upCare"].forEach(id => { const el = document.getElementById(id); if (el) el.value = id === "upStock" ? 10 : ""; });
  const cond = document.getElementById("upCond"); if (cond) cond.value = "";
  $("#upFile").value = ""; $("#upPreview").classList.add("hidden");
  $("#techFields").classList.add("hidden"); $("#craftFields").classList.add("hidden");
  $("#upPhotoMsg").textContent = "JPG/PNG, max 2MB. Auto-compressed on device.";
  $("#upTitle").textContent = "List a new product";
}
function showUpPreview(src) { const im = $("#upPreview"); im.src = src; im.classList.remove("hidden"); }
/* Conditional upload fields: tech specs vs artisan details */
function isTechCat(c) { return (typeof TECH_CATS !== "undefined" ? TECH_CATS : []).includes(c); }
function upCatChange() {
  const tech = isTechCat($("#upCat").value);
  const anyCat = !!$("#upCat").value;
  $("#techFields").classList.toggle("hidden", !tech);
  $("#craftFields").classList.toggle("hidden", !anyCat || tech);
}
function collectSpecs() {
  const specs = {};
  ["upChip:chip", "upRam:ram", "upStorage:storage", "upScreen:screen", "upBattery:battery", "upCond:condition"].forEach(pair => {
    const [id, k] = pair.split(":");
    const v = (document.getElementById(id)?.value || "").trim();
    if (v) specs[k] = v.slice(0, 60);
  });
  return specs;
}
function collectCraft() {
  const g = (id) => (document.getElementById(id)?.value || "").trim().slice(0, 200);
  const craft = {};
  if (g("upMaterials")) craft.materials = g("upMaterials");
  if (g("upDims")) craft.dimensions = g("upDims");
  if (g("upCare")) craft.care = g("upCare");
  return craft;
}
function upPhoto(input) {
  const f = input.files[0]; if (!f) return;
  const msg = $("#upPhotoMsg");
  if (!f.type.startsWith("image/")) { msg.textContent = "That file is not an image."; return; }
  if (API_BASE) {
    const fd = new FormData(); fd.append("photo", f);
    msg.textContent = "Uploading…";
    fetch(API_BASE + "/api/media/direct", { method: "POST", body: fd }).then(r => r.json()).then(j => {
      if (!j.url) throw 0;
      _upImg = API_BASE + j.url; showUpPreview(_upImg); msg.textContent = "Uploaded ✓";
    }).catch(() => { msg.textContent = "Upload failed — try a smaller photo (max 2MB)."; });
    return;
  }
  const img = new Image();
  img.onload = () => {
    const sc = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    _upImg = c.toDataURL("image/jpeg", 0.82);
    showUpPreview(_upImg);
    msg.textContent = `Photo ready ✓ (~${Math.round(_upImg.length / 1365)} KB, stored on device)`;
  };
  img.onerror = () => { msg.textContent = "Could not read that photo."; };
  img.src = URL.createObjectURL(f);
}
async function submitUpload(e) {
  e.preventDefault();
  const errBox = $("#upErr");
  const err = (m) => { errBox.textContent = m; errBox.classList.remove("hidden"); window.scrollTo({ top: 0 }); };
  errBox.classList.add("hidden");
  const name = $("#upName").value.trim(), price = Number($("#upPrice").value),
    stock = Math.floor(Number($("#upStock").value)), cat = $("#upCat").value, desc = $("#upDesc").value.trim();
  if (name.length < 3) return err("Give your product a name (3+ characters).");
  if (!(price > 0)) return err("Set a price above $0.");
  if (!cat) return err("Choose a category.");
  if (!desc) return err("Add a short description.");
  if (!_upImg) return err("Add a photo first.");
  const specs = isTechCat(cat) ? collectSpecs() : {};
  const craft = !isTechCat(cat) ? collectCraft() : {};
  if (isTechCat(cat) && !specs.condition) return err("Pick a device condition (New / Refurbished / Used).");
  const btn = $("#upSubmit"); btn.textContent = "Saving…"; btn.disabled = true;
  try {
    if (API_BASE && API_TOKEN) {
      const payload = { name, price, stock: stock >= 0 ? stock : 0, category: cat, description: desc, image: _upImg, specs, craft };
      if (_editingId) await api("/api/products/" + _editingId, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      toast(_editingId ? "Product updated ✓" : "Saved — pending review, live after approval ✓");
    } else {
      const all = JSON.parse(localStorage.getItem("abuhub_myproducts") || "[]");
      if (_editingId) {
        const p = all.find(x => x.id === _editingId);
        if (p) Object.assign(p, { name, price, stock, category: cat, desc, img: _upImg, specs: Object.keys(specs).length ? specs : undefined, craft: Object.keys(craft).length ? craft : undefined });
      } else {
        all.unshift({ id: "L-" + Date.now().toString(36).toUpperCase(), vendorId: sellerKey(), shop: shopOf(), name, category, price, oldPrice: null, rating: 5.0, reviews: 0, img: _upImg, badge: "New from maker", colors: ["Standard"], desc, stock: stock >= 0 ? stock : 0, status: "approved", specs: Object.keys(specs).length ? specs : undefined, craft: Object.keys(craft).length ? craft : undefined });
      }
      localStorage.setItem("abuhub_myproducts", JSON.stringify(all));
      toast("Live on the storefront ✓ (demo auto-approves; admin review when API is live)");
    }
    resetUpload(); await refreshCatalog(); renderSellerHub(); refreshDynamic(); sellerTab("products");
  } catch (ex) { err(ex.message || "Could not save — try again."); }
  btn.textContent = "Save product →"; btn.disabled = false;
}
function editProduct(id) {
  const p = ALL_PRODUCTS.find(x => x.id === id); if (!p) return;
  if (p._cloud && p.status !== "approved") toast("Pending review — editing sends it back to the queue.", "warn");
  _editingId = id; _upImg = p.img;
  $("#upName").value = p.name; $("#upPrice").value = p.price; $("#upStock").value = p.stock ?? 10;
  $("#upCat").value = p.category; $("#upDesc").value = p.desc;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  set("upChip", p.specs?.chip); set("upRam", p.specs?.ram); set("upStorage", p.specs?.storage);
  set("upScreen", p.specs?.screen); set("upBattery", p.specs?.battery); set("upCond", p.specs?.condition);
  set("upMaterials", p.craft?.materials); set("upDims", p.craft?.dimensions); set("upCare", p.craft?.care);
  upCatChange();
  showUpPreview(p.img); $("#upTitle").textContent = "Edit product";
  sellerTab("add"); window.scrollTo({ top: 0, behavior: "smooth" });
}
async function delProduct(id) {
  const p = ALL_PRODUCTS.find(x => x.id === id); if (!p) return;
  if (!confirm(`Delete “${p.name}” permanently?`)) return;
  if (API_BASE && API_TOKEN && p._cloud) {
    try { await api("/api/products/" + id, { method: "DELETE" }); }
    catch (ex) { toast(ex.message, "warn"); return; }
  } else {
    localStorage.setItem("abuhub_myproducts", JSON.stringify(JSON.parse(localStorage.getItem("abuhub_myproducts") || "[]").filter(x => x.id !== id)));
  }
  await refreshCatalog(); renderSellerHub(); refreshDynamic();
  toast("Product deleted.");
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
function syncFilterUI(){ buildFilterUI(); $("#shopSearch").value = filters.q; $("#priceRange").value = filters.max; $("#priceVal").textContent = money(filters.max); $("#sortSel").value = filters.sort; const ds = $("#dsCheck"); if (ds) ds.checked = !!filters.dropship;
  const techCtx = filters.cats.some(c => (typeof TECH_CATS !== "undefined" ? TECH_CATS : []).includes(c));
  const tf = $("#techFilters"); if (tf) tf.classList.toggle("hidden", !techCtx);
  const r1 = document.getElementById("fRam"); if (r1) r1.value = String(filters.tech.ram || "");
  const r2 = document.getElementById("fStorage"); if (r2) r2.value = String(filters.tech.storage || "");
  const r3 = document.getElementById("fCond"); if (r3) r3.value = filters.tech.cond || "";
}
function gbNum(s) { const m = String(s || "").match(/([\d.]+)\s*(TB|GB)/i); if (!m) return 0; return parseFloat(m[1]) * (m[2].toUpperCase() === "TB" ? 1000 : 1); }
function setTech(k, v) {
  filters.tech[k] = k === "cond" ? v : Number(v) || 0;
  renderShop();
  const active = filters.tech.ram || filters.tech.storage || filters.tech.cond;
  toast(active ? `⚡ Tech filter: ${filters.tech.cond || ""} ${filters.tech.ram ? filters.tech.ram + "GB+ RAM" : ""} ${filters.tech.storage ? filters.tech.storage + "GB+ storage" : ""}`.trim() : "Hardware filters cleared");
}
function toggleCat(c){ filters.cats.includes(c) ? filters.cats = filters.cats.filter(x => x !== c) : filters.cats.push(c); syncFilterUI(); renderShop(); }
function toggleVendorF(id){ filters.vendors.includes(id) ? filters.vendors = filters.vendors.filter(x => x !== id) : filters.vendors.push(id); syncFilterUI(); renderShop(); }
function setFilter(k, v){ if (k === "max") $("#priceVal").textContent = money(Number(v)); filters[k] = (k === "max" || k === "minRating") ? Number(v) : v; syncFilterUI(); renderShop(); }
function clearFilters(){ filters = { q: "", cats: [], max: 600, minRating: 0, vendors: [], dropship: false, tech: { ram: 0, storage: 0, cond: "" }, sort: "featured" }; $("#headerSearch").value = ""; syncFilterUI(); renderShop(); }
function toggleFilters(){ $("#filterPanel").classList.toggle("hidden"); }
function toggleDropship(){ filters.dropship = !filters.dropship; syncFilterUI(); renderShop(); toast(filters.dropship ? "Showing ships-from-maker goods only 📦" : "Showing all goods"); }
function onHeaderSearch(v){ filters.q = v; if (!$("#view-shop").classList.contains("hidden")) { $("#shopSearch").value = v; renderShop(); } else if (v.length > 1) { go("shop"); $("#shopSearch").value = v; syncFilterUI(); renderShop(); } }

function filteredProducts() {
  let list = [...ALL_PRODUCTS];
  if (filters.q) { const q = filters.q.toLowerCase(); list = list.filter(p => (p.name + p.category + vendorById(p.vendorId).name).toLowerCase().includes(q)); }
  if (filters.cats.length) list = list.filter(p => filters.cats.includes(p.category));
  list = list.filter(p => p.price <= filters.max && p.rating >= filters.minRating);
  if (filters.vendors.length) list = list.filter(p => filters.vendors.includes(p.vendorId));
  if (filters.dropship) list = list.filter(p => (vendorById(p.vendorId) || {}).dropship);
  if (filters.tech.ram) list = list.filter(p => gbNum(p.specs?.ram) >= filters.tech.ram);
  if (filters.tech.storage) list = list.filter(p => gbNum(p.specs?.storage) >= filters.tech.storage);
  if (filters.tech.cond) list = list.filter(p => (p.specs?.condition || "") === filters.tech.cond);
  if (filters.sort === "low") list.sort((a, b) => a.price - b.price);
  if (filters.sort === "high") list.sort((a, b) => b.price - a.price);
  if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (filters.sort === "featured") { const pinned = pinPromoted(list); list.length = 0; list.push(...pinned); }
  return list;
}
function renderShop() {
  buildFilterUI();
  const list = filteredProducts();
  $("#shopCount").textContent = `· ${list.length} goods`;
  $("#activeCats").innerHTML = filters.cats.map(c => `<span class="chipf">${c} <button onclick="toggleCat('${c}')">✕</button></span>`).join("") + (filters.dropship ? `<span class="chipf">📦 Ships from maker <button onclick="toggleDropship()">✕</button></span>` : "") + ((filters.tech.ram || filters.tech.storage || filters.tech.cond) ? `<span class="chipf">⚡ ${[filters.tech.cond, filters.tech.ram ? filters.tech.ram + "GB RAM" : "", filters.tech.storage ? filters.tech.storage + "GB" : ""].filter(Boolean).join(" · ")} <button onclick="filters.tech={ram:0,storage:0,cond:''};syncFilterUI();renderShop()">✕</button></span>` : "") + (filters.q ? `<span class="chipf">“${filters.q}” <button onclick="setFilter('q','');document.querySelector('#headerSearch').value=''">✕</button></span>` : "");
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
  const prods = ALL_PRODUCTS.filter(p => p.vendorId === id);
  const isF = followed.includes(id);
  $("#vendorHero").innerHTML = `
    <div class="rounded-[28px] overflow-hidden border border-line bg-white">
      <div class="h-48 sm:h-64 bg-cover bg-center" style="background-image:url('${v.cover}')"></div>
      <div class="p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center">
        <img src="${v.avatar}" class="w-20 h-20 rounded-3xl object-cover -mt-14 border-4 border-white shadow" alt="" />
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2"><h2 class="font-display text-3xl">${v.name}</h2>${v.verified ? `<span class="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">✓ VERIFIED SELLER</span>` : ""}${v.tier ? `<span class="text-[11px] font-bold bg-[#C8A15A]/15 text-[#8a6d2f] border border-[#C8A15A]/50 rounded-full px-2.5 py-1">◆ ${String(v.tier).toUpperCase()} PRO</span>` : ""}${v.dropship ? `<span class="text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-2.5 py-1">📦 DROPSHIP PARTNER</span>` : ""}</div>
          <p class="text-muted text-sm mt-1">${v.tagline} · ${v.location} · On Abu.Hub since ${v.joined}</p>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed">${v.story}</p>
          <p class="text-sm mt-3"><span class="text-[#C8A15A] font-semibold">★ ${v.rating}</span> <span class="text-muted">${v.reviews} reviews · ${v.sales} sales · ${prods.length} goods live</span></p>
        </div>
        <div class="flex sm:flex-col gap-2 shrink-0">
          <button onclick="toggleFollow('${v.id}');openVendor('${v.id}')" class="btn-ink !py-3 text-sm whitespace-nowrap">${isF ? "✓ Following" : "+ Follow shop"}</button>
          <button onclick="openPromote(null,'${v.id}')" class="btn-line text-sm whitespace-nowrap">📣 Promote</button>
          <button onclick="vendorChat('${v.id}')" class="btn-line text-sm whitespace-nowrap">💬 Message</button>
        </div>
      </div>
    </div>`;
  $("#vendorProducts").innerHTML = prods.map(productCard).join("") || `<p class="text-muted">No goods yet.</p>`;
  go("vendor");
  $("#view-vendor").classList.remove("hidden"); $("#view-vendors").classList.add("hidden"); $("#view-home").classList.add("hidden"); $("#view-shop").classList.add("hidden"); $("#view-about").classList.add("hidden");
}

/* ----- Adaptive product layout: spec grid (tech) vs story (artisan) ----- */
const SPEC_LABELS = { chip: "Processor", ram: "RAM", storage: "Storage", screen: "Display", battery: "Battery", condition: "Condition" };
function specGridHTML(p) {
  const rows = Object.keys(SPEC_LABELS).filter(k => p.specs[k]).map(k =>
    `<div class="flex justify-between gap-4 py-2.5 border-b border-line last:border-0 text-sm"><span class="text-muted">${SPEC_LABELS[k]}</span><strong class="text-right">${p.specs[k]}</strong></div>`).join("");
  return `
    <p class="text-[15px] text-muted leading-relaxed mt-4">${p.desc}</p>
    <div class="mt-4 rounded-2xl border border-line bg-white overflow-hidden">
      <p class="f-label !mb-0 px-4 pt-3">⚡ Specifications</p>
      <div class="px-4 pb-2">${rows}</div>
    </div>
    ${p.specs.condition && p.specs.condition !== "New" ? `<p class="text-[12px] mt-2 text-[#0AA5C2] font-semibold">✓ Certified ${p.specs.condition.toLowerCase()} — tested, warranty included.</p>` : ""}`;
}
function storyHTML(p, v) {
  const c = p.craft || {};
  const rows = [["Materials", c.materials], ["Dimensions", c.dimensions], ["Care", c.care]].filter(([, val]) => val).map(([k, val]) =>
    `<div class="flex gap-2.5 text-sm py-1.5"><span class="text-muted shrink-0 w-24">${k}</span><span>${val}</span></div>`).join("");
  return `
    <p class="text-[15px] text-muted leading-relaxed mt-4">${p.desc}</p>
    ${rows ? `<div class="mt-4 rounded-2xl border border-line bg-[#FAF6F0] p-4"><p class="f-label !mb-1">❋ From the maker’s bench</p>${rows}</div>` : ""}
    <p class="text-[13px] text-muted mt-3 italic">Handmade by ${v.name} · ${v.location} — ${v.story ? v.story.split(".")[0] + "." : ""}</p>`;
}

/* ---------- Product modal ---------- */
let modalQty = 1, modalVariant = null;
function openProduct(id){
  const p = productById(id); if (!p) return;
  pushRecent(id);
  const v = vendorById(p.vendorId) || virtualVendor(p.vendorId, "Independent maker");
  modalQty = 1; modalVariant = p.colors[0];
  const wished = wishlist.includes(p.id);
  const related = ALL_PRODUCTS.filter(x => x.id !== p.id && (x.category === p.category || x.vendorId === p.vendorId)).slice(0, 4);
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
        <div class="flex items-baseline gap-3 mt-4"><strong class="font-display text-3xl">${money(p.price)}</strong>${p.oldPrice ? `<s class="text-muted">${money(p.oldPrice)}</s><span class="text-xs font-bold bg-[#BC5A28] text-white rounded-full px-2 py-1">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}${p.specs?.condition ? `<span class="text-xs font-bold ${p.specs.condition === "New" ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"} rounded-full px-2.5 py-1">${p.specs.condition}</span>` : ""}</div>
        ${p.specs ? specGridHTML(p) : storyHTML(p, v)}
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
        <button onclick="openPromote('${p.id}')" class="w-full mt-2 text-[13px] font-semibold text-muted hover:text-ink underline underline-offset-4">📣 Vendor? Promote this product from $9/wk</button>
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
function cartSubtotal(){ return cart.reduce((s, l) => { const p = productById(l.id); return p ? s + p.price * l.qty : s; }, 0); }

function renderCartItems(){
  const pruned = cart.filter(l => productById(l.id));
  if (pruned.length !== cart.length) { cart = pruned; save(); }
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
  const mc = $("#mCartN"), mw = $("#mWishN");
  if (mc) { mc.textContent = n; mc.classList.toggle("hidden", !n); mc.classList.toggle("flex", !!n); }
  if (mw) { mw.textContent = wishlist.length; mw.classList.toggle("hidden", !wishlist.length); mw.classList.toggle("flex", !!wishlist.length); }
}

/* ---------- Drawers & modals ---------- */
function showOverlay(){ const o = $("#overlay"); o.classList.remove("hidden"); requestAnimationFrame(() => o.style.opacity = "1"); }
function hideOverlay(){ const o = $("#overlay"); o.style.opacity = "0"; setTimeout(() => o.classList.add("hidden"), 250); }
function openCart(){ closeDrawers(true); renderCartItems(); $("#cartDrawer").classList.add("open"); showOverlay(); }
function openWishlist(){ closeDrawers(true); renderWishItems(); $("#wishDrawer").classList.add("open"); showOverlay(); }
function closeDrawers(silent){ $$(".drawer").forEach(d => d.classList.remove("open")); if (!silent) hideOverlay(); }
function showModal(id){ closeModals(true); $("#" + id).classList.remove("hidden"); showOverlay(); document.body.style.overflow = "hidden"; }
function closeModals(silent){ ["productModal", "checkoutModal", "authModal", "sellerModal", "rfqModal", "trackModal", "protectModal", "promoteModal"].forEach(m => $("#" + m).classList.add("hidden")); if (!silent) { hideOverlay(); document.body.style.overflow = ""; } }
function closeAll(silent){ closeDrawers(true); closeModals(true); if (!silent) { hideOverlay(); document.body.style.overflow = ""; } }
function openAuth(){ showModal("authModal"); renderAuth(); }
/* ----- Seller-invite landing ----- */
function myInviteCode() {
  let c = localStorage.getItem("abuhub_invitecode");
  if (!c) { c = "ABU-" + Math.random().toString(36).slice(2, 6).toUpperCase(); localStorage.setItem("abuhub_invitecode", c); }
  return c;
}
function inviteURL() { return location.origin + location.pathname + "?sellref=" + myInviteCode(); }
function renderSell() {
  const code = myInviteCode();
  $("#inviteCode").textContent = code;
  $("#inviteLink").value = inviteURL();
  const n = JSON.parse(localStorage.getItem("abuhub_sellers") || "[]").filter(s => (s.ref || "").toUpperCase() === code).length;
  $("#inviteCount").textContent = n;
  sellCalc($("#calcRange")?.value || 1200);
}
function copyInvite() {
  navigator.clipboard?.writeText(inviteURL());
  toast(`Invite link copied — ${myInviteCode()} ✦ 0% commission per joined seller for 30 days.`);
}
function sellCalc(v) {
  v = Number(v) || 0;
  $("#calcSalesLbl").textContent = money(v);
  $("#calcKeep").textContent = money(v * 0.92);
  $("#calcOther").textContent = money(v * 0.70);
  $("#calcWin").textContent = `+ ${money(v * 0.22)} more in your pocket every month ✦`;
}
function captureSellRef() {
  try {
    const q = new URLSearchParams(location.search).get("sellref");
    if (q) localStorage.setItem("abuhub_sellref", q.trim().toUpperCase());
  } catch {}
}
function openSeller(){
  showModal("sellerModal");
  const ref = localStorage.getItem("abuhub_sellref") || "";
  const inp = $("#sRef"), hint = $("#sRefHint");
  if (inp && !inp.value && ref) inp.value = ref;
  if (hint) { hint.classList.toggle("hidden", !ref); if (ref) hint.textContent = `✓ Referred by ${ref} — fast-track review unlocked.`; }
}
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
      <button onclick="closeAll();go('seller')" class="btn-ink w-full mt-3">🏪 Open seller hub →</button>
      <button onclick="logout()" class="btn-line w-full mt-2">Sign out</button>`;
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
    updateAccountUI(); closeAll(); refreshCatalog().then(() => refreshDynamic()); toast(`Karibu, ${_authUser.name.split(" ")[0]} ✓`);
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
function setAuthMode(m) {
  const body = $("#authBody");
  if (!body || _authMode === m || $("#authModal").classList.contains("hidden")) { _authMode = m; renderAuth(); return; }
  _authMode = m;
  body.classList.add("flipping");
  setTimeout(() => { renderAuth(); requestAnimationFrame(() => requestAnimationFrame(() => { const b = $("#authBody"); if (b) b.classList.remove("flipping"); })); }, 200);
}
async function logout(){
  _authUser = null; localStorage.setItem("abuhub_user", JSON.stringify(null));
  API_TOKEN = ""; localStorage.removeItem("abuhub_token");
  updateAccountUI(); renderAuth(); refreshCatalog().then(() => refreshDynamic()); toast("Signed out.");
}
function submitSeller(e){
  e.preventDefault();
  const payload = { shop: $("#sName").value, owner: $("#sOwner").value, email: $("#sEmail").value, category: $("#sCat").value, story: $("#sStory").value, dropship: $("#sDropship")?.checked || false, ref: ($("#sRef")?.value || localStorage.getItem("abuhub_sellref") || "").trim().toUpperCase() };
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
          <div class="space-y-2.5 max-h-48 overflow-auto">${cart.filter(l => productById(l.id)).map(l => { const p = productById(l.id); return `<div class="flex gap-2 items-center"><img src="${p.img}" class="w-10 h-12 rounded-lg object-cover" /><div class="min-w-0"><p class="text-xs font-semibold line-clamp-1">${p.name}</p><p class="text-xs text-muted">×${l.qty} · ${l.variant}</p></div><strong class="ml-auto text-xs">${money(p.price * l.qty)}</strong></div>`; }).join("")}</div>
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
  const lineItems = cart.filter(l => productById(l.id)).map(l => ({ id: l.id, qty: l.qty, variant: l.variant }));
  // Mirror to cloud API when signed in + configured (never blocks checkout)
  if (API_BASE && API_TOKEN) {
    api("/api/orders", { method: "POST", headers: { "Idempotency-Key": ref }, body: JSON.stringify({ items: lineItems, total, method, ref, contact: checkoutData }) }).catch(() => null);
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
refreshCatalog().then(() => {
  renderHome(); syncFilterUI(); renderShop(); renderVendors(); renderCartItems(); renderWishItems(); updateBadges(); updateAccountUI(); updateShipTexts();
});
$$("#curSel, select[onchange^='setCurrency']").forEach(s => s.value = currency);
buildCurrSelectors();
$$("#langSel, select[onchange^='setLang']").forEach(s => s.value = lang);
document.documentElement.lang = lang;
setTheme(theme); captureSellRef();
observeLang(); if (lang !== "en") setTimeout(applyLang, 300);
refreshRates(); fetchPromos().then(() => refreshDynamic()); fetchTiers().then(() => refreshCatalog()).then(() => refreshDynamic());
$("#waFloat").href = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent("Hi Abu.Hub! I need help with my order.")}`;
window.addEventListener("load", () => setTimeout(initAuth, 400));
initAuth();
