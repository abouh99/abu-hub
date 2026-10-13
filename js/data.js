/* Abu.Hub — marketplace seed data */
const VENDORS = [
  {
    id: "v-adaeze",
    name: "Adaeze Atelier",
    tagline: "Modern heritage tailoring",
    location: "Lagos, Nigeria",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80&auto=format&fit=crop",
    rating: 4.9, reviews: 2314, products: 48, sales: "12k",
    verified: true, joined: "2021",
    story: "Adaeze blends West-African wax prints with contemporary silhouettes. Every piece is cut and finished by hand in her Lagos studio."
  },
  {
    id: "v-kiln",
    name: "Kiln & Co.",
    tagline: "Small-batch stoneware",
    location: "Marrakech, Morocco",
    avatar: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1200&q=80&auto=format&fit=crop",
    rating: 4.8, reviews: 1892, products: 36, sales: "9k",
    verified: true, joined: "2020",
    story: "Wheel-thrown stoneware fired in small kilns. Earthy glazes, organic forms, made to be used every day."
  },
  {
    id: "v-nordform",
    name: "Nordform Studio",
    tagline: "Sculptural home objects",
    location: "Copenhagen, Denmark",
    avatar: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80&auto=format&fit=crop",
    rating: 4.9, reviews: 3102, products: 62, sales: "18k",
    verified: true, joined: "2019",
    story: "Minimalist furniture and lighting with a soft Scandinavian warmth. Designed to last decades, not seasons."
  },
  {
    id: "v-botanica",
    name: "Botanica Lab",
    tagline: "Botanical skincare",
    location: "Banjul, Gambia",
    avatar: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80&auto=format&fit=crop",
    rating: 4.7, reviews: 1204, products: 28, sales: "7k",
    verified: true, joined: "2022",
    story: "Cold-pressed baobab, moringa and shea. Vegan, cruelty-free, and poured in micro-batches."
  },
  {
    id: "v-aurelia",
    name: "Aurelia Fine",
    tagline: "Hand-finished jewelry",
    location: "Bali, Indonesia",
    avatar: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80&auto=format&fit=crop",
    rating: 5.0, reviews: 987, products: 54, sales: "6k",
    verified: true, joined: "2021",
    story: "Recycled 14k gold vermeil and baroque pearls. Tarnish-resistant, water-safe, made for everyday heirlooms."
  },
  {
    id: "v-loom",
    name: "Loom & Thread",
    tagline: "Handwoven textiles",
    location: "Oaxaca, Mexico",
    avatar: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=1200&q=80&auto=format&fit=crop",
    rating: 4.8, reviews: 1430, products: 41, sales: "8k",
    verified: true, joined: "2020",
    story: "Third-generation weavers using pedal looms and natural dyes — cochineal, indigo, marigold."
  },
  {
    id: "v-terra",
    name: "Terra Roast",
    tagline: "Single-origin coffee",
    location: "Addis Ababa, Ethiopia",
    avatar: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=80&auto=format&fit=crop",
    rating: 4.9, reviews: 2760, products: 18, sales: "21k",
    verified: true, joined: "2019",
    story: "Direct-trade Yirgacheffe and Sidamo lots, roasted weekly in 12kg batches for peak aroma."
  },
  {
    id: "v-paper",
    name: "Paper Atelier K.",
    tagline: "Stationery & prints",
    location: "Kyoto, Japan",
    avatar: "https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?w=200&q=80&auto=format&fit=crop",
    cover: "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=1200&q=80&auto=format&fit=crop",
    rating: 4.8, reviews: 764, products: 33, sales: "5k",
    verified: true, joined: "2023",
    story: "Washi paper goods, risograph prints and brass desk tools. Slow stationery for thoughtful work."
  }
];

