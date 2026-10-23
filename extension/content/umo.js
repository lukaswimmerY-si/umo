/* UMO – Unified Modes. Content script. Studio Y-si prototype. */
(() => {
  if (window.top !== window || window.__umoLoaded) return;
  window.__umoLoaded = true;

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const pad2 = n => String(n).padStart(2, "0");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const DOT = "\u2024";
  const MONTHS = "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jahrhundert|Jahrhunderts|Platz|Stelle|Mal|Bundestag|Deutschen|Wahlperiode|Lebensjahr";
  function protectDots(t) {
    return String(t).replace(/\s+/g, " ")
      .replace(new RegExp("(\\d)\\.(?=\\s+(?:" + MONTHS + "|[a-zäöüß]))", "g"), "$1" + DOT)
      .replace(/\b(z|d|u|o|v|s)\.\s?(B|h|a|ä|Ä|g|u|o)\./g, (m, a, b) => a + DOT + " " + b + DOT)
      .replace(/\b(bzw|ca|Nr|Dr|Prof|vgl|inkl|ggf|evtl|usw|etc|Abs|Art|Mio|Mrd|Tsd|Std|Min|St|Jh|Jhd|bspw|sog|ggü|zzgl|u\.a|z\.T)\.(?=\s)/g, "$1" + DOT)
      .replace(/(\d)\.(\d)/g, "$1" + DOT + "$2");
  }
  const sentences = t => (protectDots(t).match(/[^.!?]+[.!?]+["“”»«)]*(\s|$)|[^.!?]+$/g) || [t]).map(s => s.trim().replace(/\u2024/g, ".")).filter(Boolean);
  const send = msg => new Promise(res => {
    const stale = () => { try { toast("UMO wurde aktualisiert. Lade die Seite neu, um die neue Version zu nutzen."); } catch (e) {} res({ ok: false, code: "stale", error: "UMO wurde aktualisiert" }); };
    try { if (!chrome.runtime?.id) return stale(); chrome.runtime.sendMessage(msg, r => res(r || { ok: false, code: "error", error: chrome.runtime.lastError?.message || "keine Antwort" })); }
    catch (e) { /Extension context invalidated/i.test(String(e)) ? stale() : res({ ok: false, code: "error", error: String(e) }); }
  });
  const ICON = {
    wave: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4c1 6 2 9 4 12-2 3-3 6-4 12-1-6-2-9-4-12 2-3 3-6 4-12z" fill="currentColor"/><path d="M8 11c.6 2.5 1.2 3.7 2.4 5-1.2 1.3-1.8 2.5-2.4 5-.6-2.5-1.2-3.7-2.4-5C6.8 14.7 7.4 13.5 8 11zM24 11c.6 2.5 1.2 3.7 2.4 5-1.2 1.3-1.8 2.5-2.4 5-.6-2.5-1.2-3.7-2.4-5 1.2-1.3 1.8-2.5 2.4-5z" fill="currentColor"/></svg>',
    text: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 9h14M16 9v15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 8l14 8-14 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="10" y="8" width="4" height="16" rx="1.5" fill="currentColor"/><rect x="18" y="8" width="4" height="16" rx="1.5" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M20 9l-8 7 8 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 9l8 7-8 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="4" height="7" rx="1.5" fill="currentColor"/><rect x="17" y="14" width="4" height="7" rx="1.5" fill="currentColor"/></svg>',
    breath: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 20l7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };
  function waveSVG(progress, played, rest, head, seed) {
    const W = 300, H = 70, n = 60; let bars = "";
    for (let i = 0; i < n; i++) {
      const x = 6 + i * (W - 12) / n;
      const h = 8 + Math.abs(Math.sin(i * 0.37 + seed) * 26 + Math.sin(i * 0.11 + seed * 2) * 18);
      bars += `<rect x="${x.toFixed(1)}" y="${(H - 6 - h).toFixed(1)}" width="3.2" height="${h.toFixed(1)}" rx="1.6" fill="${i / n <= progress ? played : rest}"/>`;
    }
    const px = 6 + progress * (W - 12);
    return `<svg class="wave" viewBox="0 0 ${W} ${H + 8}" aria-hidden="true">${bars}<line x1="${px}" x2="${px}" y1="0" y2="${H}" stroke="${head}" stroke-width="2"/><circle cx="${px}" cy="${H + 1}" r="4.5" fill="${head}"/></svg>`;
  }

  /* ---------- state ---------- */
  const HOST = location.hostname.replace(/^www\./, "");
  const cfg = { apiKey: "", needs: "", hiddenSites: [], showLauncher: true, elevenKey: "", voiceEngine: "system", voiceName: "", voiceRate: 0.9 };
  const M = { noise: false, guide: false, summary: false, simplify: false, structure: false, snack: false, product: false, explainPage: false, charts: false, calmPage: false, sound: false };
  const ui = { view: null, chat: [], chatMode: "text", visible: true };
  const page = { type: "seite", isArticle: false, products: [], search: null, article: null, graphics: [] };
  const hasKey = () => !!cfg.apiKey;
  const readerModes = () => M.summary || M.simplify || M.structure || M.snack || M.product || M.explainPage;
  const level = () => !hasKey() ? "struktur" : M.structure ? "sehr" : "einfach";

  /* ---------- shadow UI ---------- */
  const hostEl = document.createElement("umo-root");
  hostEl.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:block;";
  const shadow = hostEl.attachShadow({ mode: "open" });
  const $ = s => shadow.querySelector(s);
  const $$ = s => [...shadow.querySelectorAll(s)];

  /* ---------- document-level styles (CSP-safe constructable sheets) ---------- */
  const docSheets = {};
  function setDocSheet(name, css) {
    try {
      if (!css) { if (docSheets[name]) { document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== docSheets[name]); delete docSheets[name]; } return; }
      if (!docSheets[name]) { docSheets[name] = new CSSStyleSheet(); document.adoptedStyleSheets = [...document.adoptedStyleSheets, docSheets[name]]; }
      docSheets[name].replaceSync(css);
    } catch (e) { /* very old engines */ }
  }
  const NOISE_CSS = `
    [id^="div-gpt-ad"],[id*="google_ads"],ins.adsbygoogle,iframe[src*="doubleclick"],iframe[src*="googlesyndication"],iframe[id*="google_ads"],
    [class*="adslot" i],[class*="ad-slot" i],[class*="ad-container" i],[class*="ad-wrapper" i],[class*="advert" i],[id*="advert" i],[class*="banner-ad" i],
    [data-ad],[data-ad-slot],[data-advertisement],[aria-label="Anzeige"],[aria-label="Werbung"],[aria-label="Advertisement"],
    [class*="taboola" i],[id*="taboola" i],[class*="outbrain" i],[id*="outbrain" i],[class*="newsletter-teaser" i],[class*="countdown" i],
    marquee{display:none!important}
    *,*::before,*::after{animation-play-state:paused!important;transition-duration:0s!important;scroll-behavior:auto!important}`;
  const AD_SEL = '[id^="div-gpt-ad"],[id*="google_ads"],ins.adsbygoogle,[class*="adslot" i],[class*="ad-slot" i],[class*="ad-container" i],[class*="ad-wrapper" i],[class*="advert" i],[id*="advert" i],[data-ad],[data-ad-slot],[data-advertisement],[aria-label="Anzeige"],[aria-label="Werbung"],[class*="taboola" i],[class*="outbrain" i]';
  const CALM_CSS = `body{filter:saturate(.35) contrast(.92)!important}`;
  const DIM_CSS = `[data-umo-dim]{opacity:.12!important;filter:grayscale(1)!important}[data-umo-pick]{outline:3px solid #FF541B!important;outline-offset:4px!important;border-radius:6px}`;

  function hideOverlays() {
    const vw = innerWidth, vh = innerHeight; let hidAny = false;
    for (const el of document.body.querySelectorAll("div,section,aside,dialog,iframe,form")) {
      if (el.closest("umo-root") || el.dataset.umoHidden) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) continue;
      const isHeader = r.top <= 1 && r.height < 140 || /header|nav/i.test(el.tagName + " " + (el.getAttribute("role") || ""));
      if (isHeader) continue;
      const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const promo = /newsletter|rabatt|gutschein|abo|app laden|download the app|sale|angebot|anmelden und/i.test(el.innerText || "");
      if (cs.position === "fixed" && (area > vw * vh * 0.25 || (promo && r.height < vh * 0.5))) {
        el.dataset.umoHidden = "1"; el.style.setProperty("display", "none", "important"); hidAny = true;
      }
    }
    if (hidAny) {
      for (const n of [document.documentElement, document.body]) { n.dataset.umoOverflow = n.style.overflow || ""; n.style.setProperty("overflow", "auto", "important"); }
    }
    document.querySelectorAll("video").forEach(v => { if (!v.paused && v.muted) { v.pause(); v.dataset.umoPaused = "1"; } });
  }
  function restoreOverlays() {
    document.querySelectorAll("[data-umo-hidden]").forEach(e => { e.style.removeProperty("display"); delete e.dataset.umoHidden; });
    for (const n of [document.documentElement, document.body]) if (n.dataset.umoOverflow !== undefined) { n.style.overflow = n.dataset.umoOverflow; delete n.dataset.umoOverflow; }
    document.querySelectorAll("video[data-umo-paused]").forEach(v => { delete v.dataset.umoPaused; v.play().catch(() => {}); });
  }

  /* ---------- page analysis ---------- */
  const PRICE = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})\s?€|€\s?\d/;
  const PRICE_G = /(\d{1,3}(?:\.\d{3})*|\d+)[,.](\d{2})\s?€|€\s?(\d{1,3}(?:\.\d{3})*|\d+)[,.](\d{2})/;
  function firstPrice(t) { const m = String(t).match(PRICE_G); if (!m) return NaN; const a = m[1] ?? m[3], c = m[2] ?? m[4]; return +(a.replace(/\./g, "") + "." + c); }
  function gridItem(el, all) {
    let cur = el;
    for (let i = 0; i < 6 && cur.parentElement && cur.parentElement !== document.body; i++) {
      const par = cur.parentElement;
      if (par.children.length >= 3) { let n = 0; for (const o of all) if (o !== el && par.contains(o)) { n++; if (n >= 2) return cur; } }
      cur = par;
    }
    return el;
  }
  function findProducts() {
    const seen = new Map(), cands = [];
    const consider = (card, a) => {
      if (!card || card.closest("umo-root,header,nav,footer,[aria-hidden='true'],[id*='cart' i],[class*='minicart' i],[data-testid*='cart' i]")) return;
      const img = card.querySelector("img,picture"); if (!img) return;
      const text = clean((card.innerText || "").replace(/\b[a-z]+_(outlined|filled)\b/g, " "));
      if (text.length < 6 || text.length > 700 || !PRICE.test(text)) return;
      const r = card.getBoundingClientRect(); if (r.width < 90 || r.height < 110) return;
      let href; try { href = new URL(a.getAttribute("href"), location.href).href; } catch (e) { return; }
      if (href.split("#")[0] === location.href.split("#")[0] || seen.has(href)) return;
      const im = card.querySelector("img");
      seen.set(href, 1); cands.push({ href, img: im ? (im.currentSrc || im.src) : "", text, el: card, price: firstPrice(text) });
    };
    for (const a of document.querySelectorAll("a[href]")) {
      if (!a.querySelector("img,picture")) continue;
      let card = a;
      for (let i = 0; i < 6 && card; i++) { if (PRICE.test(card.innerText || "")) break; card = card.parentElement; }
      consider(card, a);
    }
    if (cands.length < 4) for (const c of document.querySelectorAll("article,li,[data-testid*=product i],[class*=product i]")) { const a = c.querySelector("a[href]"); if (a) consider(c, a); }
    const els = cands.map(c => c.el);
    cands.forEach(c => c.item = gridItem(c.el, els));
    return cands.slice(0, 120);
  }
  function findSearch() {
    const sel = 'input[type="search"],input[name="q"],input[name*="search" i],input[name*="such" i],input[placeholder*="such" i],input[aria-label*="such" i],input[placeholder*="search" i],input[aria-label*="search" i]';
    return [...document.querySelectorAll(sel)].find(i => !i.closest("umo-root") && i.type !== "hidden") || null;
  }
  function jsonLdTypes() {
    const out = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(sc => {
      try { const walk = o => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach(walk); const t = o["@type"]; if (t) out.push(...[].concat(t).map(String)); if (o["@graph"]) walk(o["@graph"]); }; walk(JSON.parse(sc.textContent)); } catch (e) {}
    });
    return out.map(t => t.toLowerCase());
  }
  function looksLikeArticle() {
    try { if (typeof isProbablyReaderable === "function" && isProbablyReaderable(document, { minContentLength: 300, minScore: 20 })) return true; } catch (e) {}
    const root = document.querySelector("article, main, [role=main]") || document.body;
    const ps = [...root.querySelectorAll("p")].filter(p => clean(p.innerText).length > 80 && !p.closest("nav,footer,header,aside"));
    return ps.length >= 4 && ps.reduce((n, p) => n + p.innerText.length, 0) > 1200;
  }
  function looksLikeProduct() {
    const types = jsonLdTypes();
    if (/product/i.test(document.querySelector('meta[property="og:type"]')?.content || "")) return true;
    if ((types.includes("product") || types.includes("productgroup")) && !!document.querySelector("h1") && page.products.length < 80 && !/^(itemlist|collectionpage|searchresultspage)$/.test(types.join(" "))) {
      const h1 = clean(document.querySelector("h1").innerText).toLowerCase();
      if (!/\d[\d.]* (artikel|produkte|ergebnisse)/.test(clean(mainRoot().innerText).slice(0, 3000).toLowerCase()) || h1.length > 0 && page.products.length < 8) return true;
    }
    const buy = [...document.querySelectorAll("button, [role=button], input[type=submit]")].some(b => !b.closest("umo-root") && /in den warenkorb|zum warenkorb|in die tasche|add to (cart|bag|basket)|jetzt kaufen/i.test(b.innerText || b.value || b.getAttribute("aria-label") || ""));
    return buy && !!document.querySelector("h1") && PRICE.test(clean((document.querySelector("main") || document.body).innerText).slice(0, 5000)) && page.products.length < 12;
  }
  function analyse() {
    page.products = findProducts();
    page.search = findSearch();
    const types = jsonLdTypes();
    const articleLd = types.some(t => /^(newsarticle|article|reportagenewsarticle|blogposting|report|scholarlyarticle|governmentarticle)$/.test(t));
    if (looksLikeProduct()) page.type = "produkt";
    else if (page.products.length >= 4 || adapter() && !articleLd) page.type = "shop";
    else if (articleLd || looksLikeArticle()) page.type = "artikel";
    else page.type = "seite";
    page.isArticle = page.type === "artikel";
  }
  const TYPE_LABEL = { artikel: "Artikel", produkt: "Produktseite", shop: "Shop-Übersicht", seite: "Website" };
  const isShop = () => page.type === "shop" || (page.type === "seite" && !!page.search && !!adapter());

  /* ---------- Grafiken ---------- */
  const CH = new Map();            // gid -> Zustand der Grafik
  const chartRoots = new Set();    // Shadow-Roots, in denen Erklärboxen stehen
  let UMO_SHEET = null;
  // Grafik-Dienste, deren Daten UMO direkt lesen kann
  function isDwSrc(src) { try { const u = new URL(src); return /datawrapper|23degrees\.io/i.test(u.hostname) || /^\/[A-Za-z0-9]{5}\/\d+\/?$/.test(u.pathname); } catch (e) { return false; } }
  // Bekannte Grafik-Dienste und typische Wörter in Grafik-Adressen
  const VIZ_RE = /datawrapper|23degrees|flourish|infogram|everviz|highcharts|plotly|tableau|observablehq|q\.st\.nzz|chartbeat-no|pinpoint|arcgis|mapbox|chart|grafik|graphic|statista|diagram|karte|map|viz/i;
  // Eingebettete Inhalte, die keine Grafik sind
  const NOT_VIZ_RE = /youtube|youtu\.be|vimeo|twitter|x\.com|instagram|facebook|tiktok|spotify|soundcloud|podcast|audio|player|video|ads?[.\-/]|doubleclick|googlesyndication|recaptcha|consent|comment|disqus|newsletter|outbrain|taboola/i;
  function articleRoot() { return document.querySelector("article") || document.querySelector("main, [role=main]") || document.body; }
  let lazyDone = false;
  async function prepareLazy() {
    if (lazyDone) return; lazyDone = true;
    const pending = () => [...articleRoot().querySelectorAll("iframe, img")].filter(e => /^data:/.test(e.getAttribute("src") || "") && e.getBoundingClientRect().width > 200);
    if (!pending().length) return;
    const y0 = scrollY, H = document.documentElement.scrollHeight;
    for (let y = 0; y < H && pending().length; y += Math.max(300, innerHeight * 0.8)) { scrollTo({ top: y, behavior: "instant" }); await sleep(150); }
    scrollTo({ top: y0, behavior: "instant" }); await sleep(400);
  }
  // Nur Elemente, die eine Erklärung brauchen: Diagramme, Karten, Tabellen, Infografiken. Fotos nicht.
  const INFO_RE = /grafik|diagramm|chart|infografik|karte|statistik|tabelle|prozent|anteil|entwicklung|verteilung|vergleich|umfrage|ergebnis|zahlen|kurve|balken|wahlkreis|%/i;
  function isExplainable(st, el) {
    if (["dw", "iframe", "svg", "canvas", "table"].includes(st.kind)) return true;
    if (st.kind !== "img") return false;
    const fig = el.closest("figure");
    const txt = [el.getAttribute("alt"), el.getAttribute("title"), el.getAttribute("src"), fig && fig.querySelector("figcaption") && fig.querySelector("figcaption").innerText].filter(Boolean).join(" ");
    return INFO_RE.test(txt);
  }
  function markGraphics() {
    page.graphics = [];
    let n = Math.max(0, ...[...document.querySelectorAll("[data-umo-gid]")].map(e => +e.dataset.umoGid.slice(1) + 1));
    for (const el of document.querySelectorAll("img,svg,canvas,iframe,table")) {
      if (el.closest("umo-root,umo-inline") || el.closest("header,nav,footer")) continue;
      if (el.tagName === "svg" && el.parentElement && el.parentElement.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      if (el.tagName !== "TABLE" && (r.width < 260 || r.height < 140)) continue;
      const src = el.getAttribute("src") || "";
      if (el.tagName === "IFRAME") {
        const sig = (el.src || "") + " " + (el.title || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.name || "");
        const inArticle = articleRoot().contains(el);
        const known = VIZ_RE.test(sig) || isDwSrc(el.src) || (/^data:/.test(src) && inArticle);
        // Unbekannter Dienst: im Artikeltext, groß genug und kein Video/Social/Werbung -> wahrscheinlich eine Grafik
        const likely = inArticle && r.width >= 300 && r.height >= 200 && /^https?:/.test(el.src || "") && !NOT_VIZ_RE.test(sig) && new URL(el.src).hostname !== location.hostname;
        if (NOT_VIZ_RE.test(sig) && !isDwSrc(el.src) || !(known || likely)) continue;
      }
      if (el.tagName === "TABLE" && (el.rows?.length || 0) < 3) continue;
      if (!el.dataset.umoGid) el.dataset.umoGid = "g" + (n++);
      const gid = el.dataset.umoGid, kind = el.tagName === "IFRAME" && isDwSrc(el.src) ? "dw" : el.tagName.toLowerCase();
      const st = CH.get(gid) || { gid, exp: {}, qa: [], open: false };
      st.el = el; st.kind = kind; st.src = el.src || ""; st.explainable = isExplainable(st, el); CH.set(gid, st);
      page.graphics.push({ gid, kind, label: kind === "dw" || kind === "iframe" ? "Grafik" : kind === "table" ? "Tabelle" : kind === "img" ? "Bild" : "Grafik" });
    }
  }
  function getArticle() {
    if (page.article) return page.article;
    markGraphics();
    const clone = document.cloneNode(true);
    clone.querySelectorAll("umo-root,umo-inline").forEach(x => x.remove());
    clone.querySelectorAll("iframe[data-umo-gid], svg[data-umo-gid], canvas[data-umo-gid]").forEach(x => {
      const p = clone.createElement("p"); p.textContent = "UMOGRAFIK:" + x.getAttribute("data-umo-gid"); x.replaceWith(p);
    });
    try { clone.querySelectorAll(AD_SEL).forEach(x => x.remove()); } catch (e) {}
    let art = null;
    try { art = new Readability(clone, { charThreshold: 300 }).parse(); } catch (e) { art = null; }
    if (!art || !art.content) return null;
    const doc = new DOMParser().parseFromString(art.content, "text/html");
    const blocks = []; let id = 0; const used = new Set();
    const live = gid => gid && document.querySelector(`[data-umo-gid="${gid}"]`);
    const pushImg = (img, capEl) => {
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      if (!src) return;
      let abs; try { abs = new URL(src, location.href).href; } catch (e) { return; }
      let gid = img.getAttribute("data-umo-gid");
      if (!gid) { const m = [...document.querySelectorAll("img[data-umo-gid]")].find(x => x.currentSrc === abs || x.src === abs); if (m) gid = m.dataset.umoGid; }
      const w = +(img.getAttribute("width") || 0); if (w && w < 160 && !gid) return;
      if (gid) used.add(gid);
      blocks.push({ id: "b" + id++, type: "img", src: abs, alt: img.getAttribute("alt") || "", caption: capEl ? clean(capEl.textContent) : "", gid });
    };
    const walk = node => {
      for (const el of node.children) {
        const tag = el.tagName;
        if (/^H[1-6]$/.test(tag)) { const t = clean(el.textContent); if (t && t !== clean(art.title)) blocks.push({ id: "b" + id++, type: "h", text: t }); }
        else if (tag === "P" || tag === "BLOCKQUOTE") {
          el.querySelectorAll("img").forEach(i => pushImg(i));
          const t = clean(el.textContent);
          const gm = t.match(/^UMOGRAFIK:(g\d+)$/); if (gm) { used.add(gm[1]); blocks.push({ id: "b" + id++, type: "graphic", gid: gm[1], label: "Grafik" }); continue; }
          if (/UMOGRAFIK:g\d+/.test(t)) continue;
          if (/^(anzeige|werbung)\b/i.test(t)) continue; if (t.length > 1) blocks.push({ id: "b" + id++, type: tag === "P" ? "p" : "q", text: t });
        }
        else if (tag === "UL" || tag === "OL") {
          const items = [...el.querySelectorAll(":scope > li")].map(li => clean(li.textContent)).filter(Boolean);
          if (items.length) blocks.push({ id: "b" + id++, type: "list", items, text: items.join("\n") });
        }
        else if (tag === "FIGURE" || tag === "PICTURE" || tag === "IMG") {
          const img = tag === "IMG" ? el : el.querySelector("img");
          if (img) pushImg(img, el.querySelector("figcaption"));
          else { const g = el.querySelector("[data-umo-gid]"); if (g) { used.add(g.dataset.umoGid); blocks.push({ id: "b" + id++, type: "graphic", gid: g.dataset.umoGid, label: "Grafik", caption: clean(el.querySelector("figcaption")?.textContent) }); } }
        }
        else if (tag === "TABLE") { const gid = el.getAttribute("data-umo-gid"); if (gid) { used.add(gid); blocks.push({ id: "b" + id++, type: "graphic", gid, label: "Tabelle" }); } }
        else walk(el);
      }
    };
    walk(doc.body);
    const extra = page.graphics.filter(g => !used.has(g.gid) && g.kind !== "img" && live(g.gid));
    if (extra.length) {
      blocks.push({ id: "b" + id++, type: "h", text: "Grafiken auf der Seite", synthetic: true });
      extra.forEach(g => blocks.push({ id: "b" + id++, type: "graphic", gid: g.gid, label: g.label }));
    }
    const rawTitle = clean(art.title) || document.title;
    page.article = { title: rawTitle.split(/\s+[|–—]\s+/)[0] || rawTitle, byline: clean(art.byline), site: clean(art.siteName) || HOST, blocks };
    return page.article;
  }

  /* ---------- AI ---------- */
  async function ask(prompt, opts = {}) {
    const r = await send({ type: "umo-ai", prompt, image: opts.image, maxTokens: opts.maxTokens });
    if (!r.ok) throw r;
    return r.data;
  }
  function errText(e, retry) {
    const c = e && e.code, detail = e && e.error ? `<small class="edetail">${esc(String(e.error).slice(0, 180))}</small>` : "";
    const again = retry ? ` <button data-act="${retry}">Nochmal versuchen</button>` : "";
    if (c === "no_key") return `Dafür braucht UMO einen API-Schlüssel. <button data-act="options">Einstellungen öffnen</button>`;
    if (c === "bad_key") return `Der API-Schlüssel wird nicht akzeptiert. <button data-act="options">Einstellungen prüfen</button>${detail}`;
    if (c === "no_credit") return `Das Guthaben des API-Kontos ist aufgebraucht. Bitte in der Claude Console aufladen.${detail}`;
    if (c === "bad_model") return `Das gewählte Modell ist mit diesem Schlüssel nicht verfügbar. <button data-act="options">Anderes Modell wählen</button>${detail}`;
    if (c === "rate_limited") return `Gerade kommen zu viele Anfragen an. Warte kurz.${again}${detail}`;
    if (c === "overloaded" || c === "server") return `Claude ist gerade überlastet. UMO hat es mehrmals versucht.${again}${detail}`;
    if (c === "network") return `Keine Verbindung zur KI. Prüfe das Internet.${again}${detail}`;
    if (c === "too_long") return `Der Text ist zu lang für eine Anfrage.${detail}`;
    if (c === "bad_json") return `Die Antwort der KI war unvollständig.${again}${detail}`;
    if (c === "stale") return "UMO wurde gerade aktualisiert. Lade die Seite neu.";
    return `Die KI hat gerade nicht geantwortet.${again}${detail}`;
  }
  // Regeln nach DIN 8581-1:2024-05 (Einfache Sprache) und DIN SPEC 33429:2025-03 (Leichte Sprache)
  const RULES_EINFACH = `Schreibe in Einfacher Sprache (nach DIN 8581-1). Zielgruppe: alle Menschen, die einen Text schnell und sicher verstehen wollen.
- Das Wichtigste zuerst.
- Kurze Sätze, meist unter 15 Wörtern. Nebensätze nur, wenn sie nötig sind, und nie verschachtelt.
- Bekannte Alltagswörter. Fachwörter und Fremdwörter vermeiden. Ist eines nötig, erkläre es beim ersten Mal kurz im Satz.
- Aktiv statt Passiv. Verben statt Hauptwörter: „entscheiden“ statt „eine Entscheidung treffen“.
- Keine Abkürzungen ohne Erklärung. Keine Bilder-Sprache, keine Ironie.
- Fließtext in kurzen Absätzen. Zahlen bleiben genau, große Zahlen lesbar: 1,2 Millionen.`;
  const RULES_LEICHT = `Schreibe in Leichter Sprache (nach DIN SPEC 33429). Zielgruppe: Menschen mit Lern·schwierigkeiten.
- Ein Gedanke pro Satz. Höchstens etwa 10 Wörter pro Satz.
- Jeder Satz steht in einer eigenen Zeile. Trenne die Sätze mit \\n.
- Nur einfache Haupt·sätze. Keine Neben·sätze, keine Einschübe.
- Kein Genitiv: „das Haus von dem Vater“ statt „das Haus des Vaters“.
- Kein Passiv. Kein Konjunktiv. Wenig Verneinung. Wenn nötig, das Wort „nicht“ benutzen.
- Nur bekannte, kurze Wörter. Ist ein schweres Wort nötig, erkläre es im nächsten Satz: „Das bedeutet: …“
- Lange zusammen·gesetzte Wörter mit Medio·punkt gliedern: Bundes·tag, Steuer·schätzung. Namen nicht gliedern.
- Immer das gleiche Wort für die gleiche Sache. Keine anderen Wörter dafür.
- Keine Abkürzungen, keine Fremd·wörter, keine Bilder-Sprache, keine Rede·wendungen, keine Ironie.
- Zahlen in Ziffern. Prozente und große Zahlen greifbar machen: „23 von 100 Menschen“, „sehr viel Geld: 400 Milliarden Euro“.
- Daten so schreiben: 23. Februar 2025. Keine Sonder·zeichen wie & % § ; und keine Klammern.
- Lieber etwas Unwichtiges weglassen. Aber nichts Wichtiges weglassen und nichts erfinden.`;
  const langRules = () => M.structure ? RULES_LEICHT : RULES_EINFACH;
  const langName = () => M.structure ? "Leichte Sprache" : "Einfache Sprache";
  const TONE = `So sprichst du: warm, ruhig und menschlich, wie eine freundliche Person, die neben einem sitzt. Du-Form. Kurze Sätze mit höchstens 12 Wörtern. Alltagswörter statt Fachwörter. Ist ein Fachwort nötig, erkläre es in wenigen Wörtern, zum Beispiel: Zweitstimme, also die Stimme für eine Partei.
Mach Zahlen greifbar und runde sie so, dass es noch stimmt: „etwa 23 von 100 Menschen“ statt „22,6 Prozent“, „fast ein Viertel“, „gut 400 Milliarden Euro“. Sag nie „Prozentpunkte“.
Sprich über das, was in der Welt passiert ist, nicht über die Darstellung. Benutze nie die Wörter Grafik, Diagramm, Balken, Spalte, Zeile, Achse, Legende, Tabelle, Daten oder Datensatz.
Nicht belehren. Keine Wertung von Parteien oder Personen. Keine Vorhersagen.`;
  const needsLine = () => cfg.needs ? `Wünsche der Person, bitte berücksichtigen: """${cfg.needs.slice(0, 500)}"""` : "";

  /* ---------- speech & sound ---------- */
  const canSpeak = "speechSynthesis" in window;
  let ttsSeq = 0, speakingFlag = false, ttsWarned = false;
  const ttsWait = new Map();
  const useEleven = () => cfg.voiceEngine === "eleven" && !!cfg.elevenKey;
  // Natürlichste deutsche Stimme finden: Premium/Erweitert/Natural vor Standard, Spaßstimmen ganz hinten
  const voiceScore = v => (/premium/i.test(v.name) ? 6 : 0) + (/erweitert|enhanced|verbessert/i.test(v.name) ? 5 : 0) + (/natural|neural|online/i.test(v.name) ? 5 : 0)
    + (/google deutsch/i.test(v.name) ? 3 : 0) + (/anna|petra|helena|katja|amala|seraphina|marlene|vicki|hedda/i.test(v.name) ? 2 : 0) + (/^de-DE/i.test(v.lang) ? 1 : 0)
    - (/grandma|grandpa|oma|opa|eddy|flo|reed|rocko|sandy|shelley|bells|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|bad news|good news|boing|albert|bahh|fred|junior|kathy|ralph|superstar|wobble/i.test(v.name) ? 10 : 0);
  function pickVoice() {
    if (!canSpeak) return null;
    const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang));
    if (!vs.length) return null;
    return (cfg.voiceName && vs.find(v => v.name === cfg.voiceName)) || vs.sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }
  if (canSpeak) { speechSynthesis.getVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", () => {}); }
  const TTS_MSG = {
    tts_bad_key: "Der ElevenLabs-Schlüssel wird nicht akzeptiert. Ich nutze die Browser-Stimme.",
    tts_voice: "Amy ist in eurem ElevenLabs-Konto nicht verfügbar. Fügt sie in ElevenLabs unter „Voices“ zu „My Voices“ hinzu. Bis dahin nutze ich die Browser-Stimme.",
    tts_plan: "Euer ElevenLabs-Tarif erlaubt Amy über die Schnittstelle nicht. Bis dahin nutze ich die Browser-Stimme.",
    tts_quota: "Das ElevenLabs-Guthaben ist aufgebraucht. Ich lese mit der kostenlosen Stimme weiter."
  };
  // Satzweise sprechen: klingt ruhiger und umgeht das Abbrechen langer Texte bei Online-Stimmen
  let utterSeq = 0;
  function browserUtter(text, onend) {
    if (!canSpeak) return false;
    const v = pickVoice(), my = ++utterSeq; text = String(text).replace(/·/g, "");
    const parts = sentences(text).reduce((acc, t) => { const last = acc[acc.length - 1]; if (last && (last + " " + t).length < 180) acc[acc.length - 1] = last + " " + t; else acc.push(t); return acc; }, []);
    if (!parts.length) return false;
    speakingFlag = true;
    parts.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t); u.lang = v ? v.lang : "de-DE"; u.rate = +cfg.voiceRate || 0.9; u.pitch = 1; if (v) u.voice = v;
      if (i === parts.length - 1) u.onend = u.onerror = () => { if (my !== utterSeq) return; speakingFlag = false; onend && onend(); };
      speechSynthesis.speak(u);
    });
    return true;
  }
  // Spricht mit ElevenLabs (Amy), sonst mit der Browser-Stimme. onstart(dauerInSekunden) nur bei ElevenLabs.
  function utter(text, onend, onstart) {
    if (useEleven()) {
      const id = ++ttsSeq; ttsWait.set(id, { onend, onstart }); speakingFlag = true;
      send({ type: "umo-tts", text, id }).then(r => {
        if (r.ok || !ttsWait.has(id)) return;
        ttsWait.delete(id); speakingFlag = false;
        if (!ttsWarned) { ttsWarned = true; toast(TTS_MSG[r.code] || "Die Stimme Amy ist gerade nicht erreichbar (" + String(r.error || "").slice(0, 80) + "). Ich nutze die Browser-Stimme.", 7000); }
        if (!browserUtter(text, onend)) onend && onend();
      });
      return true;
    }
    return browserUtter(text, onend);
  }
  chrome.runtime.onMessage.addListener(m => {
    if (m.type === "umo-tts-started") { const w = ttsWait.get(m.id); if (w && w.onstart) w.onstart(m.duration || 0); }
    if (m.type === "umo-tts-ended") { const w = ttsWait.get(m.id); if (!w) return; ttsWait.delete(m.id); speakingFlag = false; w.onend && w.onend(); }
  });
  const isSpeaking = () => speakingFlag || (canSpeak && speechSynthesis.speaking);
  function stopSpeak() { ttsWait.clear(); speakingFlag = false; utterSeq++; if (useEleven()) send({ type: "umo-tts-stop" }); if (canSpeak) speechSynthesis.cancel(); }
  function speak(t) { stopSpeak(); if (!utter(String(t).replace(/·/g, "").slice(0, 4500))) toast("Vorlesen geht in diesem Browser nicht."); }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listen(btn, onText, onFail) {
    const fail = m => { toast(m); onFail && onFail(); };
    if (!SR) return fail("Spracheingabe geht hier nicht. Bitte tippe.");
    let r; try { r = new SR(); } catch (e) { return fail("Spracheingabe geht hier nicht. Bitte tippe."); }
    r.lang = "de-DE"; r.interimResults = false;
    btn && btn.classList.add("listening");
    r.onresult = e => onText(e.results[0][0].transcript);
    r.onerror = e => fail(e.error === "not-allowed" ? "Das Mikrofon ist gesperrt. Bitte tippe." : "Ich habe nichts gehört. Versuch es noch mal.");
    r.onend = () => btn && btn.classList.remove("listening");
    try { r.start(); } catch (e) { btn && btn.classList.remove("listening"); }
  }
  let audio = null;
  function soundOn() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      [196, 246.94, 293.66, 392].forEach((f, i) => {
        const o = ctx.createOscillator(); o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = 0.018;
        const l = ctx.createOscillator(); l.frequency.value = 0.04 + i * 0.025;
        const lg = ctx.createGain(); lg.gain.value = 0.014;
        l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); l.start();
      });
      master.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
      audio = { ctx, master }; return true;
    } catch (e) { toast("Klänge gehen hier nicht."); return false; }
  }
  function soundOff() { if (!audio) return; const { ctx, master } = audio; audio = null; try { master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); } catch (e) {} setTimeout(() => ctx.close().catch(() => {}), 1200); }
  let toastT;
  function toast(m, ms) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms || 3000); }

  /* ---------- modes ---------- */
  const INFO = {
    fokus: { title: "Fokus Modus", desc: "Der Fokus Modus blendet aus, was ablenkt: Werbung, Pop-ups, Bewegung. So bleibt der Blick beim Wichtigen." },
    einfach: { title: "Einfach Modus", desc: "Der Einfach Modus zeigt den Text in einfacher Sprache, mit dem Wichtigsten vorneweg und erklärten Grafiken." },
    einfach_produkt: "Der Einfach Modus erklärt dieses Produkt in einfacher Sprache: was es ist, woraus es ist und worauf du achten solltest. Du kannst auch Fragen stellen.",
    einfach_seite: "Der Einfach Modus erklärt dir in einfacher Sprache, was das für eine Seite ist und was du hier tun kannst.",
    snack: { title: "Snack Modus", desc: "Der Snack Modus fasst lange Inhalte in kleine Pakete zusammen." },
    calm: { title: "Calming Modus", desc: "Der Calming Modus macht die Seite ruhiger und hilft dir mit einer kurzen Atemübung." }
  };
  const availModes = () => page.type === "artikel" ? ["fokus", "einfach", "snack", "calm"] : ["fokus", "einfach", "calm"];
  function tiles(mode) {
    if (mode === "fokus") {
      const t = [["noise", "Ablenkungen ausblenden"]];
      if (page.type === "shop" || (page.type === "seite" && page.search)) t.push(["guide", "Auswahl verdichten"]);
      return t;
    }
    if (mode === "einfach") {
      if (page.type === "artikel") return [["simplify", "Einfach lesen"], ["charts", "Grafiken auf der Seite erklären"]];
      if (page.type === "produkt") return [["product", "Produkt einfach erklären"]];
      return [["explainPage", "Seite einfach erklären"]];
    }
    if (mode === "snack") return [["snack", "Inhalte in Pakete zusammenfassen"]];
    return [["calmPage", "Seite beruhigen"]];
  }
  const modeOn = m => tiles(m).some(([k]) => M[k]);
  const activeModes = () => availModes().filter(modeOn);

  function setMode(k, on) {
    if (M[k] === on) return;
    M[k] = on;
    if (k === "noise") { setDocSheet("noise", on || M.calmPage ? NOISE_CSS : null); if (on) hideOverlays(); else if (!M.calmPage) restoreOverlays(); }
    if (k === "calmPage") { setDocSheet("calm", on ? CALM_CSS : null); setDocSheet("noise", on || M.noise ? NOISE_CSS : null); if (on) hideOverlays(); else if (!M.noise) restoreOverlays(); }
    if (k === "sound") { if (on) { if (!soundOn()) M.sound = false; } else soundOff(); }
    if (k === "guide") { if (on) { G.step = "ask"; } else clearShape(); }
    if (k === "product" || k === "explainPage") { qa.length = 0; renderReader(); }
    if (k === "charts") { if (on) { prepareLazy().then(() => { attachInline(); if (inlineHosts.length) toast("Unter jeder Grafik steht jetzt „Grafik einfach erklärt“."); }); } else detachInline(); }
    if (["summary", "simplify", "structure", "snack"].includes(k)) {
      if (k === "simplify" || k === "structure") { explainLevel = {}; }
      renderReader();
    }
    renderLauncher();
  }
  function renderLauncher() {
    const act = activeModes();
    const l = $("#launch");
    l.hidden = !ui.visible;
    $("#lbl").textContent = !act.length ? "Modus" : act.length === 1 ? INFO[act[0]].title : act.length + " Modi an";
  }

  /* ---------- sheet ---------- */
  function openSheet(view) {
    stopSpeak();
    if (!view || ["fokus", "einfach", "snack", "calm"].includes(view)) analyse();
    const modes = availModes();
    if (!view || (!modes.includes(view) && !["needs", "guide"].includes(view))) view = ui.view && modes.includes(ui.view) ? ui.view : (activeModes()[0] || (page.type === "shop" ? "fokus" : "einfach"));
    if (!["needs", "guide"].includes(view)) ui.view = view;
    let inner;
    if (view === "needs") inner = needsHTML();
    else if (view === "guide") inner = guideHTML();
    else {
      const info = INFO[view], on = modeOn(view), ts = tiles(view);
      const desc = view === "einfach" && page.type === "produkt" ? INFO.einfach_produkt : view === "einfach" && page.type !== "artikel" ? INFO.einfach_seite : info.desc;
      const needsBar = `<button class="needsbar" data-act="needs">${ICON.wave.replace("<svg", '<svg class="ic"')}<span><b>${cfg.needs ? "Deine Bedürfnisse" : "Teile deine Bedürfnisse"}</b><small>${cfg.needs ? esc(cfg.needs.slice(0, 70)) + (cfg.needs.length > 70 ? " …" : "") : "Gilt für alle Modi und alle Websites"}</small></span><em>${cfg.needs ? "Ändern" : "Los"}</em></button>`;
      const fokusTile = view === "fokus" ? `<button class="tile${ts.length % 2 ? "" : " wide"}" data-act="focus-page">${ICON.wave.replace("<svg", '<svg class="ic"')}Kompakt zusammenfassen<small>Auf einer eigenen Seite</small></button>` : "";
      const keyNote = !hasKey() && view !== "calm" ? `<div class="keynote">Ohne API-Schlüssel zeigt UMO nur, was es ohne KI kann: Ablenkung ausblenden, Strukturieren, die wichtigsten Angaben der Seite und Calming. <button data-act="options">Schlüssel eintragen</button></div>` : "";
      inner = `<p class="ptype">Passend für diese Seite: ${TYPE_LABEL[page.type]}</p><div class="mtabs" role="tablist" aria-label="Modi">${modes.map(m => `<button role="tab" data-act="tab" data-view="${m}" aria-selected="${m === view}">${modeOn(m) ? '<i class="on"></i>' : ""}${INFO[m].title.replace(" Modus", "")}</button>`).join("")}</div>${needsBar}
        <div class="mhead"><h2 id="umoT">${info.title}</h2><button class="status" data-act="all" data-view="${view}" aria-pressed="${on}" aria-label="${info.title} ${on ? "ausschalten" : "einschalten"}"><i></i>${on ? "An" : "Aus"}</button></div>
        <p class="mdesc">${desc}</p>${keyNote}
        <div class="tiles">
          ${ts.map(([k, label]) => `<button class="tile" data-act="sub" data-k="${k}" aria-pressed="${M[k]}"><span class="tg" aria-hidden="true"><i></i></span>${label}</button>`).join("")}
          ${view === "calm" ? `<button class="tile${ts.length % 2 ? "" : " wide"}" data-act="breath">${ICON.breath.replace("<svg", '<svg class="ic"')}Atemübung starten<small>4 Sekunden ein, 6 Sekunden aus</small></button>` : fokusTile}
        </div>
        <div class="foot"><span>Deine Wünsche bleiben auf diesem Gerät.</span><button data-act="diag">Was erkennt UMO hier?</button><button data-act="hide-site">Auf ${esc(HOST)} ausblenden</button></div>`;
    }
    $("#layer").innerHTML = `<div class="wrap layer"><button class="backdrop" data-act="close" aria-label="Schließen" tabindex="-1"></button>
      <div class="stack"><button class="close" data-act="close">Schließen</button>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="umoT">${inner}</div></div></div>`;
    const f = view === "needs" ? $("#chatIn") : view === "guide" ? ($("#gIn") || $(".guide .opts button") || $(".sheet button")) : $('.mtabs [aria-selected="true"]');
    if (f) f.focus();
    if (view === "needs") { const c = $("#chatLog"); if (c) c.scrollTop = c.scrollHeight; }
  }
  function diagHTML() {
    const art = page.isArticle;
    const rows = [["Seitentyp", TYPE_LABEL[page.type]], ["Produkte erkannt", page.products.length], ["Suchfeld", page.search ? "ja" : "nein"], ["Shop-Anpassung", adapter() ? adapter().name : "keine (allgemein)"], ["Grafiken", page.graphics.length || "noch nicht geprüft"], ["KI-Schlüssel", hasKey() ? "ja" : "nein"]];
    return `<div class="keynote diag" style="margin-top:12px">${rows.map(r => `<div><b>${r[0]}:</b> ${esc(r[1])}</div>`).join("")}<div style="margin-top:6px;opacity:.7">${esc(location.hostname)}</div></div>`;
  }
  function closeLayer() { $("#layer").innerHTML = ""; clearTimeout(breathT); breathRun++; cancelAnimationFrame(blobRAF); if (M.sound) setMode("sound", false); }

  /* ---------- needs chat ---------- */
  function needsHTML() {
    if (!ui.chat.length) {
      ui.chat.push({ who: "bot", text: isShop() ? "Was ist der Grund, warum du diese Seite besuchst? Und was fällt dir hier schwer?" : "Teile deine Bedürfnisse, wie bspw. einfache und verständliche Sprache, keine Fremdwörter etc." });
      if (cfg.needs) ui.chat.push({ who: "me", text: cfg.needs });
    }
    const chips = page.isArticle ? ["Kurze Sätze", "Keine Fremdwörter", "Grafiken verstehe ich nicht", "Bitte alles vorlesen"] : ["Zu viel Auswahl", "Mich lenkt alles ab", "Bitte alles vorlesen"];
    return `<div class="mhead"><h2 id="umoT">Deine Bedürfnisse</h2><button class="status" data-act="tab" data-view="${ui.view || ""}">Zurück</button></div>
      <div class="chat" id="chatLog" aria-live="polite">${ui.chat.map(m => `<div class="bub ${m.who}">${esc(m.text)}${m.suggest ? `<br><button class="act" data-act="suggest" data-view="${m.suggest}">${INFO[m.suggest].title} einschalten</button>` : ""}</div>`).join("")}${cfg.needs ? `<button class="linkbtn" data-act="needs-clear">Meine Wünsche löschen</button>` : ""}</div>
      <div class="chips">${chips.map(c => `<button data-act="chip">${c}</button>`).join("")}</div>
      ${ui.chatMode === "text" ? `<div class="row"><input id="chatIn" type="text" placeholder="Schreib, was dir hilft …" aria-label="Deine Bedürfnisse"><button class="round" data-act="chat-send" aria-label="Senden">${ICON.next}</button></div>` : ""}
      <div class="cbtns"><button class="round" data-act="chat-voice" aria-label="Sprechen">${ICON.wave}</button><button class="round dark" data-act="chat-text" aria-label="Tippen">${ICON.text}</button></div>`;
  }
  function suggestFor(t) {
    const s = t.toLowerCase(), modes = availModes();
    for (const [re, m] of [[/stress|angst|ruhe|überfordert|panik/, "calm"], [/auswahl|ablenk|konzentr|fokus|adhs|zu viele/, "fokus"], [/lang|kurz|häppchen|snack/, "snack"], [/versteh|einfach|wörter|fremdw|sprache|grafik|zahlen|sätze/, "einfach"]])
      if (re.test(s) && modes.includes(m)) return m;
    return null;
  }
  async function sendNeed(text) {
    text = clean(text); if (!text) return;
    ui.chat.push({ who: "me", text });
    cfg.needs = (cfg.needs ? cfg.needs + "\n" : "") + text;
    chrome.storage.local.set({ needs: cfg.needs });
    ui.chat.push({ who: "bot", text: "…" }); openSheet("needs");
    let reply = "Kein Problem. UMO passt die Inhalte für dich an. Komm immer wieder hierher zurück, wenn du etwas brauchst.", sug = suggestFor(text);
    if (hasKey()) {
      try {
        const r = await ask(`Du bist UMO, ein freundlicher Helfer, der Websites leichter nutzbar macht. Die Person ist gerade auf ${HOST} (${page.isArticle ? "ein Artikel" : isShop() ? "ein Shop" : "eine Website"}). Sie beschreibt, was ihr schwerfällt oder was sie braucht. Antworte in 1 bis 2 kurzen Sätzen in einfacher Sprache, was UMO jetzt für sie tun kann. Keine Diagnosen, keine Gesundheitsratschläge, nicht belehrend.
Verfügbare Modi: ${availModes().map(m => INFO[m].title + " (" + INFO[m].desc + ")").join("; ")}.
Die Person schreibt: """${text.slice(0, 500)}"""
Antworte nur mit JSON: {"reply":"...","mode":"${availModes().join("|")}|null"}`, { maxTokens: 400 });
        if (r && typeof r.reply === "string") reply = r.reply;
        if (r && availModes().includes(r.mode)) sug = r.mode; else if (r && r.mode === null) sug = null;
      } catch (e) { if (e.code === "bad_key") reply = "Ich habe deine Wünsche gespeichert. Der API-Schlüssel funktioniert aber gerade nicht."; }
    }
    const last = ui.chat[ui.chat.length - 1]; last.text = reply; if (sug && !modeOn(sug)) last.suggest = sug;
    if (/vorlesen/i.test(text)) speak(reply);
    if ($("#chatLog")) openSheet("needs");
  }

  /* ---------- guide: Auswahl verdichten ---------- */
  // [Label, Zalando-Slug (live geprüft), Erkennung im Wunsch, Wörter in Produkttexten]
  const COLORS = [
    ["Weiß", "weiss", /wei(ß|ss)/, ["weiß", "weiss", "white", "offwhite", "off-white", "off white"]],
    ["Schwarz", "schwarz", /schwarz/, ["schwarz", "black"]],
    ["Grau", "grau", /\bgrau|anthrazit/, ["grau", "grey", "gray", "anthrazit"]],
    ["Blau", "blau", /\bblau|navy/, ["blau", "blue", "navy"]],
    ["Grün", "gruen", /gr(ü|ue)n|oliv|khaki/, ["grün", "gruen", "green", "olive", "khaki"]],
    ["Rot", "rot", /\brot(e|es|er|en)?\b|bordeaux/, ["rot", "red", "bordeaux"]],
    ["Pink", "pink", /rosa|pink/, ["rosa", "pink", "rose"]],
    ["Beige", "beige", /beige|creme|sand/, ["beige", "sand", "ecru", "creme", "cream"]],
    ["Braun", "braun", /braun/, ["braun", "brown"]],
    ["Gelb", "gelb", /gelb/, ["gelb", "yellow"]],
    ["Orange", "orange", /orange/, ["orange"]],
    ["Lila", "lila", /lila|violett/, ["lila", "purple", "violett", "lilac"]],
    ["Türkis", "tuerkis", /t(ü|ue)rkis/, ["türkis", "turquoise"]]
  ];
  const STOP = /(^|\s)(ich|suche|such|möchte|hätte|gern|gerne|bitte|ein|eine|einen|einem|für|bis|unter|max|maximal|höchstens|ca|etwa|euro|eur|in|der|die|das|mit|und|größe|damen|frauen|herren|männer|maenner|kinder|kind|jungen|mädchen)(?=\s|$)/g;
  function parseWish(w) {
    const s = w.toLowerCase(), c = { raw: w, color: null, maxPrice: null, size: null, query: "" };
    const col = COLORS.find(x => x[2].test(s)); if (col) c.color = col;
    const pm = s.match(/(\d{1,4})(?:[,.](\d{2}))?\s*(€|euro|eur)(?=\s|$|[.,!?)])/); if (pm) c.maxPrice = +(pm[1] + "." + (pm[2] || "0"));
    const sm = s.match(/größe\s*(xxs|xs|s|m|l|xl|xxl|xxxl|\d{2,3})(?=\s|$|[.,!?])/) || s.match(/(?:^|\s)(xxs|xs|xl|xxl|xxxl)(?=\s|$)/); if (sm) c.size = sm[1].toUpperCase();
    c.gender = /\b(damen|frauen|frau)\b/.test(s) ? "damen" : /\b(herren|männer|maenner|mann)\b/.test(s) ? "herren" : /(^|\s)(kinder|kind\b|jungen\b|junge\b|mädchen)/.test(s) ? "kinder" : null;
    c.query = clean(s.replace(/(\d{1,4})(?:[,.]\d{2})?\s*(€|euro|eur)(?=\s|$|[.,!?)])/g, " ").replace(/größe\s*\S+/g, " ").replace(/(^|\s)(xxs|xs|xl|xxl|xxxl)(?=\s|$)/g, " ").replace(STOP, " ").replace(STOP, " "));
    if (c.color) c.query = clean(c.query.replace(new RegExp("\\S*(?:" + c.color[2].source.replace(/\\b/g, "") + ")\\S*", "g"), " "));
    if (!c.query) c.query = clean(s.replace(STOP, " "));
    return c;
  }
  const fmtEuro = n => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  function constraintLabel(c) { return [c.color && c.color[0], c.maxPrice && "bis " + fmtEuro(c.maxPrice), c.size && "Größe " + c.size].filter(Boolean).join(", "); }
  function matchesHard(p, c) {
    const t = p.text.toLowerCase();
    const site = adapter() && adapter().applied ? adapter().applied(c) : {};
    if (c.color && !site.color && !c.color[3].some(w => t.includes(w))) return false;
    if (c.maxPrice && !(p.price <= c.maxPrice)) return false;
    return true;
  }
  function softScore(p, c) {
    const words = c.query.split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(es|er|en|e|s)$/, ""));
    const t = p.text.toLowerCase();
    return words.filter(w => t.includes(w) || t.includes(w.replace(/-/g, " "))).length;
  }
  // Zalando: live geprüft im Oktober 2026 auf zalando.de, z. B.
  // /katalog/_weiss_groesse-M/?q=t-shirt&price_to=25  und  /damen/_pink/?q=kleid
  const ADAPTERS = [
    { name: "Zalando", match: h => /(^|\.)zalando\.[a-z.]+$/.test(h),
      search: c => {
        const base = /^en\./.test(location.hostname) ? "catalog" : (c.gender || "katalog");
        const f = [c.color && c.color[1], c.size && "groesse-" + c.size].filter(Boolean);
        const qs = new URLSearchParams({ q: c.query || c.raw });
        if (c.maxPrice) qs.set("price_to", String(Math.ceil(c.maxPrice)));
        return `${location.origin}/${base}/${f.length ? "_" + f.join("_") + "/" : ""}?${qs}`;
      },
      applied: c => ({ color: !!c.color && new RegExp(`/_([a-z0-9-]+_)*${c.color[1]}(_|/)`).test(location.pathname), size: !!c.size && /groesse-/.test(location.pathname) }) }
  ];
  const adapter = () => ADAPTERS.find(a => a.match(location.hostname));

  const G = { step: "ask", wish: "", c: null, understood: "", questions: [], qi: 0, answers: [], picks: [], matches: [], note: "", error: "" };
  function guideHTML() {
    const top = `<div class="mhead"><h2 id="umoT">Auswahl verdichten</h2><button class="status" data-act="tab" data-view="fokus">Zurück</button></div>`;
    if (G.step === "ask") return `${top}<div class="guide"><p class="lead" style="margin-top:12px">Was suchst du? Sag es in deinen Worten, zum Beispiel mit Farbe und Preis. UMO nutzt die Suche und die Filter dieser Seite und blendet alles aus, was nicht passt.</p>
      ${G.error ? `<div class="keynote">${G.error}</div>` : ""}
      <div class="row"><input id="gIn" type="text" value="${esc(G.wish)}" placeholder="z. B. weißes T-Shirt bis 25 €" aria-label="Was suchst du?"><button class="round" data-act="g-mic" aria-label="Sprechen">${ICON.wave}</button></div>
      <div class="row"><button class="pill big" data-act="g-go">Suchen</button></div>
      <p class="note">${adapter() ? `Für ${adapter().name} nutzt UMO die Suche der Seite.` : page.products.length >= 4 ? `Ich sehe hier ${page.products.length} Produkte.` : "Ich nutze die Suche dieser Seite."}</p></div>`;
    if (G.step === "thinking") return `${top}<div class="thinking" role="status"><span class="dots"><i></i><i></i><i></i></span> ${esc(G.note || "Ich schaue mir die Produkte an …")}</div>`;
    if (G.step === "q") {
      const q = G.questions[G.qi];
      return `${top}<div class="guide" style="margin-top:12px">${G.understood ? `<p class="lead">Du suchst: <b style="color:#fff">${esc(G.understood)}</b>. ${G.matches.length} passen.</p>` : ""}
        <div class="steps" aria-hidden="true">${G.questions.map((_, i) => `<i class="${i <= G.qi ? "on" : ""}"></i>`).join("")}</div>
        <p class="qn">Frage ${G.qi + 1} von ${G.questions.length}</p><h2 id="gq">${esc(q.text)}</h2>
        <div class="opts" role="group" aria-labelledby="gq">${q.options.map((o, i) => `<button data-act="g-ans" data-i="${i}">${esc(o)}</button>`).join("")}<button class="egal" data-act="g-ans" data-i="-1">Egal</button></div></div>`;
    }
    const lbl = G.c ? constraintLabel(G.c) : "";
    return `${top}<div class="guide" style="margin-top:12px">
      <h2>${G.picks.length ? (G.picks.length === 1 ? "1 Vorschlag" : G.picks.length + " Vorschläge") + " für dich" : "Nichts Passendes gefunden"}</h2>
      <p class="lead">${G.matches.length} von ${page.products.length} Produkten auf der Seite passen${lbl ? " (" + esc(lbl) + ")" : ""}. Die anderen sind ausgeblendet.</p>
      ${G.note ? `<p class="note">${esc(G.note)}</p>` : ""}
      ${G.picks.map((p, i) => `<div class="pick">${p.img ? `<img src="${esc(p.img)}" alt="">` : "<span></span>"}<div><p>${esc(p.text.slice(0, 140))}</p>${p.reason ? `<p class="why">${esc(p.reason)}</p>` : ""}
        <div class="acts"><a class="pill" href="${esc(p.href)}">Ansehen</a><button class="pill dark" data-act="g-show" data-i="${i}">Auf der Seite zeigen</button></div></div></div>`).join("")}
      <div class="row" style="flex-wrap:wrap"><button class="pill" data-act="g-view">Zur Seite</button><button class="pill dark" data-act="g-all">Alle wieder zeigen</button><button class="pill dark" data-act="g-restart">Neu suchen</button></div>
      <p class="note">Größe und Lieferbarkeit prüfst du auf der Produktseite.</p></div>`;
  }
  function savePending(extra) { sessionStorage.setItem("umo-pending", JSON.stringify(Object.assign({ wish: G.wish, t: Date.now() }, extra || {}))); }
  async function guideGo(wish) {
    wish = clean(wish); if (!wish) return;
    G.wish = wish; G.error = ""; G.c = parseWish(wish);
    clearShape();
    const ad = adapter();
    if (ad) {
      const url = ad.search(G.c);
      const norm = u => { try { const x = new URL(u); x.searchParams.sort(); return x.pathname.replace(/^\/(katalog|damen|herren|kinder)\//, "/") + x.search; } catch (e) { return u; } };
      if (url && norm(url) !== norm(location.href)) { savePending(); G.step = "thinking"; G.note = `Ich suche bei ${ad.name} nach „${G.c.query || wish}“ …`; openSheet("guide"); location.href = url; return; }
    }
    page.products = findProducts();
    if (page.products.length < 4) {
      savePending(); G.step = "thinking"; G.note = "Ich suche auf der Seite …"; openSheet("guide");
      siteSearch(G.c.query || wish); return;
    }
    await runOnPage();
  }
  function siteSearch(q) {
    const before = location.href, input = findSearch();
    if (input) {
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, q);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const form = input.closest("form");
      if (form && form.requestSubmit) { try { form.requestSubmit(); } catch (e) { form.submit(); } }
      else ["keydown", "keypress", "keyup"].forEach(t => input.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })));
    }
    setTimeout(() => {
      if (location.href !== before) return;
      G.step = "ask"; G.error = "Die Suche dieser Seite hat nicht reagiert. Öffne eine Übersichtsseite mit Produkten und versuch es dort noch einmal.";
      if ($(".sheet")) openSheet("guide");
    }, input ? 3500 : 0);
  }
  function findFacetLink(c) {
    if (!c.color) return null;
    const prodHrefs = new Set(page.products.map(p => p.href));
    for (const a of document.querySelectorAll("a[href]")) {
      if (a.closest("umo-root")) continue;
      let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { continue; }
      if (u.origin !== location.origin || prodHrefs.has(u.href) || u.href === location.href) continue;
      const t = clean(a.textContent).toLowerCase();
      const hrefHit = new RegExp(`(/_${c.color[1]}(/|$)|[?&](farbe|color|colour|colors)=${c.color[1]})`, "i").test(u.pathname + u.search);
      if (hrefHit || (t.length <= 20 && c.color[3].some(w => t === w || t.startsWith(w + " ") || t.startsWith(w + "(")))) return u.href;
    }
    return null;
  }
  async function resumePending() {
    let p; try { p = JSON.parse(sessionStorage.getItem("umo-pending") || "null"); } catch (e) { p = null; }
    if (!p || Date.now() - p.t > 90000) return;
    sessionStorage.removeItem("umo-pending");
    M.guide = true; G.wish = p.wish; G.c = parseWish(p.wish); G.step = "thinking"; G.note = "Ich schaue mir die Ergebnisse an …";
    openSheet("guide"); renderLauncher();
    for (let i = 0; i < 12; i++) { page.products = findProducts(); if (page.products.length >= 4) break; await sleep(800); }
    if (!p.facet && !(adapter() && adapter().applied(G.c).color)) {
      const link = findFacetLink(G.c);
      if (link) { savePending({ facet: true }); G.note = `Ich setze den Filter „${G.c.color[0]}“ …`; openSheet("guide"); location.href = link; return; }
    }
    if (page.products.length < 2) { G.step = "ask"; G.error = "Auf dieser Seite finde ich keine Produkte. Probier es mit anderen Worten oder auf einer Übersichtsseite."; openSheet("guide"); return; }
    await runOnPage();
  }
  const productList = list => list.map((p, i) => `${i}: ${p.text.slice(0, 200)}`).join("\n");
  async function runOnPage() {
    page.products = findProducts();
    const c = G.c || parseWish(G.wish);
    let matches = page.products.filter(p => matchesHard(p, c));
    G.note = "";
    if (!matches.length && page.products.length) {
      G.note = `Keins der ${page.products.length} sichtbaren Produkte passt zu ${constraintLabel(c)}. Ich zeige die Treffer ohne diese Grenze.`;
      matches = page.products.slice();
    }
    G.matches = matches.sort((a, b) => softScore(b, c) - softScore(a, c));
    shapePage(G.matches, []);
    G.questions = []; G.qi = 0; G.answers = []; G.understood = "";
    if (hasKey() && G.matches.length > 3) {
      G.step = "thinking"; G.note2 = G.note; G.note = "Ich schaue mir die passenden Produkte an …"; openSheet("guide");
      try {
        const r = await ask(`Du bist UMO, ein ruhiger Einkaufshelfer für Menschen, die von zu viel Auswahl überfordert sind (zum Beispiel mit ADHS).
Die Person sucht: """${G.wish}"""
${needsLine()}
Diese Produkte passen schon zu Farbe und Preis (Nummer: Text):
${productList(G.matches.slice(0, 60))}
Stelle höchstens 2 kurze Fragen, die helfen, daraus die passendsten zu finden. Frage nur nach Dingen, die man an den Produkttexten erkennt (zum Beispiel Marke, Schnitt, Material, Einzelstück oder Mehrfachpack). Frage nicht nach Größe, Farbe oder Preis. Jede Frage hat 2 bis 4 kurze Antworten (höchstens 3 Wörter). Wenn keine Frage nötig ist, gib eine leere Liste.
Antworte nur mit JSON: {"understood":"was die Person sucht, höchstens 4 Wörter","questions":[{"text":"...","options":["...","..."]}]}`, { maxTokens: 600 });
        G.understood = clean(r.understood || "");
        G.questions = (Array.isArray(r.questions) ? r.questions : []).filter(q => q && q.text && Array.isArray(q.options) && q.options.length >= 2).slice(0, 2).map(q => ({ text: String(q.text), options: q.options.slice(0, 4).map(String) }));
      } catch (e) { if (e.code !== "no_key") G.note2 = (G.note2 ? G.note2 + " " : "") + "Die KI hat nicht geantwortet. Ich sortiere nach Stichworten."; }
      G.note = G.note2 || ""; delete G.note2;
      if (G.questions.length) { G.step = "q"; openSheet("guide"); return; }
    }
    await guidePicks();
  }
  async function guidePicks() {
    const keepNote = G.note;
    let picks = [];
    if (hasKey() && G.matches.length > 1) {
      G.step = "thinking"; G.note = "Ich wähle die passendsten aus …"; openSheet("guide");
      try {
        const list = G.matches.slice(0, 60);
        const r = await ask(`Du bist UMO, ein ruhiger Einkaufshelfer. Wähle aus den Produkten höchstens 3, die am besten passen.
Die Person sucht: """${G.wish}"""
Antworten auf Rückfragen: ${G.answers.length ? G.answers.map(a => a.q + " → " + a.a).join("; ") : "keine"}
${needsLine()}
Produkte (Nummer: Text):
${productList(list)}
Regeln: Nimm nur Produkte, die wirklich passen. Begründe jede Wahl in höchstens 8 einfachen Wörtern. Erfinde keine Eigenschaften, die nicht im Text stehen.
Antworte nur mit JSON: {"picks":[{"i":0,"reason":"..."}]}`, { maxTokens: 500 });
        picks = (r.picks || []).filter(p => Number.isInteger(p.i) && list[p.i]).slice(0, 3).map(p => Object.assign({}, list[p.i], { reason: String(p.reason || "") }));
      } catch (e) {}
    }
    if (!picks.length) {
      const seenT = new Set();
      picks = G.matches.filter(p => { if (seenT.has(p.text)) return false; seenT.add(p.text); return true; }).slice(0, 3).map(p => Object.assign({}, p, { reason: Number.isFinite(p.price) ? fmtEuro(p.price) : "" }));
    }
    G.note = keepNote; G.picks = picks; G.step = "picks";
    shapePage(G.matches, picks);
    openSheet("guide");
  }
  const SHAPE_CSS = `[data-umo-hide]{display:none!important}[data-umo-first]{order:-1!important}[data-umo-pick]{outline:3px solid #FF541B!important;outline-offset:4px!important;border-radius:8px}`;
  function shapePage(matches, picks) {
    clearShape(true);
    setDocSheet("shape", SHAPE_CSS);
    const keep = new Set(matches.map(p => p.item)), top = new Set(picks.map(p => p.item));
    page.products.forEach(p => { if (!keep.has(p.item)) p.item.dataset.umoHide = "1"; });
    picks.forEach(p => { p.item.dataset.umoFirst = "1"; p.el.dataset.umoPick = "1"; });
    if (!M.noise) setMode("noise", true);
    renderShapeBar();
  }
  function clearShape(keepBar) {
    document.querySelectorAll("[data-umo-hide],[data-umo-first],[data-umo-pick],[data-umo-dim]").forEach(e => { delete e.dataset.umoHide; delete e.dataset.umoFirst; delete e.dataset.umoPick; delete e.dataset.umoDim; });
    setDocSheet("shape", null); setDocSheet("dim", null);
    if (!keepBar) { G.matches = []; renderShapeBar(); }
  }
  function renderShapeBar() {
    const bar = $("#shapebar"); if (!bar) return;
    if (!G.matches.length || !document.querySelector("[data-umo-hide],[data-umo-first]")) { bar.innerHTML = ""; return; }
    bar.innerHTML = `<div class="shapebar"><span class="dot"></span><span>UMO zeigt ${G.matches.length} von ${page.products.length}${G.c && constraintLabel(G.c) ? " · " + esc(constraintLabel(G.c)) : ""}</span><button data-act="g-all">Alle zeigen</button></div>`;
  }
  function clearDim() { clearShape(); }
  /* ---------- Einfach Modus für Produktseiten und andere Seiten ---------- */
  const qa = [];
  let explainData = null, explainToken = 0;
  function mainRoot() { return document.querySelector("main, [role=main]") || document.body; }
  function visibleText(max) { return clean((mainRoot().innerText || "").replace(/\b[a-z]+_(outlined|filled)\b/g, " ")).slice(0, max); }
  function localFacts() {
    const lines = (mainRoot().innerText || "").split(/\n+/).map(clean).filter(Boolean);
    const facts = [];
    for (let i = 0; i < lines.length && facts.length < 14; i++) {
      const l = lines[i];
      if (/^[A-ZÄÖÜ][\wäöüß .\-/()]{1,28}:\s*\S/.test(l) && l.length < 120) facts.push(l);
      else if (/^[A-ZÄÖÜ][\wäöüß .\-/()]{1,28}:?$/.test(l) && lines[i + 1] && lines[i + 1].length < 90 && /material|passform|pflege|schnitt|länge|kragen|ärmel|muster|obermaterial|zusammensetzung|größe|modell/i.test(l)) { facts.push(l.replace(/:$/, "") + ": " + lines[i + 1]); i++; }
    }
    return [...new Set(facts)];
  }
  function pageActions() {
    const seen = new Set(), out = [];
    for (const el of document.querySelectorAll("main a, main button, [role=main] a, [role=main] button, header nav a")) {
      if (el.closest("umo-root,footer,[aria-hidden='true']")) continue;
      const t = clean(el.innerText || el.getAttribute("aria-label") || "");
      const r = el.getBoundingClientRect();
      if (t.length < 3 || t.length > 40 || r.width < 1 || seen.has(t)) continue;
      seen.add(t); out.push(t); if (out.length >= 20) break;
    }
    return out;
  }
  async function renderExplainOverlay() {
    const slot = $("#reader"), my = ++explainToken, isProd = M.product;
    const h1 = clean(document.querySelector("h1")?.innerText || document.title);
    const price = isProd ? firstPrice(visibleText(4000)) : NaN;
    const title = isProd ? "Produkt einfach erklärt" : "Diese Seite einfach erklärt";
    const shell = body => `<div class="reader" role="dialog" aria-label="UMO ${title}">
      <div class="rbar"><span class="site">${esc(location.hostname.replace(/^www\./, ""))}</span><button class="pill" data-act="reader-close">Zur Seite</button></div>
      <div class="rbody"><div class="modes"><button class="mpill" data-act="open" data-view="einfach"><span class="dot"></span>Einfach Modus</button><button class="mpill ghost" data-act="read">Vorlesen</button></div>
      <h1 id="rTitle">${esc(isProd ? h1 : title)}</h1>${isProd && Number.isFinite(price) ? `<p class="byline">${esc(fmtEuro(price))}</p>` : ""}
      <div id="rMain">${body}</div></div></div>`;
    if (!explainData || explainData.url !== location.href || explainData.prod !== isProd || explainData.needs !== cfg.needs) {
      slot.innerHTML = shell(`<div class="thinking" role="status" style="color:#000"><span class="dots"><i></i><i></i><i></i></span> Ich lese die Seite …</div>`);
      let d = null, err = "";
      if (hasKey()) {
        try {
          d = await ask(isProd
            ? `Du bist UMO. Erkläre dieses Produkt von ${HOST} für Menschen mit kognitiven Einschränkungen in einfacher Sprache. Nutze nur Angaben, die im Seitentext stehen. Erfinde nichts. Keine Werbesprache.
${needsLine()}
Produktname: """${h1}"""
Seitentext:
"""${visibleText(7000)}"""
Antworte nur mit JSON: {"kurz":"1 bis 2 Sätze: Was ist das?","wichtig":["3 bis 5 kurze Punkte: Material, Passform, Besonderheiten"],"groesse":"Was die Seite zur Größe sagt, sonst leer","pflege":"Was die Seite zur Pflege sagt, sonst leer","achtung":["Dinge, auf die man achten sollte, nur wenn sie im Text stehen"]}`
            : `Du bist UMO. Erkläre einer Person mit kognitiven Einschränkungen in einfacher Sprache, was das für eine Website ist und was sie hier tun kann. Nutze nur, was auf der Seite steht.
${needsLine()}
Titel: """${document.title}"""
Überschriften: ${JSON.stringify([...document.querySelectorAll("h1,h2")].slice(0, 15).map(h => clean(h.innerText)).filter(Boolean))}
Knöpfe und Links: ${JSON.stringify(pageActions())}
Seitentext:
"""${visibleText(4000)}"""
Antworte nur mit JSON: {"was":"1 bis 2 Sätze: Was ist das für eine Seite?","tun":["3 bis 5 Dinge, die man hier tun kann, jeweils ein kurzer Satz"],"tipp":"ein kurzer, hilfreicher Tipp oder leer"}`, { maxTokens: 900 });
        } catch (e) { err = errText(e); }
      } else err = errText({ code: "no_key" });
      if (my !== explainToken) return;
      explainData = { url: location.href, prod: isProd, needs: cfg.needs, d, err, facts: isProd ? localFacts() : [], heads: [...document.querySelectorAll("h1,h2")].slice(0, 10).map(h => clean(h.innerText)).filter(Boolean), actions: pageActions().slice(0, 8) };
    }
    const x = explainData, d = x.d, list = a => a && a.length ? `<ul>${a.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
    let body = x.err ? `<div class="err">${x.err}</div>` : "";
    if (isProd) {
      if (d) body += `<section class="summary"><h3><span class="dot"></span>Was ist das?</h3><p style="font-size:17px;margin:0">${esc(d.kurz || "")}</p></section>
        ${d.wichtig && d.wichtig.length ? `<h2>Das Wichtigste</h2>${list(d.wichtig)}` : ""}${d.groesse ? `<h2>Größe</h2><p>${esc(d.groesse)}</p>` : ""}${d.pflege ? `<h2>Pflege</h2><p>${esc(d.pflege)}</p>` : ""}${d.achtung && d.achtung.length ? `<h2>Darauf solltest du achten</h2>${list(d.achtung)}` : ""}`;
      else body += x.facts.length ? `<h2>Die wichtigsten Angaben auf der Seite</h2>${list(x.facts)}` : `<p>Ich finde auf dieser Seite keine klaren Produktangaben.</p>`;
      body += `<h2>Frag etwas zum Produkt</h2><div class="qa">${qa.map(q => `<p class="qa-q">${esc(q.q)}</p><p class="qa-a">${esc(q.a)}</p>`).join("")}</div>
        <div class="qarow"><input id="qaIn" type="text" placeholder="z. B. Ist das aus Baumwolle?" aria-label="Frage zum Produkt"><button class="pill" data-act="qa-send">Fragen</button></div>
        <p class="ainote">UMO antwortet nur mit dem, was auf der Seite steht.</p>`;
    } else {
      if (d) body += `<section class="summary"><h3><span class="dot"></span>Was ist das für eine Seite?</h3><p style="font-size:17px;margin:0">${esc(d.was || "")}</p></section>${d.tun && d.tun.length ? `<h2>Das kannst du hier tun</h2>${list(d.tun)}` : ""}${d.tipp ? `<h2>Tipp</h2><p>${esc(d.tipp)}</p>` : ""}`;
      else body += `<h2>Überschriften auf der Seite</h2>${list(x.heads)}${x.actions.length ? `<h2>Wichtige Knöpfe und Links</h2>${list(x.actions)}` : ""}`;
    }
    if (my !== explainToken) return;
    slot.innerHTML = shell(body);
  }
  async function askProduct(qtext) {
    qtext = clean(qtext); if (!qtext) return;
    if (!hasKey()) { qa.push({ q: qtext, a: "Für Fragen braucht UMO einen API-Schlüssel." }); return renderExplainOverlay(); }
    qa.push({ q: qtext, a: "…" }); renderExplainOverlay();
    let a = "Das konnte ich gerade nicht beantworten.";
    try {
      const r = await ask(`Beantworte die Frage zu diesem Produkt in 1 bis 3 kurzen, einfachen Sätzen. Nutze nur den Seitentext. Wenn die Antwort nicht im Text steht, sag das ehrlich und nenne, wo man nachfragen kann (zum Beispiel beim Kundenservice des Shops).
${needsLine()}
Produkt: """${clean(document.querySelector("h1")?.innerText || document.title)}"""
Seitentext:
"""${visibleText(7000)}"""
Frage: """${qtext.slice(0, 300)}"""
Antworte nur mit JSON: {"antwort":"..."}`, { maxTokens: 400 });
      if (r && r.antwort) a = String(r.antwort);
    } catch (e) { a = errText(e).replace(/<[^>]+>/g, ""); }
    qa[qa.length - 1].a = a; renderExplainOverlay();
  }

  /* ---------- reader ---------- */
  let explainLevel = {}, explainCache = {}, simpCache = {}, summaryCache = null, snackCache = {};
  let readerToken = 0;
  async function renderReader() {
    const slot = $("#reader");
    if (!readerModes()) { slot.innerHTML = ""; snackStop(); return; }
    if (M.product || M.explainPage) return renderExplainOverlay();
    if (!page.article && !lazyDone) {
      slot.innerHTML = `<div class="reader"><div class="rbody"><div class="thinking" style="color:#000"><span class="dots"><i></i><i></i><i></i></span> Ich lade den Artikel und seine Grafiken …</div></div></div>`;
      await prepareLazy();
    }
    const art = getArticle();
    if (!art) { slot.innerHTML = ""; ["summary", "simplify", "structure", "snack"].forEach(k => M[k] = false); toast("Auf dieser Seite finde ich keinen Artikeltext."); renderLauncher(); return; }
    const my = ++readerToken;
    const pills = [];
    if (M.simplify) pills.push(["einfach", "Einfach Modus"]);
    if (M.snack) pills.push(["snack", "Snack Modus"]);
    const keep = slot.querySelector(".reader")?.scrollTop || 0;
    slot.innerHTML = `<div class="reader${M.simplify && M.structure && hasKey() ? " leicht" : ""}" role="dialog" aria-label="UMO Leseansicht">
      <div class="rbar"><span class="site">${esc(art.site)}</span><button class="pill" data-act="reader-close">Zur Seite</button></div>
      <div class="rbody"><h1 id="rTitle">${esc(art.title)}</h1>${art.byline ? `<p class="byline">${esc(art.byline)}</p>` : ""}
        <div class="modes">${pills.map(p => `<button class="mpill" data-act="open" data-view="${p[0]}"><span class="dot"></span>${p[1]}</button>`).join("")}${M.simplify && !M.snack && hasKey() ? `<span class="lvl" role="group" aria-label="Sprache wählen"><button data-act="lvl" data-level="einfach" aria-pressed="${!M.structure}" title="Für alle, die schnell verstehen wollen. Nach DIN 8581-1.">Einfache Sprache</button><button data-act="lvl" data-level="sehr" aria-pressed="${!!M.structure}" title="Für Menschen mit Lernschwierigkeiten. Nach DIN SPEC 33429.">Leichte Sprache</button></span>` : ""}${!M.snack ? `<button class="mpill ghost" data-act="read">Vorlesen</button>` : ""}</div>
        <div id="rSummary"></div><div id="rMain"></div><div id="rGloss"></div>
        <p class="ainote" style="margin-top:28px">UMO-Leseansicht von ${esc(location.href.slice(0, 80))}. <button data-act="reader-close">Original anzeigen</button></p>
      </div></div>`;
    slot.querySelector(".reader").scrollTop = keep;
    if (M.summary || M.simplify && !M.snack) loadSummary(my);
    if (M.snack) return startSnack(my);
    snackStop();
    renderBlocks(null);
    if (M.simplify && hasKey()) await simplify(my);
  }
  const textBlocks = () => page.article.blocks.filter(b => ["p", "h", "list", "q"].includes(b.type) && !b.synthetic);
  function renderBlocks(simp, pendingIds) {
    const main = $("#rMain"); if (!main) return;
    const lv = level(), simple = M.simplify || M.structure;
    let html = "";
    if (simple) html += `<p class="ainote">${lv === "struktur" ? (hasKey() ? "Originaltext, in kurze Punkte aufgeteilt." : "Ohne KI-Schlüssel zeigt UMO den Originaltext in kurzen Punkten. <button data-act=\"options\">Schlüssel eintragen</button>") : (lv === "sehr" ? "Eine KI hat diesen Text in Leichte Sprache übertragen.<br>Menschen mit Lern·schwierigkeiten haben den Text nicht geprüft.<br>Unter jedem Absatz steht der Original·text." : "Von einer KI in Einfache Sprache übertragen, nach DIN 8581-1. Unter jedem Absatz steht der Originaltext. Eine KI kann Fehler machen.")}</p>`;
    if (M.simplify && simp && simp.error) html += `<div class="err">${simp.error}</div>`;
    for (const b of page.article.blocks) {
      if (b.type === "img" || b.type === "graphic") { html += figureHTML(b); continue; }
      let t = b.text;
      const done = simp && simp.items && simp.items[b.id];
      if (M.simplify && done) t = simp.items[b.id];
      else if (M.simplify && pendingIds && pendingIds.has(b.id)) { html += b.type === "h" ? `<div class="skel" style="width:50%;height:22px;margin-top:26px"></div>` : `<div class="skel"></div><div class="skel"></div><div class="skel" style="width:70%"></div>`; continue; }
      else if (lv === "struktur" && simple && (b.type === "p" || b.type === "q")) t = sentences(b.text).join("\n");
      html += blockHTML(b, t, M.simplify && done && b.type !== "h");
    }
    main.innerHTML = html;
    chartRoots.add(shadow);
    for (const b of page.article.blocks) if (b.gid && CH.has(b.gid) && CH.get(b.gid).explainable) renderCbox(b.gid);
    autoExplainCharts();
  }
  function blockHTML(b, t, withOrig) {
    const lines = String(t).split(/\n+/).map(s => s.trim()).filter(Boolean);
    const leicht = M.simplify && level() === "sehr";
    let h;
    if (b.type === "h") h = `<h2>${esc(lines.join(" "))}</h2>`;
    else if (leicht && b.type !== "list") h = `<p class="ls">${lines.map(esc).join("<br>")}</p>`;
    else if (b.type === "list" || lines.length > 1) h = `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`;
    else if (b.type === "q") h = `<blockquote><p>${esc(lines[0] || "")}</p></blockquote>`;
    else h = `<p>${esc(lines[0] || "")}</p>`;
    return `<div data-b="${b.id}">${h}${withOrig ? `<details class="orig"><summary>Original</summary><div>${esc(b.text)}</div></details>` : ""}</div>`;
  }
  function figureHTML(b) {
    const st = b.gid && CH.get(b.gid);
    let media;
    if (b.type === "img") media = `<img src="${esc(b.src)}" alt="${esc(b.alt)}" loading="lazy">`;
    else if (st && (st.kind === "dw" || st.kind === "iframe") && st.src && !/^data:/.test(st.src)) {
      const u = (st.dw && st.dw.url) || st.src.replace(/[?#].*$/, "");
      media = `<iframe class="dwframe" src="${esc(u)}" title="${esc((st.dw && st.dw.title) || "Grafik")}" loading="lazy"></iframe>`;
    } else media = `<div class="ph">${esc(b.label || "Grafik")}<br>Die Grafik ist in die Seite eingebettet.</div>`;
    return `<div class="fig" data-fig="${esc(b.gid || b.id)}">${media}${b.caption ? `<p class="cap">${esc(b.caption)}</p>` : ""}
      ${b.gid && CH.has(b.gid) && CH.get(b.gid).explainable ? cboxHTML(b.gid, false) : ""}
      ${b.gid && b.type === "graphic" ? `<div class="acts"><button class="mpill ghost" data-act="show-on-page" data-gid="${esc(b.gid)}">Auf der Seite zeigen</button></div>` : ""}</div>`;
  }

  /* ---------- Erklärbox für Grafiken (Leseansicht und Originalseite) ---------- */
  function cboxHTML(gid, inline, theme) {
    const st = CH.get(gid);
    return `<div class="cbox${inline ? " inline " + (theme || "t-light") : " t-reader"}" data-cbox="${esc(gid)}">${inline ? `<button class="cpill" data-act="cx-toggle" data-gid="${esc(gid)}" aria-expanded="${!!st.open}"><span class="dot"></span><span class="cpl">${st.open ? "Erklärung ausblenden" : "Grafik einfach erklärt"}</span></button>` : ""}<div class="cbody"${inline && !st.open ? " hidden" : ""}></div></div>`;
  }
  function parseCSV(text) {
    const lines = String(text).replace(/\r/g, "").split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    const d = lines[0].includes("\t") ? "\t" : lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
    const row = l => { const out = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(c => c.trim()); };
    const rows = lines.slice(0, 60).map(row);
    rows[0] = rows[0].map(h => /^X\.\d+$/.test(h) ? "" : h);
    return rows;
  }
  function tableHTML(rows) {
    if (!rows.length) return "";
    return `<div class="tw"><table><thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c === "#NV" ? "–" : c)}</td>` : `<th scope="row">${esc(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const defaultLevel = () => M.structure ? "kurz" : "lang";
  const num = v => { const t = String(v || "").replace(/[%€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); const n = parseFloat(t); return Number.isFinite(n) ? n : null; };
  const lv2 = st => st.level || defaultLevel();
  function cbodyHTML(st) {
    const lv = st.level || defaultLevel();
    const x = st.exp[lv], dw = st.dw;
    let h = `<div class="chead"><p class="ctitle">${dw && dw.title ? esc(dw.title) : "Einfach erklärt"}</p>
      <span class="cseg" role="group" aria-label="Länge der Erklärung"><button data-act="cx-level" data-gid="${st.gid}" data-level="kurz" aria-pressed="${lv === "kurz"}">Kurz</button><button data-act="cx-level" data-gid="${st.gid}" data-level="lang" aria-pressed="${lv === "lang"}">Ausführlich</button></span></div>`;
    if (st.loading) h += `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span> ${esc(st.loading)}</div>`;
    else if (x) {
      h += `<div class="ckern"><span class="dot"></span><p>${esc(x.kern)}</p><button class="cplay" data-act="cx-read" data-gid="${st.gid}" aria-label="Vorlesen">${ICON.play}</button></div>`;
      if (lv === "lang" && x.einfach && x.einfach.length) h += `<div class="ctext">${x.einfach.map(t => `<p>${esc(t)}</p>`).join("")}</div>`;
      if (x.beispiel) h += `<div class="cbsp"><p class="cbsph"><span aria-hidden="true">💡</span>Zum Beispiel</p><p>${esc(x.beispiel)}</p></div>`;
    } else if (st.err) h += `<p class="cerr">${st.err}</p>`;
    else h += `<div class="crow"><button class="cbtn on" data-act="cx-explain" data-gid="${st.gid}">Einfach erklären</button></div>`;
    if (dw && dw.csv) { const rows = parseCSV(dw.csv); if (rows.length > 1) h += `<details class="ctab"><summary>Genaue Zahlen nachlesen</summary>${tableHTML(rows)}</details>`; }
    if (dw && dw.source) h += `<p class="cmeta">Quelle: ${esc(dw.source)}</p>`;
    const fr = x && x.fragen ? x.fragen.slice(0, 2) : [];
    h += `<div class="caskcard"><p class="caskh">${ICON.wave}<span>Frag mich etwas dazu</span></p>
      ${st.qa.length ? `<div class="cqa">${st.qa.map(m => `<p class="cq me">${esc(m.q)}</p><p class="cq bot">${esc(m.a)}</p>`).join("")}</div>` : ""}
      ${fr.length && !st.qa.length ? `<div class="csugg">${fr.map(f => `<button data-act="cx-sugg" data-gid="${st.gid}">${esc(f)}</button>`).join("")}</div>` : ""}
      <div class="cask"><button class="round cmic" data-act="cx-mic" data-gid="${st.gid}" aria-label="Frage sprechen">${ICON.wave}</button><input data-qin="${st.gid}" type="text" placeholder="${esc(fr[0] ? "z. B. " + fr[0] : "z. B. Was heißt das für mich?")}" aria-label="Deine Frage"><button class="csend" data-act="cx-ask" data-gid="${st.gid}" aria-label="Frage senden">${ICON.next}</button></div>
      <p class="cwarn">Ich antworte nur mit dem, was hier zu sehen ist.</p></div>`;
    return h;
  }
  function renderCbox(gid) {
    const st = CH.get(gid); if (!st) return;
    for (const root of chartRoots) root.querySelectorAll(`[data-cbox="${gid}"]`).forEach(box => {
      const body = box.querySelector(".cbody"); const pill = box.querySelector(".cpill");
      if (pill) { pill.setAttribute("aria-expanded", String(!!st.open)); pill.querySelector(".cpl").textContent = st.open ? "Erklärung ausblenden" : "Grafik einfach erklärt"; body.hidden = !st.open; }
      const keep = body.querySelector("input[data-qin]")?.value || "";
      body.innerHTML = cbodyHTML(st);
      if (keep) body.querySelector("input[data-qin]").value = keep;
    });
  }
  async function ensureChartData(st) {
    if (st.el && st.el.isConnected) { st.src = st.el.src || st.src; if (st.el.tagName === "IFRAME" && isDwSrc(st.src)) st.kind = "dw"; }
    if (st.kind === "dw" && !st.dw && !st.dwErr) { const r = await send({ type: "umo-dw", src: st.src }); if (r.ok) st.dw = r.data; else st.dwErr = r.error; }
  }
  const lvText = lv => lv === "kurz" ? "sehr einfacher Sprache mit sehr kurzen Sätzen. Halte dich sehr kurz" : "einfacher Sprache";
  function dwContext(st) {
    const d = st.dw;
    return `Titel der Grafik: "${d.title}"\nBeschreibung: "${d.intro}"\nHinweis: "${d.notes}"\nQuelle: "${d.source}"\nDiagrammtyp: ${d.type}\nDaten der Grafik (CSV, genau so, wie die Grafik sie zeigt):\n"""\n${d.csv.slice(0, 8000)}\n"""`;
  }
  function schemaText(lv) {
    return `Antworte nur mit JSON:
{"kern":"Das Wichtigste in einem Satz, höchstens 12 Wörter",
 "einfach":${lv === "kurz" ? "[]" : '["2 bis 3 sehr kurze Sätze: Was bedeutet das? Was ist daran wichtig?"]'},
 "beispiel":"Ein Beispiel aus dem Alltag, das die Zahlen greifbar macht. Beginne mit „Stell dir vor“. Höchstens 2 kurze Sätze. Leer lassen, wenn kein gutes Beispiel passt.",
 "fragen":["zwei kurze Fragen, die sich ein Mensch dazu stellen würde, z. B. Was heißt das für mich? Keine Fragen dazu, wie etwas dargestellt ist."]}`;
  }
  async function explainChart(gid) {
    const st = CH.get(gid); if (!st || st.loading) return;
    const lv = st.level || defaultLevel();
    if (st.exp[lv]) return renderCbox(gid);
    st.err = ""; st.loading = "Ich schaue mir die Grafik an …"; renderCbox(gid);
    await ensureChartData(st);
    if (!hasKey()) { st.loading = ""; st.err = errText({ code: "no_key" }) + (st.dw && st.dw.csv ? " Die Zahlen siehst du unten als Tabelle." : ""); return renderCbox(gid); }
    const art = page.article ? page.article.title : document.title;
    try {
      let r;
      if (st.dw && st.dw.csv) {
        r = await ask(`Du bist UMO. Eine Person liest den Artikel "${art}" auf ${HOST}. Sie sieht eine Infografik und versteht sie nicht gut. Erkläre ihr in einfachen Worten, was die Zahlen bedeuten. ${lv === "kurz" ? "Ganz kurz." : "Etwas ausführlicher, aber immer noch einfach."}
Hier sind die Zahlen hinter der Infografik:
${dwContext(st)}
${TONE}
${M.simplify && M.structure ? RULES_LEICHT : ""}
Nutze nur diese Zahlen. Erfinde nichts. Ist etwas unklar, lass es weg.
${needsLine()}
${schemaText(lv)}`, { maxTokens: 700 });
      } else {
        if (!st.image) { st.loading = "Ich mache ein Bild von der Grafik …"; renderCbox(gid); st.image = await captureGraphic(gid); }
        r = await ask(`Du bist UMO. Eine Person liest den Artikel "${art}" auf ${HOST}. Sie sieht das angehängte Bild, vermutlich eine Infografik, und versteht es nicht gut. Erkläre ihr in einfachen Worten, was es zeigt und bedeutet. ${lv === "kurz" ? "Ganz kurz." : "Etwas ausführlicher, aber immer noch einfach."}
${TONE}
${M.simplify && M.structure ? RULES_LEICHT : ""}
Nutze nur Zahlen, die du sicher lesen kannst. Erfinde nichts. Ist es ein Foto ohne Zahlen, sag in einem Satz, was zu sehen ist, und lass den Rest leer.
${needsLine()}
${schemaText(lv)}`, { image: st.image, maxTokens: 700 });
      }
      const str = v => Array.isArray(v) ? v.join(" ") : String(v || "");
      st.exp[lv] = { kern: str(r.kern), einfach: (Array.isArray(r.einfach) ? r.einfach : r.einfach ? [r.einfach] : []).map(String).filter(Boolean).slice(0, 3),
        beispiel: str(r.beispiel), fragen: (Array.isArray(r.fragen) ? r.fragen : []).map(String).slice(0, 2) };
    } catch (e) { hostEl.style.visibility = ""; st.err = e.code === "capture" ? "Ich konnte die Grafik nicht aufnehmen." : e.code === "gone" ? "Die Grafik ist auf der Seite nicht mehr da." : errText(e); st.lastErr = true; }
    st.loading = ""; renderCbox(gid);
  }
  async function askChart(gid, q, viaVoice) {
    const st = CH.get(gid); q = clean(q); if (!st || !q) return;
    st.qa.push({ q, a: "…" }); renderCbox(gid);
    let a;
    if (!hasKey()) a = "Für Fragen braucht UMO einen API-Schlüssel. Du findest ihn in den Einstellungen.";
    else {
      try {
        await ensureChartData(st);
        const hist = st.qa.slice(0, -1).slice(-4).map(m => `Frage: ${m.q}\nAntwort: ${m.a}`).join("\n");
        const useData = st.dw && st.dw.csv;
        if (!useData && !st.image) st.image = await captureGraphic(gid);
        const r = await ask(`Du bist UMO. Eine Person liest den Artikel "${page.article ? page.article.title : document.title}" auf ${HOST} und hat eine Frage zu einer Infografik darin. Antworte in 1 bis 3 kurzen Sätzen. Wenn es hilft, nimm ein kleines Beispiel aus dem Alltag.
${useData ? "Die Zahlen hinter der Infografik:\n" + dwContext(st) : "Die Infografik ist als Bild angehängt."}
${hist ? "Bisheriges Gespräch:\n" + hist : ""}
${TONE}
Antworte nur mit dem, was die Infografik zeigt. Weißt du etwas nicht, sag freundlich und ehrlich, dass es hier nicht zu sehen ist.
${needsLine()}
Frage zur Grafik: """${q.slice(0, 300)}"""
Antworte nur mit JSON: {"antwort":"..."}`, { image: useData ? undefined : st.image, maxTokens: 400 });
        a = String(r.antwort || "Darauf habe ich keine Antwort gefunden.");
      } catch (e) { hostEl.style.visibility = ""; a = errText(e).replace(/<[^>]+>/g, ""); }
    }
    st.qa[st.qa.length - 1].a = a; renderCbox(gid);
    if (viaVoice || cfg.needs && /vorlesen/i.test(cfg.needs)) speak(a);
  }
  let autoRunning = false;
  async function autoExplainCharts() {
    if (autoRunning) return; autoRunning = true;
    try {
      const gids = page.article ? page.article.blocks.filter(b => b.gid && CH.has(b.gid) && CH.get(b.gid).explainable).map(b => b.gid) : [];
      for (const gid of gids) {
        if (!readerModes() || !M.simplify) break;
        const st = CH.get(gid);
        await ensureChartData(st); renderCbox(gid);
        if (hasKey() && st.kind === "dw" && st.dw && st.dw.csv) await explainChart(gid);
      }
    } finally { autoRunning = false; }
  }
  /* Erklärboxen direkt auf der Originalseite */
  const inlineHosts = [];
  function attachInline() {
    markGraphics();
    const root = articleRoot();
    for (const [gid, st] of CH) {
      if (!st.el || !st.el.isConnected || !root.contains(st.el) || st.inlineHost || !st.explainable) continue;
      const anchor = st.el.closest("figure, .iframe-container, [class*='chart' i], [class*='embed' i]") || st.el;
      const host = document.createElement("umo-inline");
      host.style.cssText = "all:initial;display:block;margin:12px 0 20px;";
      const sr = host.attachShadow({ mode: "open" });
      if (UMO_SHEET) sr.adoptedStyleSheets = [UMO_SHEET];
      sr.innerHTML = `<div class="u">${cboxHTML(gid, true, isDarkBg(anchor) ? "t-dark" : "t-light")}</div>`;
      sr.addEventListener("click", e => onClick(e, sr));
      sr.addEventListener("keydown", e => onKey(e, sr));
      anchor.after(host);
      st.inlineHost = host; inlineHosts.push(host); chartRoots.add(sr);
      renderCbox(gid);
    }
    if (!inlineHosts.length) toast("Auf dieser Seite finde ich keine Grafiken.");
  }
  function isDarkBg(el) {
    for (let n = el; n; n = n.parentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      if (m && (m[4] === undefined || +m[4] > 0.5)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.45;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches && !getComputedStyle(document.documentElement).backgroundColor.match(/255, 255, 255/);
  }
  function detachInline() {
    inlineHosts.splice(0).forEach(h => { chartRoots.delete(h.shadowRoot); h.remove(); });
    for (const st of CH.values()) st.inlineHost = null;
  }

  async function simplify(my) {
    const lv = level();
    const key = lv + "|" + cfg.needs;
    const cache = simpCache[key] = simpCache[key] || { items: {}, glossary: null };
    const todo = textBlocks().filter(b => !cache.items[b.id]);
    const pending = new Set(todo.map(b => b.id));
    renderBlocks(cache, pending);
    if (!todo.length) return renderGloss(cache);
    if (!hasKey()) { pending.clear(); renderBlocks({ items: {}, error: errText({ code: "no_key" }) + " Bis dahin siehst du den Originaltext." }); return; }
    const batches = []; let cur = [], len = 0;
    for (const b of todo) { if (cur.length && (len + b.text.length > 2600 || cur.length >= 12)) { batches.push(cur); cur = []; len = 0; } cur.push(b); len += b.text.length; }
    if (cur.length) batches.push(cur);
    const rules = lv === "sehr" ? RULES_LEICHT : RULES_EINFACH;
    for (let bi = 0; bi < batches.length; bi++) {
      if (my !== readerToken || !M.simplify) return;
      const batch = batches[bi], first = bi === 0 && !cache.glossary;
      try {
        const r = await ask(`Du bist UMO. Du überträgst Teile eines Artikels von ${HOST} in ${lv === "sehr" ? "Leichte Sprache" : "Einfache Sprache"}.
${rules}
Inhalt: Bleib genau bei den Fakten aus dem Text. Erfinde nichts dazu. Bewerte nichts, was der Text nicht bewertet. Namen, Daten und die Bedeutung von Zahlen bleiben richtig.
Form: Überschriften (type "h") bleiben kurz, höchstens 6 Wörter. Listen (type "list") bleiben Listen, ein Punkt pro Zeile.
${needsLine()}
Titel des Artikels: """${page.article.title}"""
Teile als JSON: ${JSON.stringify(batch.map(b => ({ id: b.id, type: b.type, text: b.text })))}
Antworte nur mit JSON: {${first ? '"title":"einfacher Titel",' : ""}"items":[{"id":"...","text":"..."}]${first ? ',"glossary":[{"word":"...","explanation":"ein kurzer, einfacher Satz"}]' : ""}}
Gib für jede id genau einen Eintrag zurück.${first ? ` glossary: 3 bis 6 schwere Wörter aus dem Original, jeweils mit einer Erklärung in ${lv === "sehr" ? "Leichter Sprache, höchstens 2 kurze Sätze" : "Einfacher Sprache, ein kurzer Satz"}.` : ""}`, { maxTokens: 4000 });
        (r.items || []).forEach(it => { if (it && it.id && typeof it.text === "string") cache.items[it.id] = it.text; });
        if (first) { cache.glossary = Array.isArray(r.glossary) ? r.glossary.filter(g => g && g.word && g.explanation) : []; if (r.title) cache.title = String(r.title); }
      } catch (e) {
        batch.forEach(b => pending.delete(b.id));
        if (my === readerToken) renderBlocks({ items: cache.items, error: errText(e, "retry-reader") }, pending);
        return;
      }
      batch.forEach(b => { pending.delete(b.id); if (!cache.items[b.id]) cache.items[b.id] = b.text; });
      if (my !== readerToken || !M.simplify) return;
      renderBlocks(cache, pending);
      if (cache.title && $("#rTitle")) $("#rTitle").textContent = cache.title;
    }
    renderGloss(cache);
  }
  function renderGloss(cache) {
    const g = $("#rGloss"); if (!g) return;
    if (cache.title && $("#rTitle")) $("#rTitle").textContent = cache.title;
    g.innerHTML = cache.glossary && cache.glossary.length ? `<section class="gloss"><h3>Schwere Wörter einfach erklärt</h3><dl>${cache.glossary.map(x => `<dt>${esc(x.word)}</dt><dd>${esc(x.explanation)}</dd>`).join("")}</dl></section>` : "";
  }
  async function loadSummary(my) {
    const box = $("#rSummary"); if (!box) return;
    box.innerHTML = `<section class="summary" aria-live="polite"><h3><span class="dot"></span>Das Wichtigste in Kürze</h3><div class="thinking" style="padding:4px 0"><span class="dots"><i></i><i></i><i></i></span></div></section>`;
    let pts = summaryCache && summaryCache.needs === cfg.needs && summaryCache.lv === level() ? summaryCache.pts : null, note = "";
    if (!pts) {
      if (hasKey()) {
        try {
          const text = textBlocks().map(b => b.text).join("\n").slice(0, 14000);
          const r = await ask(`Fasse diesen Artikel von ${HOST} in genau 3 kurzen Punkten zusammen. Je Punkt ein Satz. Bleib bei den Fakten, erfinde nichts, bewerte nichts.
${langRules()}
${needsLine()}
Titel: """${page.article.title}"""
Artikel:
${text}
Antworte nur mit JSON: {"points":["...","...","..."]}`, { maxTokens: 500 });
          pts = (r.points || []).slice(0, 4).map(String);
          summaryCache = { needs: cfg.needs, lv: level(), pts };
        } catch (e) { note = errText(e, "retry-reader"); }
      } else note = errText({ code: "no_key" });
      if (!pts || !pts.length) { pts = textBlocks().filter(b => b.type === "p").slice(0, 3).map(b => sentences(b.text)[0]); note = (note ? note + " " : "") + "Bis dahin: die ersten Sätze des Artikels."; }
    }
    if (my !== readerToken || !$("#rSummary")) return;
    $("#rSummary").innerHTML = `<section class="summary"><h3><span class="dot"></span>Das Wichtigste in Kürze</h3><ul>${pts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>${note ? `<p class="ainote" style="color:#aaa;margin:10px 0 0">${note}</p>` : ""}</section>`;
  }

  /* ---------- explain graphics ---------- */
  async function captureGraphic(gid) {
    const el = document.querySelector(`[data-umo-gid="${gid}"]`);
    if (!el) throw { code: "gone" };
    const prevScroll = scrollY;
    hostEl.style.visibility = "hidden";
    el.scrollIntoView({ block: "center", behavior: "instant" });
    await sleep(700);
    const r = el.getBoundingClientRect();
    const rect = { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)) };
    const res = await send({ type: "umo-capture", rect, dpr: devicePixelRatio || 1 });
    hostEl.style.visibility = "";
    scrollTo({ top: prevScroll, behavior: "instant" });
    if (!res.ok) throw { code: "capture", error: res.error };
    return res.image;
  }
  async function renderExplain(b) {
    const key = b.gid || b.id;
    const fig = shadow.querySelector(`[data-fig="${CSS.escape(key)}"]`); if (!fig) return;
    const slot = fig.querySelector(".xslot");
    const lv = explainLevel[key];
    if (!lv) { slot.innerHTML = ""; return; }
    const tabs = `<div class="xtabs" role="group" aria-label="Länge der Erklärung"><button data-act="xlevel" data-key="${esc(key)}" data-level="lang" aria-pressed="${lv === "lang"}">Lange Erklärung</button><button data-act="xlevel" data-key="${esc(key)}" data-level="kurz" aria-pressed="${lv === "kurz"}">Kurze Erklärung</button></div>`;
    const ck = key + "|" + lv + "|" + cfg.needs;
    if (!explainCache[ck]) {
      slot.innerHTML = `<div class="explain">${tabs}<div class="thinking" style="padding:4px 0"><span class="dots"><i></i><i></i><i></i></span> Ich schaue mir die Grafik an …</div></div>`;
      if (!hasKey()) { slot.innerHTML = `<div class="err">${errText({ code: "no_key" })}</div>`; return; }
      try {
        const image = await captureGraphic(b.gid);
        const r = await ask(`Du bist UMO. Du siehst einen Ausschnitt aus einer Website (${HOST}), vermutlich eine Grafik, Tabelle oder ein Bild aus dem Artikel "${page.article.title}".${b.caption ? ` Bildunterschrift: "${b.caption}".` : ""}
Erkläre sie für Menschen mit kognitiven Einschränkungen in ${lv === "kurz" ? "sehr einfacher Sprache mit sehr kurzen Sätzen. Halte dich sehr kurz" : "einfacher Sprache"}.
Regeln: Lies Zahlen nur ab, wenn sie klar lesbar sind, und gib sie genau wieder. Erfinde nichts. Bewerte nichts politisch. Wenn es ein Foto ohne Daten ist, beschreibe nur kurz, was zu sehen ist, und lass die anderen Felder leer.
${needsLine()}
Antworte nur mit JSON: {"was":"1 bis 2 Sätze: Was zeigt das Bild?","lesen":["Wie lese ich die Grafik?"],"bedeuten":["Was bedeuten die Zahlen?"],"fazit":["2 bis 3 sehr kurze Sätze"],"unsicher":false}`, { image, maxTokens: 1200 });
        explainCache[ck] = { was: String(r.was || ""), lesen: r.lesen || [], bedeuten: r.bedeuten || [], fazit: r.fazit || [], unsicher: !!r.unsicher };
      } catch (e) {
        hostEl.style.visibility = "";
        slot.innerHTML = `<div class="err">${e.code === "capture" ? "Ich konnte die Grafik nicht aufnehmen." : e.code === "gone" ? "Die Grafik ist auf der Seite nicht mehr da." : errText(e)}</div>`; return;
      }
      if (!explainLevel[key]) return;
    }
    const x = explainCache[ck], list = a => a.length ? `<ul>${a.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : "";
    slot.innerHTML = `<div class="explain" role="region" aria-label="Erklärung">${tabs}<h4>Was zeigt die Grafik?</h4><p>${esc(x.was)}</p>
      ${x.lesen.length ? `<h4>Wie lese ich die Zahlen?</h4>${list(x.lesen)}` : ""}${x.bedeuten.length ? `<h4>Was bedeuten die Zahlen?</h4>${list(x.bedeuten)}` : ""}${x.fazit.length ? `<h4>Zusammenfassung</h4>${list(x.fazit)}` : ""}
      <p class="warn">${x.unsicher ? "Die Grafik war schwer zu lesen. Prüfe die Zahlen im Original." : "Von KI erklärt. Prüfe wichtige Zahlen im Original."}</p></div>`;
  }

  /* ---------- snack ---------- */
  const S = { data: null, idx: 0, sent: 0, playing: false, t: 0, tick: null, step: null, token: 0 };
  async function startSnack(my) {
    const main = $("#rMain");
    main.innerHTML = `<div class="player"><div class="thinking" role="status"><span class="dots"><i></i><i></i><i></i></span> Ich packe den Artikel in kleine Snacks …</div></div>`;
    const key = (M.simplify || M.structure) + "|" + cfg.needs;
    let note = "";
    if (!snackCache[key]) {
      let d = null;
      if (hasKey()) {
        try {
          const text = textBlocks().map(b => (b.type === "h" ? "## " : "") + b.text).join("\n").slice(0, 16000);
          const r = await ask(`Du bist UMO. Teile diesen Artikel von ${HOST} in 4 bis 6 kleine Snacks für Menschen, die sich schwer lange konzentrieren können (zum Beispiel mit ADHS). Jeder Snack hat einen kurzen Titel (höchstens 5 Wörter) und 2 bis 3 kurze Sätze. ${M.simplify || M.structure ? "Schreib in einfacher Sprache." : ""}
Regeln: Bleib bei den Fakten. Erfinde nichts. Bewerte nichts. Behalte wichtige Zahlen genau.
${needsLine()}
Titel: """${page.article.title}"""
Artikel:
${text}
Antworte nur mit JSON: {"snacks":[{"title":"...","text":"..."}]}`, { maxTokens: 1500 });
          d = (r.snacks || []).filter(s => s && s.title && s.text).slice(0, 6);
        } catch (e) { note = errText(e, "retry-reader") + " Bis dahin zeigt der Snack Modus den Originaltext in kleinen Stücken."; }
      }
      if (!d || d.length < 2) {
        const ps = textBlocks().filter(b => b.type !== "h"); d = []; let cur = [], words = 0;
        for (const b of ps) { cur.push(b.text); words += b.text.split(" ").length; if (words > 70) { d.push(cur.join(" ")); cur = []; words = 0; } if (d.length >= 8) break; }
        if (cur.length && d.length < 8) d.push(cur.join(" "));
        d = d.map((t, i) => ({ title: "Teil " + (i + 1), text: t }));
        if (!note && !hasKey()) note = "Ohne KI zeigt der Snack Modus den Originaltext in kleinen Stücken.";
      }
      snackCache[key] = { d, note, failed: hasKey() && !!note };
    }
    if (my !== readerToken || !M.snack) return;
    S.data = snackCache[key].d; S.note = snackCache[key].note || note; S.idx = 0; S.sent = 0; S.t = 0;
    renderSnack();
  }
  function snackStop() { S.playing = false; S.token++; clearInterval(S.tick); clearTimeout(S.step); (S.steps || []).forEach(clearTimeout); S.steps = []; stopSpeak(); }
  function snackPlay() {
    const sents = sentences(S.data[S.idx].text);
    if (S.sent >= sents.length) S.sent = 0;
    S.playing = true; const my = ++S.token;
    clearInterval(S.tick); S.tick = setInterval(() => { S.t++; const t = $("#ptime"); if (t) t.textContent = Math.floor(S.t / 60) + ":" + pad2(S.t % 60); }, 1000);
    const go = () => {
      if (my !== S.token) return;
      if (S.sent >= sents.length) { S.playing = false; clearInterval(S.tick); renderSnack(); return; }
      renderSnack();
      const adv = () => { if (my !== S.token) return; S.sent++; go(); };
      if (!(canSpeak && utter(sents[S.sent], adv))) S.step = setTimeout(adv, Math.max(2200, sents[S.sent].split(" ").length * 380));
    };
    stopSpeak(); S.steps = [];
    if (useEleven()) {
      // Ganzen Snack in einem Stück mit Amy vorlesen, Sätze im Takt der Audiodauer hervorheben
      const base = S.sent, rest = sents.slice(base), total = rest.reduce((n, x) => n + x.length, 0) || 1;
      renderSnack();
      utter(rest.join(" "), () => { if (my !== S.token) return; S.sent = sents.length; S.playing = false; clearInterval(S.tick); renderSnack(); },
        dur => { if (my !== S.token || !dur) return; let acc = 0; rest.forEach((x, i) => { const at = acc / total * dur * 1000; acc += x.length; if (i) S.steps.push(setTimeout(() => { if (my === S.token) { S.sent = base + i; renderSnack(); } }, at)); }); });
      return;
    }
    go();
  }
  function renderSnack() {
    const main = $("#rMain"); if (!main || !S.data) return;
    const n = S.data.length, c = S.data[S.idx], sents = sentences(c.text);
    const progress = Math.min(1, S.sent / sents.length), done = S.sent >= sents.length;
    main.innerHTML = `${S.note ? `<div class="err">${S.note}</div>` : ""}<div class="player" role="region" aria-label="Snack ${S.idx + 1} von ${n}">
      <div class="phead"><h2>Snack ${pad2(S.idx + 1)}</h2><span>${S.idx + 1} von ${n}</span></div>
      <p class="stitle">${esc(c.title)}</p>
      <div class="lyrics"><div class="lyr" id="lyr">${sents.map((s, i) => `<span class="${i < S.sent ? "past" : i === S.sent ? "now" : ""}">${esc(s)}</span>`).join("")}</div></div>
      <div class="pctrl"><button class="round dark" data-act="s-prev" aria-label="Vorheriger Snack" ${S.idx === 0 ? "disabled" : ""}>${ICON.prev}</button>
      <button class="round" data-act="s-play" aria-label="${S.playing ? "Pause" : "Abspielen"}">${S.playing ? ICON.pause : ICON.play}</button>
      <button class="round dark" data-act="s-next" aria-label="Nächster Snack" ${S.idx === n - 1 ? "disabled" : ""}>${ICON.next}</button></div>
      <time class="ptime" id="ptime">${Math.floor(S.t / 60)}:${pad2(S.t % 60)}</time>
      ${waveSVG(progress, "#ffffff", "#2f323a", "#FF541B", S.idx + 1)}</div>
      <div class="snackfoot">${done && S.idx < n - 1 ? `<button class="pill" data-act="s-next">Nächster Snack</button>` : ""}<button class="pill light" data-act="s-full">Ganzen Artikel lesen</button></div>`;
    const inner = $("#lyr"), cur = inner && inner.children[Math.min(S.sent, sents.length - 1)];
    if (cur) inner.style.transform = `translateY(${-Math.max(0, cur.offsetTop - 140)}px)`;
  }

  /* ---------- Fokus: kompakte Zusammenfassung im Look der Website ----------
     Übernimmt Logo, Schriften, Farben und Titelbild der Seite. Kapitel mit fetten Zahlen
     und, wenn sinnvoll, einem einfachen Vergleich (nach dem Figma-Design „Deine Zusammenfassung“). */
  let fpCache = null;
  const rgbOf = c => { const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m && (m[4] === undefined || +m[4] > 0.5) ? [+m[1], +m[2], +m[3]] : null; };
  const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
  function brand() {
    const cs = el => getComputedStyle(el);
    let bg = null;
    for (const el of [document.body, document.documentElement, document.querySelector("main"), document.querySelector("#__next, #app, #root")]) { if (el && (bg = rgbOf(cs(el).backgroundColor))) break; }
    bg = bg || [255, 255, 255];
    const dark = lum(bg) < 0.45;
    const h1 = document.querySelector("h1") || document.body, para = document.querySelector("article p, main p, p") || document.body;
    // Akzentfarbe: theme-color, sonst die häufigste kräftige Farbe von Knöpfen und Links
    let accent = null;
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) { const d = document.createElement("div"); d.style.color = tc.content; document.body.appendChild(d); const c = rgbOf(cs(d).color); d.remove(); if (c && sat(c) > 0.3) accent = c; }
    if (!accent) {
      const count = new Map();
      [...document.querySelectorAll("button, a, [class*=btn], [class*=button], header, nav")].slice(0, 400).forEach(el => {
        if (el.closest("umo-root,umo-inline")) return;
        const st = cs(el);
        for (const c of [rgbOf(st.backgroundColor), el.tagName === "A" ? rgbOf(st.color) : null]) {
          if (!c || sat(c) < 0.35 || lum(c) < 0.08 || lum(c) > 0.92) continue;
          const k = c.join(","); count.set(k, (count.get(k) || 0) + 1);
        }
      });
      const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
      if (best) accent = best[0].split(",").map(Number);
    }
    accent = accent || [255, 84, 27];
    // Logo
    let logo = "";
    const cand = [...document.querySelectorAll('header img, header svg, [class*=logo] img, [class*=logo] svg, img[alt*=logo i], a[href="/"] img, a[href="/"] svg')]
      .filter(el => !el.closest("umo-root") && el.getBoundingClientRect().width > 20 && el.getBoundingClientRect().width < 360 && el.getBoundingClientRect().height < 140);
    const lg = cand[0];
    if (lg && lg.tagName === "IMG" && (lg.currentSrc || lg.src)) logo = `<img src="${esc(lg.currentSrc || lg.src)}" alt="">`;
    else if (lg && lg.tagName.toLowerCase() === "svg") { const c = lg.cloneNode(true); c.querySelectorAll("script, foreignObject").forEach(x => x.remove()); c.removeAttribute("class"); c.setAttribute("height", "28"); c.style.width = "auto"; c.style.color = dark ? "#fff" : "#000"; logo = c.outerHTML; }
    const site = (document.querySelector('meta[property="og:site_name"]') || {}).content || HOST.replace(/^www\./, "");
    let hero = (document.querySelector('meta[property="og:image"]') || {}).content || "";
    if (!hero) { const im = [...document.querySelectorAll("main img, article img, img")].find(i => !i.closest("umo-root") && i.naturalWidth >= 500); if (im) hero = im.currentSrc || im.src; }
    const fg = dark ? [255, 255, 255] : [17, 17, 17];
    const surf = bg.map((v, i) => Math.round(v * 0.9 + fg[i] * 0.1));
    return { bg: css(bg), fg: css(fg), surf: css(surf), accent: css(accent), onAccent: lum(accent) > 0.6 ? "#111" : "#fff", dark,
      head: cs(h1).fontFamily, body: cs(para).fontFamily, logo, site, hero };
  }
  function pageImages() {
    return [...document.querySelectorAll("main img, [class*=gallery] img, [class*=product] img, img")]
      .filter(i => !i.closest("umo-root,umo-inline,header,footer,nav") && i.naturalWidth >= 400 && i.getBoundingClientRect().width >= 200)
      .map(i => i.currentSrc || i.src).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 4);
  }
  function mainAction() {
    return [...document.querySelectorAll("a, button, [role=button], input[type=submit]")].find(b => !b.closest("umo-root") && b.getBoundingClientRect().width > 0 &&
      /in den warenkorb|zum warenkorb|in die tasche|add to (cart|bag|basket)|jetzt kaufen|kaufen|bestellen|probefahrt|termin|anmelden|registrieren|kontakt|beantragen|buchen/i.test(b.innerText || b.value || b.getAttribute("aria-label") || ""));
  }
  function focusSourceText() {
    if (page.type === "artikel") { const a = getArticle(); if (a) return { title: a.title, text: textBlocks().map(b => (b.type === "h" ? "## " : "") + b.text).join("\n") }; }
    const main = document.querySelector("main, [role=main], article") || document.body;
    const clone = main.cloneNode(true); clone.querySelectorAll("script,style,nav,footer,umo-root,umo-inline,iframe,noscript").forEach(x => x.remove());
    return { title: (document.querySelector("h1") || {}).innerText || document.title, text: (clone.innerText || "").replace(/\n{3,}/g, "\n\n") };
  }
  async function openFocusPage() {
    closeLayer(); stopSpeak();
    const b = brand(), src = focusSourceText(), act = mainAction(), imgs = page.type === "produkt" ? pageImages() : [];
    const st = `--fb:${b.bg};--ff:${b.fg};--fs:${b.surf};--fa:${b.accent};--fon:${b.onAccent};--fh:${b.head};--fbody:${b.body}`;
    const shell = inner => `<div class="fpage${b.dark ? " fdark" : ""}" style="${esc(st)}" role="dialog" aria-modal="true" aria-label="Deine Zusammenfassung">
      <header class="fbar"><span class="flogo">${b.logo || `<b>${esc(b.site)}</b>`}</span><button class="fclose" data-act="close">Zur Seite</button></header>
      <div class="fscroll">${inner}</div></div>`;
    const heroHTML = (title, lead) => `<section class="fhero"${b.hero ? ` style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.75)),url('${esc(b.hero)}')"` : ""}>
      <span class="fpill"><i></i>Deine Zusammenfassung</span><h1>${esc(title)}</h1>${lead ? `<p>${esc(lead)}</p>` : ""}</section>`;
    $("#layer").innerHTML = shell(heroHTML(src.title, "") + `<div class="fload"><span class="dots"><i></i><i></i><i></i></span> Ich fasse die Seite für dich zusammen …</div>`);
    $(".fclose").focus();
    let d = fpCache && fpCache.href === location.href && fpCache.needs === cfg.needs ? fpCache.d : null;
    if (!d && hasKey()) {
      try {
        d = await ask(`Du bist UMO. Mach aus dieser Seite (${TYPE_LABEL[page.type]} auf ${HOST}) eine kompakte Zusammenfassung für Menschen, die sich schwer lange konzentrieren können, zum Beispiel mit ADHS.
${RULES_EINFACH}
Aufbau: 2 bis 4 Kapitel. Das Wichtigste zuerst. Jedes Kapitel hat einen kurzen Titel mit 1 bis 3 Wörtern und einem Punkt am Ende, zum Beispiel „Das Wichtigste.“ oder „Technische Details.“. Jedes Kapitel hat genau eine Form:
- "punkte": 2 bis 4 kurze Sätze.
- "zahlen": 2 bis 5 wichtige Zahlen genau aus dem Text. wert ist kurz und mit Einheit, zum Beispiel „184 PS“ oder „22,6 %“. label sagt in 1 bis 3 Wörtern, was es ist.
- "vergleich": nur wenn der Text 3 bis 6 gleichartige Zahlen mit derselben Einheit nennt, die man gut vergleichen kann. zahl ist eine reine Zahl, anzeige ist die Zahl mit Einheit.
Nimm nur Zahlen, die wirklich im Text stehen. Erfinde nichts. Bewerte nichts. Keine Zahlen ohne Bedeutung, zum Beispiel keine Telefonnummern oder Artikelnummern.
naechster: Nur bei Produkt, Shop oder Website: was man als Nächstes tun kann, in 2 bis 5 Wörtern, zum Beispiel „Probefahrt vereinbaren“. Bei Artikeln leer.
${needsLine()}
Titel: """${src.title}"""
Text:
"""${src.text.slice(0, 14000)}"""
Antworte nur mit JSON: {"titel":"kurzer Titel, höchstens 8 Wörter","einleitung":"ein Satz","kapitel":[{"titel":"...","form":"punkte","punkte":["..."]},{"titel":"...","form":"zahlen","zahlen":[{"wert":"...","label":"..."}]},{"titel":"...","form":"vergleich","vergleich":{"einheit":"...","items":[{"label":"...","zahl":0,"anzeige":"..."}]}}],"naechster":""}`, { maxTokens: 1800 });
        fpCache = { href: location.href, needs: cfg.needs, d };
      } catch (e) { if ($(".fpage")) $(".fload").outerHTML = `<p class="cerr fpad">${errText(e, "focus-page")}</p>`; return; }
    }
    if (!$(".fpage")) return;
    if (!d) {
      // Ohne KI: Überschriften und Beschreibung der Seite
      const desc = (document.querySelector('meta[name="description"]') || {}).content || "";
      const hs = [...document.querySelectorAll("main h2, article h2, h2")].filter(h => !h.closest("umo-root")).map(h => h.innerText.trim()).filter(Boolean).slice(0, 5);
      d = { titel: src.title, einleitung: desc, kapitel: hs.length ? [{ titel: "Auf dieser Seite.", form: "punkte", punkte: hs }] : [], naechster: act ? (act.innerText || "").trim().slice(0, 40) : "", ohneKi: true };
    }
    const kap = (Array.isArray(d.kapitel) ? d.kapitel : []).slice(0, 4);
    const extra = [];
    if (imgs.length) extra.push({ titel: "Bilder.", form: "bilder" });
    if (d.naechster && act) extra.push({ titel: "Nächster Schritt.", form: "cta" });
    const all = [...kap, ...extra], n = all.length;
    const chapter = (k, i) => {
      let body = "";
      if (k.form === "zahlen") body = `<div class="fcard fnums">${(k.zahlen || []).slice(0, 5).map(z => `<div class="fnum"><span>${esc(z.label)}</span><b>${esc(z.wert)}</b></div>`).join("")}</div>`;
      else if (k.form === "vergleich" && k.vergleich && Array.isArray(k.vergleich.items)) {
        const it = k.vergleich.items.filter(x => Number.isFinite(+x.zahl)).slice(0, 6), mx = Math.max(...it.map(x => Math.abs(+x.zahl))) || 1;
        body = `<div class="fcard fcmp" role="img" aria-label="${esc(it.map(x => x.label + " " + x.anzeige).join(", "))}">${it.map(x => `<div class="fcrow"><span class="fcl">${esc(x.label)}</span><b>${esc(x.anzeige)}</b><span class="fcbar${+x.zahl < 0 ? " neg" : ""}"><i style="width:${Math.max(2, Math.abs(+x.zahl) / mx * 100).toFixed(1)}%"></i></span></div>`).join("")}</div>`;
      }
      else if (k.form === "bilder") body = `<div class="fimgs">${imgs.slice(0, 2).map(u => `<img src="${esc(u)}" alt="">`).join("")}</div>`;
      else if (k.form === "cta") body = `<div class="fcard fcta"><p>${esc(d.naechster)}</p><button data-act="fp-cta">${esc((act.innerText || act.value || "Weiter").trim().slice(0, 40))}</button></div>`;
      else body = `<div class="fcard"><ul class="fpts">${(k.punkte || []).slice(0, 4).map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
      return `<section class="fsec"><div class="fsh"><h2>${esc(k.titel)}</h2><span>${i + 1}/${n}</span></div>${body}</section>`;
    };
    $("#layer").innerHTML = shell(heroHTML(d.titel || src.title, d.einleitung) + all.map(chapter).join("") +
      `<p class="fnote">${d.ohneKi ? "Ohne KI-Schlüssel zeigt UMO nur die Überschriften der Seite. <button data-act='options'>Schlüssel eintragen</button>" : "Von einer KI zusammengefasst. Wichtige Angaben bitte auf der Seite prüfen."}</p>`);
    $(".fclose").focus();
  }
  function focusCta() {
    const a = mainAction(); closeLayer();
    if (!a) return;
    a.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    a.style.outline = "4px solid #FF541B"; a.style.outlineOffset = "4px"; setTimeout(() => { a.style.outline = ""; a.style.outlineOffset = ""; }, 4000);
    try { a.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- calming breath ----------
     Ein Lichtkreis atmet mit: 4 Sekunden größer werden (einatmen), 6 Sekunden kleiner (ausatmen).
     Weiche Farbverläufe, keine springenden Zahlen. Bei „Bewegung reduzieren“ nur Text. */
  let breathT, breathRun = 0, blobRAF = 0;
  // Flüssige Blase: Radius an 9 Punkten schwankt langsam (überlagerte Sinuswellen), weich verbunden
  function blobPath(t, r, wob) {
    const N = 9, pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      const k = 1 + wob * (Math.sin(t * 0.0009 + i * 1.7) * 0.55 + Math.sin(t * 0.0013 + i * 2.9) * 0.3 + Math.sin(t * 0.0005 + i * 0.8) * 0.15);
      pts.push([100 + Math.cos(a) * r * k, 100 + Math.sin(a) * r * k]);
    }
    let d = "";
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      if (!i) d = `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d + "Z";
  }
  function openBreath() {
    stopSpeak(); if (!M.calmPage) setMode("calmPage", true);
    const my = ++breathRun, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#layer").innerHTML = `<div class="calmwrap" role="dialog" aria-modal="true" aria-labelledby="calmT">
      <div class="sky" aria-hidden="true"><i class="au a1"></i><i class="au a2"></i><i class="au a3"></i><i class="au a4"></i>${Array.from({ length: 14 }, (_, i) => `<b class="mote" style="left:${(i * 71) % 100}%;animation-delay:-${(i * 3.7) % 26}s;animation-duration:${22 + (i * 5) % 14}s"></b>`).join("")}</div>
      <button class="close" data-act="close">Schließen</button>
      <div class="calmcard" id="calmCard"><h2 id="calmT">Atemübung</h2>
        <p class="instr" id="instr" aria-live="polite">Mach es dir bequem. Atme mit der Blase.</p>
        <div class="orbwrap" aria-hidden="true">
          <svg class="bubble" id="bubble" viewBox="0 0 200 200">
            <defs>
              <radialGradient id="bg1" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFF6FB"/><stop offset=".35" stop-color="#F3C9FF"/><stop offset=".7" stop-color="#C08BFF"/><stop offset="1" stop-color="#8E5BEA"/></radialGradient>
              <linearGradient id="bg2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FFB38F" stop-opacity=".55"/><stop offset="1" stop-color="#FF8FC7" stop-opacity="0"/></linearGradient>
              <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
            </defs>
            <path id="bGlow" fill="#C47BFF" opacity=".55" filter="url(#soft)"/>
            <path id="bBody" fill="url(#bg1)"/>
            <path id="bTint" fill="url(#bg2)"/>
            <ellipse id="bShine" cx="78" cy="70" rx="20" ry="11" fill="#fff" opacity=".5"/>
          </svg>
          <span class="phase" id="phase"></span>
        </div>
        <div class="rounds" id="rounds" aria-hidden="true">${[0, 1, 2, 3].map(() => "<i></i>").join("")}</div>
        <div class="calmacts"><button class="sound" data-act="sound" aria-pressed="${M.sound}">${ICON.phones}<span>Ruhige Klänge</span></button></div>
      </div></div>`;
    const card = $("#calmCard"), instr = $("#instr"), phase = $("#phase"), rounds = $("#rounds");
    const glow = $("#bGlow"), body = $("#bBody"), tint = $("#bTint"), shine = $("#bShine");
    // Größe folgt dem Atem (weich interpoliert), die Form fließt ständig
    let size = 0.62, target = 0.62, rate = 0.0006, last = performance.now();
    cancelAnimationFrame(blobRAF);
    const frame = now => {
      if (my !== breathRun || !$("#bubble")) return;
      const dt = Math.min(64, now - last); last = now;
      size += (target - size) * (1 - Math.exp(-dt * rate));
      const r = 74 * size, w = still ? 0 : 0.06 + (1 - size) * 0.05;
      const sx = 100 - r * 0.38 + Math.sin(now * 0.0007) * r * 0.03, sy = 100 - r * 0.46;
      shine.setAttribute("cx", sx.toFixed(1)); shine.setAttribute("cy", sy.toFixed(1)); shine.setAttribute("rx", (r * 0.26).toFixed(1)); shine.setAttribute("ry", (r * 0.13).toFixed(1));
      shine.setAttribute("transform", `rotate(-30 ${sx.toFixed(1)} ${sy.toFixed(1)})`);
      body.setAttribute("d", blobPath(now, r, w)); tint.setAttribute("d", blobPath(now + 4000, r * 0.98, w * 1.2)); glow.setAttribute("d", blobPath(now + 9000, r * 1.08, w));
      blobRAF = requestAnimationFrame(frame);
    };
    blobRAF = requestAnimationFrame(frame);
    const ROUNDS = 4;
    const swell = (to, sec) => { if (audio) { try { const g = audio.master.gain, t = audio.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + sec); } catch (e) {} } };
    const setText = (el, t) => { el.classList.add("fade"); setTimeout(() => { el.textContent = t; el.classList.remove("fade"); }, 350); };
    const step = (round, inhale) => {
      if (my !== breathRun || !$("#bubble")) return;
      if (round >= ROUNDS) {
        card.className = "calmcard done"; target = 0.7; rate = 0.0004; setText(phase, ""); setText(instr, "Gut gemacht. Lass dir Zeit, bevor du weiterliest.");
        swell(0.6, 4); return;
      }
      card.className = "calmcard " + (inhale ? "inhale" : "exhale");
      target = inhale ? 1 : 0.62; rate = inhale ? 0.0011 : 0.0007;
      setText(phase, inhale ? "Einatmen" : "Ausatmen");
      if (round === 0 && inhale) setText(instr, "Atme langsam durch die Nase ein, während die Blase wächst.");
      if (round === 0 && !inhale) setText(instr, "Und ganz langsam wieder aus.");
      if (round === 1 && inhale) setText(instr, "Gut so. Ganz in deinem Tempo.");
      [...rounds.children].forEach((d, i) => d.classList.toggle("on", i <= round));
      swell(inhale ? 1 : 0.45, inhale ? 4 : 6);
      breathT = setTimeout(() => step(inhale ? round : round + 1, !inhale), inhale ? 4000 : 6000);
    };
    clearTimeout(breathT);
    card.className = "calmcard rest";
    breathT = setTimeout(() => step(0, true), 2400);
    $(".calmwrap .close").focus();
  }

  /* ---------- events ---------- */
  function onClick(e, root) {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act;
    switch (a) {
      case "launch": openSheet(); break;
      case "close": closeLayer(); $("#launch").focus(); break;
      case "tab": openSheet(b.dataset.view || undefined); break;
      case "open": openSheet(b.dataset.view); break;
      case "options": send({ type: "umo-options" }); break;
      case "needs": openSheet("needs"); break;
      case "all": {
        const v = b.dataset.view, on = !modeOn(v);
        tiles(v).forEach(([k]) => { if (k === "guide" || k === "charts") { if (!on) setMode(k, false); } else setMode(k, on); });
        if (on && (v === "einfach" || v === "snack")) { closeLayer(); break; }
        openSheet(v); break;
      }
      case "sub": {
        const k = b.dataset.k, on = !M[k];
        setMode(k, on);
        if (k === "guide" && on) { openSheet("guide"); break; }
        if (on && ["summary", "simplify", "structure", "snack", "product", "explainPage", "charts"].includes(k)) { closeLayer(); break; }
        openSheet(ui.view); break;
      }
      case "suggest": {
        const v = b.dataset.view;
        if (v === "calm") { openBreath(); break; }
        tiles(v).forEach(([k]) => { if (k !== "guide" && k !== "sound" && k !== "structure" && k !== "charts") setMode(k, true); });
        closeLayer(); toast(INFO[v].title + " ist an."); break;
      }
      case "breath": openBreath(); break;
      case "focus-page": openFocusPage(); break;
      case "fp-cta": focusCta(); break;
      case "sound": setMode("sound", !M.sound); b.setAttribute("aria-pressed", String(M.sound)); break;
      case "hide-site": cfg.hiddenSites = [...new Set([...(cfg.hiddenSites || []), HOST])]; chrome.storage.local.set({ hiddenSites: cfg.hiddenSites }); ui.visible = false; closeLayer(); renderLauncher(); break;
      case "chip": sendNeed(b.textContent); break;
      case "chat-send": sendNeed($("#chatIn").value); break;
      case "chat-text": ui.chatMode = "text"; openSheet("needs"); break;
      case "chat-voice": ui.chatMode = "voice"; openSheet("needs"); listen(shadow.querySelector('[data-act="chat-voice"]'), t => sendNeed(t), () => { ui.chatMode = "text"; openSheet("needs"); }); break;
      case "needs-clear": cfg.needs = ""; chrome.storage.local.set({ needs: "" }); ui.chat = []; openSheet("needs"); break;
      case "g-go": guideGo($("#gIn").value); break;
      case "g-mic": listen(b, t => { $("#gIn").value = t; guideGo(t); }); break;
      case "g-ans": { const q = G.questions[G.qi], i = +b.dataset.i; G.answers.push({ q: q.text, a: i < 0 ? "egal" : q.options[i] }); G.qi++; if (G.qi < G.questions.length) openSheet("guide"); else guidePicks(); break; }
      case "g-show": { const p = G.picks[+b.dataset.i]; if (p && p.el && p.el.isConnected) { closeLayer(); p.el.scrollIntoView({ block: "center", behavior: "smooth" }); } break; }
      case "g-view": { closeLayer(); const f = document.querySelector("[data-umo-pick]") || page.products.find(p => !p.item.dataset.umoHide)?.el; if (f) f.scrollIntoView({ block: "center", behavior: "smooth" }); break; }
      case "g-all": clearShape(); G.step = "ask"; break;
      case "g-restart": clearShape(); G.step = "ask"; G.wish = ""; G.error = ""; openSheet("guide"); break;
      case "diag": $(".diag") ? $(".diag").remove() : $(".foot").insertAdjacentHTML("beforebegin", diagHTML()); break;
      case "reader-close": ["summary", "simplify", "structure", "snack", "product", "explainPage"].forEach(k => M[k] = false); snackStop(); renderReader(); renderLauncher(); break;
      case "read": {
        if (isSpeaking()) { stopSpeak(); break; }
        const txt = [$("#rTitle")?.textContent, ...$$("#rSummary li").map(x => x.textContent), ...$$("#rMain [data-b] h2, #rMain [data-b] > p, #rMain [data-b] li, #rMain [data-b] blockquote").map(x => x.textContent), ...(M.product || M.explainPage ? $$("#rMain p, #rMain li, #rMain h2").map(x => x.textContent) : [])].filter(Boolean).join(". ");
        speak(txt.slice(0, 30000)); break;
      }
      case "cx-toggle": { const st = CH.get(b.dataset.gid); st.open = !st.open; renderCbox(st.gid); if (st.open && !st.exp[st.level || defaultLevel()]) { ensureChartData(st).then(() => { renderCbox(st.gid); if (hasKey()) explainChart(st.gid); }); } break; }
      case "cx-explain": explainChart(b.dataset.gid); break;
      case "cx-level": { const st = CH.get(b.dataset.gid); st.level = b.dataset.level; explainChart(st.gid); break; }
      case "cx-read": { const st = CH.get(b.dataset.gid), x = st.exp[st.level || defaultLevel()]; if (isSpeaking()) { stopSpeak(); break; } if (x) speak([x.kern, ...(lv2(st) === "lang" ? x.einfach || [] : []), x.beispiel].filter(Boolean).map(t => /[.!?]$/.test(t.trim()) ? t.trim() : t.trim() + ".").join(" ")); break; }
      case "cx-sugg": askChart(b.dataset.gid, b.textContent, false); break;
      case "cx-ask": { const inp = b.closest(".cbox").querySelector("[data-qin]"); const q = inp.value; inp.value = ""; askChart(b.dataset.gid, q, false); break; }
      case "cx-mic": { stopSpeak(); listen(b, t => askChart(b.dataset.gid, t, true)); break; }
      case "explain": { const key = b.dataset.key, blk = page.article.blocks.find(x => (x.gid || x.id) === key); explainLevel[key] = explainLevel[key] ? null : (M.simplify && M.structure ? "kurz" : "lang"); b.textContent = explainLevel[key] ? "Erklärung ausblenden" : "Grafik erklären"; renderExplain(blk); break; }
      case "xlevel": { const key = b.dataset.key; explainLevel[key] = b.dataset.level; renderExplain(page.article.blocks.find(x => (x.gid || x.id) === key)); break; }
      case "show-on-page": { const el = document.querySelector(`[data-umo-gid="${b.dataset.gid}"]`); if (el) { ["summary", "simplify", "structure", "snack"].forEach(k => M[k] = false); renderReader(); renderLauncher(); el.scrollIntoView({ block: "center" }); } break; }
      case "s-play": if (S.playing) { snackStop(); renderSnack(); } else snackPlay(); break;
      case "s-next": if (S.idx < S.data.length - 1) { snackStop(); S.idx++; S.sent = 0; S.t = 0; renderSnack(); snackPlay(); } break;
      case "s-prev": if (S.idx > 0) { snackStop(); S.idx--; S.sent = 0; S.t = 0; renderSnack(); } break;
      case "s-full": setMode("snack", false); break;
      case "qa-send": askProduct($("#qaIn").value); break;
      case "lvl": M.structure = b.dataset.level === "sehr"; for (const st of CH.values()) { st.level = null; st.exp = {}; } renderReader(); break;
      case "focus-page-retry": openFocusPage(); break;
      case "retry-reader": {
        for (const k of Object.keys(snackCache)) if (snackCache[k].failed) delete snackCache[k];
        if (summaryCache === null || summaryCache && !summaryCache.pts) summaryCache = null;
        explainData = null; renderReader(); break;
      }
    }
  }
  function onKey(e, root) {
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.qin) { e.preventDefault(); const q = e.target.value; e.target.value = ""; askChart(e.target.dataset.qin, q, false); e.stopPropagation(); return; }
    if (e.key === "Enter" && e.target.id === "chatIn") { e.preventDefault(); sendNeed(e.target.value); }
    if (e.key === "Enter" && e.target.id === "gIn") { e.preventDefault(); guideGo(e.target.value); }
    if (e.key === "Enter" && e.target.id === "qaIn") { e.preventDefault(); askProduct(e.target.value); }
    if (e.key === "Escape") { if ($("#layer").children.length) { closeLayer(); $("#launch").focus(); } else if (readerModes()) onClick({ target: { closest: () => ({ dataset: { act: "reader-close" } }) } }); }
    e.stopPropagation();
  }

  /* ---------- init ---------- */
  async function init() {
    const s = await chrome.storage.local.get(["apiKey", "needs", "hiddenSites", "showLauncher", "elevenKey", "voiceEngine", "voiceName", "voiceRate"]);
    Object.assign(cfg, { apiKey: s.apiKey || "", needs: s.needs || "", hiddenSites: s.hiddenSites || [], showLauncher: s.showLauncher !== false, elevenKey: s.elevenKey || "",
      voiceEngine: s.voiceEngine || "system", voiceName: s.voiceName || "", voiceRate: s.voiceRate || 0.9 });
    ui.visible = cfg.showLauncher && !cfg.hiddenSites.includes(HOST);
    try {
      const css = await (await fetch(chrome.runtime.getURL("content/umo.css"))).text();
      const sheet = new CSSStyleSheet(); sheet.replaceSync(css); shadow.adoptedStyleSheets = [sheet]; UMO_SHEET = sheet;
    } catch (e) { return; }
    for (const w of [400, 600, 700]) {
      try { const buf = await (await fetch(chrome.runtime.getURL(`fonts/figtree-${w}.woff2`))).arrayBuffer(); const f = new FontFace("UMO Figtree", buf, { weight: String(w) }); await f.load(); document.fonts.add(f); } catch (e) {}
    }
    shadow.innerHTML = `<div class="u"><div id="reader"></div><button class="launcher" id="launch" data-act="launch" aria-haspopup="dialog"><span class="dot" aria-hidden="true"></span><span id="lbl">Modus</span></button><div id="shapebar"></div><div id="layer"></div><div class="toast" id="toast" role="status" hidden></div></div>`;
    shadow.addEventListener("click", e => onClick(e, shadow));
    shadow.addEventListener("keydown", e => onKey(e, shadow));
    document.documentElement.appendChild(hostEl);
    analyse(); renderLauncher();
    setTimeout(() => { analyse(); renderLauncher(); }, 2500);
    chrome.storage.local.get(["justUpdated"]).then(({ justUpdated: j }) => {
      if (j && !j.shown && Date.now() - j.at < 864e5 && j.to === chrome.runtime.getManifest().version) {
        toast(`UMO wurde auf Version ${j.to} aktualisiert.`);
        chrome.storage.local.set({ justUpdated: Object.assign({}, j, { shown: true }) });
      }
    });
    resumePending();
    let lastHref = location.href;
    setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; page.article = null; explainData = null; analyse(); renderLauncher(); resumePending(); } }, 1000);
    chrome.storage.onChanged.addListener(ch => {
      if (ch.apiKey) cfg.apiKey = ch.apiKey.newValue || "";
      if (ch.elevenKey) cfg.elevenKey = ch.elevenKey.newValue || "";
      for (const k of ["voiceEngine", "voiceName", "voiceRate"]) if (ch[k]) cfg[k] = ch[k].newValue;
      if (ch.needs) cfg.needs = ch.needs.newValue || "";
      if (ch.showLauncher) { cfg.showLauncher = ch.showLauncher.newValue !== false; ui.visible = cfg.showLauncher && !cfg.hiddenSites.includes(HOST); renderLauncher(); }
    });
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === "umo-toggle") {
        ui.visible = !ui.visible;
        if (ui.visible && cfg.hiddenSites.includes(HOST)) { cfg.hiddenSites = cfg.hiddenSites.filter(h => h !== HOST); chrome.storage.local.set({ hiddenSites: cfg.hiddenSites }); }
        if (!ui.visible) closeLayer();
        renderLauncher();
        if (ui.visible) openSheet();
      }
    });
  }
  init();
})();