const PRODUCTS = [
  { id: "p1", vendorId: "v-adaeze", name: "Adire Wrap Midi Dress", category: "Fashion", price: 128, oldPrice: 164, rating: 4.9, reviews: 412, img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80&auto=format&fit=crop", badge: "Bestseller", colors: ["Indigo", "Sand", "Clay"], desc: "Hand-dyed adire cotton, smocked back, side slits. Each pattern is one-of-one." },
  { id: "p2", vendorId: "v-kiln", name: "Terra Speckled Serving Bowl", category: "Home & Living", price: 58, oldPrice: null, rating: 4.8, reviews: 203, img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80&auto=format&fit=crop", badge: "Small batch", colors: ["Oat", "Terracotta"], desc: "Wheel-thrown stoneware, matte speckled glaze. Dishwasher, microwave & oven safe." },
  { id: "p3", vendorId: "v-nordform", name: "Aria Bouclé Accent Chair", category: "Home & Living", price: 549, oldPrice: 699, rating: 4.9, reviews: 187, img: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80&auto=format&fit=crop", badge: "-21%", colors: ["Cream", "Charcoal"], desc: "Solid oak legs, high-resilience foam, premium bouclé. Assembly in 8 minutes." },
  { id: "p4", vendorId: "v-botanica", name: "Baobab Renewal Face Oil", category: "Beauty", price: 42, oldPrice: null, rating: 4.7, reviews: 531, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format&fit=crop", badge: "Vegan", colors: ["30ml"], desc: "Cold-pressed baobab + squalane + frankincense. Glass bottle, 2-3 drops nightly." },
  { id: "p5", vendorId: "v-aurelia", name: "Baroque Pearl Hoops — Gold", category: "Jewelry", price: 86, oldPrice: 110, rating: 5.0, reviews: 298, img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&auto=format&fit=crop", badge: "Back in stock", colors: ["Gold", "Silver"], desc: "Recycled 14k gold vermeil, freshwater baroque pearls. Water & sweat safe." },
  { id: "p6", vendorId: "v-loom", name: "Zapotec Wool Throw", category: "Home & Living", price: 145, oldPrice: null, rating: 4.8, reviews: 164, img: "https://images.unsplash.com/photo-1580301762395-83604735c6c0?w=800&q=80&auto=format&fit=crop", badge: "Handwoven", colors: ["Terracotta", "Natural"], desc: "100% highland wool, natural dyes, 200x130cm. Woven on a wooden pedal loom." },
  { id: "p7", vendorId: "v-terra", name: "Yirgacheffe Whole Bean — 1kg", category: "Grocery", price: 34, oldPrice: null, rating: 4.9, reviews: 891, img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80&auto=format&fit=crop", badge: "Roasted weekly", colors: ["Whole bean", "Ground"], desc: "Washed Yirgacheffe, notes of jasmine, bergamot & apricot. Roast date on bag." },
  { id: "p8", vendorId: "v-paper", name: "Washi Desk Set — 12pc", category: "Art & Craft", price: 49, oldPrice: 65, rating: 4.8, reviews: 132, img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Sakura", "Indigo"], desc: "Masking tapes, letterpress cards, brass clips and a dot-grid notebook." },
  { id: "p9", vendorId: "v-adaeze", name: "Kente Boxy Linen Shirt", category: "Fashion", price: 89, oldPrice: null, rating: 4.8, reviews: 220, img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80&auto=format&fit=crop", badge: "New", colors: ["White", "Olive"], desc: "European flax linen, relaxed boxy cut, corozo buttons. Garment-washed." },
  { id: "p10", vendorId: "v-nordform", name: "Halo Travertine Table Lamp", category: "Home & Living", price: 189, oldPrice: 240, rating: 4.9, reviews: 145, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Travertine"], desc: "Honed travertine base, linen shade, warm 2700K bulb included. Dimmable." },
  { id: "p11", vendorId: "v-botanica", name: "Shea + Moringa Body Butter", category: "Beauty", price: 28, oldPrice: 36, rating: 4.7, reviews: 402, img: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Unscented", "Citrus"], desc: "Whipped Grade-A shea, moringa oil, vitamin E. 48h moisture, zero grease." },
  { id: "p12", vendorId: "v-aurelia", name: "Layered Rope Necklace Set", category: "Jewelry", price: 74, oldPrice: null, rating: 4.9, reviews: 187, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&auto=format&fit=crop", badge: "Handmade", colors: ["Gold"], desc: "Set of 3: rope chain, paperclip, pearl pendant. 40-55cm adjustable." },
  { id: "p13", vendorId: "v-kiln", name: "Duo Espresso Cups — Set of 2", category: "Home & Living", price: 44, oldPrice: null, rating: 4.8, reviews: 312, img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Sand", "Black"], desc: "90ml double-walled stoneware, keeps crema longer. Gift box included." },
  { id: "p14", vendorId: "v-loom", name: "Indigo Lumbar Cushion 50×30", category: "Home & Living", price: 62, oldPrice: null, rating: 4.8, reviews: 98, img: "https://images.unsplash.com/photo-1584100936595-c065efb659a9?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Indigo", "Ecru"], desc: "Handwoven cotton cover + feather insert. Hidden zip, natural indigo dye." },
  { id: "p15", vendorId: "v-terra", name: "Cold Brew Discovery Box", category: "Grocery", price: 39, oldPrice: 48, rating: 4.9, reviews: 654, img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80&auto=format&fit=crop", badge: "Bestseller", colors: ["6 pack"], desc: "6 single-origin steeped pouches + tasting notes. Brews in 12 hours." },
  { id: "p16", vendorId: "v-paper", name: "Risograph Art Print — Tide", category: "Art & Craft", price: 32, oldPrice: null, rating: 4.9, reviews: 76, img: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80&auto=format&fit=crop", badge: "Limited ×200", colors: ["A3", "A4"], desc: "3-colour riso on 200gsm Munken. Numbered & signed, ships flat." },
  { id: "p17", vendorId: "v-adaeze", name: "Pleated Satin Maxi Skirt", category: "Fashion", price: 98, oldPrice: null, rating: 4.7, reviews: 143, img: "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Champagne", "Espresso"], desc: "Sun-pleated recycled satin, elastic back waist, floor-sweeping drape." },
  { id: "p18", vendorId: "v-nordform", name: "Oak Floating Shelf — 120cm", category: "Home & Living", price: 129, oldPrice: null, rating: 4.8, reviews: 210, img: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Oak", "Walnut"], desc: "Solid white oak, hidden steel bracket holds 25kg. Oil finish." },
  { id: "p19", vendorId: "v-botanica", name: "Moringa Clay Mask", category: "Beauty", price: 26, oldPrice: null, rating: 4.6, reviews: 289, img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["100g"], desc: "Kaolin + moringa + turmeric. 10-minute glow, for all skin types." },
  { id: "p20", vendorId: "v-aurelia", name: "Signet Dome Ring", category: "Jewelry", price: 64, oldPrice: null, rating: 4.9, reviews: 165, img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop", badge: "New", colors: ["6", "7", "8"], desc: "Bold polished dome, recycled sterling with 14k gold plate. Waterproof." },
  { id: "p21", vendorId: "v-kiln", name: "Rustic Pasta Bowls — Set of 4", category: "Home & Living", price: 112, oldPrice: 140, rating: 4.8, reviews: 176, img: "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Oat"], desc: "Generous 800ml coupe shape, reactive glaze — no two alike." },
  { id: "p22", vendorId: "v-loom", name: "Market Tote — Palm & Leather", category: "Fashion", price: 78, oldPrice: null, rating: 4.8, reviews: 231, img: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Natural"], desc: "Handwoven palm, vegetable-tanned handles, interior pocket. Fits 13\" laptop." },
  { id: "p23", vendorId: "v-terra", name: "Espresso Blend — Dark Roast", category: "Grocery", price: 29, oldPrice: null, rating: 4.8, reviews: 502, img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Beans", "Espresso grind"], desc: "Chocolate, molasses, orange zest. Built for milk drinks & moka pot." },
  { id: "p24", vendorId: "v-paper", name: "Brass Ruler + Cutter Set", category: "Art & Craft", price: 38, oldPrice: null, rating: 4.7, reviews: 89, img: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80&auto=format&fit=crop", badge: null, colors: ["Brass"], desc: "Solid brass ruler, Japanese steel cutter, cutting mat. Lifetime tools." }
];

const CATEGORIES = [
  { name: "Fashion", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop", count: 1240 },
  { name: "Home & Living", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80&auto=format&fit=crop", count: 986 },
  { name: "Beauty", img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&auto=format&fit=crop", count: 642 },
  { name: "Jewelry", img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80&auto=format&fit=crop", count: 518 },
  { name: "Art & Craft", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80&auto=format&fit=crop", count: 734 },
  { name: "Grocery", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop", count: 389 }
];

const COLLECTIONS = [
  { title: "The Autumn Edit", sub: "Warm knits, clay tones & candlelight", img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80&auto=format&fit=crop" },
  { title: "Handmade Table", sub: "Stoneware, linen & oak for gathering", img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80&auto=format&fit=crop" },
  { title: "Glow Rituals", sub: "Botanical skincare that works", img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=80&auto=format&fit=crop" }
];

/* Frequently searched shortcuts (Alibaba-style) */
const HOT_SEARCHES = [
  { term: "pearl", label: "Pearls", img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80&auto=format&fit=crop" },
  { term: "lamp", label: "Lamps", img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80&auto=format&fit=crop" },
  { term: "dress", label: "Dresses", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80&auto=format&fit=crop" },
  { term: "coffee", label: "Coffee", img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80&auto=format&fit=crop" },
  { term: "throw", label: "Throws", img: "https://images.unsplash.com/photo-1580301762395-83604735c6c0?w=400&q=80&auto=format&fit=crop" },
  { term: "bowl", label: "Stoneware", img: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400&q=80&auto=format&fit=crop" },
  { term: "ring", label: "Rings", img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80&auto=format&fit=crop" },
  { term: "print", label: "Art prints", img: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80&auto=format&fit=crop" }
];

/* Origin pavilions: derived from vendor locations */
const ORIGIN_FLAGS = {
  "Nigeria": "🇳🇬", "Morocco": "🇲🇦", "Denmark": "🇩🇰", "Gambia": "🇬🇲",
  "Indonesia": "🇮🇩", "Mexico": "🇲🇽", "Ethiopia": "🇪🇹", "Japan": "🇯🇵", "Tanzania": "🇹🇿"
};
