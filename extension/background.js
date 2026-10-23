// UMO background: holds the API key, talks to Claude, captures graphics.
const DEFAULTS = { apiKey: "", model: "claude-haiku-5-5", needs: "", hiddenSites: [], showLauncher: true, apiBase: "https://api.anthropic.com",
  elevenKey: "", elevenVoice: "xTXZTtb6MuzG0jJR05Y9", elevenModel: "eleven_multilingual_v2", elevenBase: "https://api.elevenlabs.io" };

chrome.runtime.onInstalled.addListener(async details => {
  const cur = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const set = {};
  for (const k in DEFAULTS) if (cur[k] === undefined) set[k] = DEFAULTS[k];
  await chrome.storage.local.set(set);
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "umo-toggle" }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "umo-ai") {
    callClaude(msg).then(data => sendResponse({ ok: true, data }))
      .catch(e => sendResponse({ ok: false, code: e.code || "error", error: String(e.message || e), status: e.status || 0 }));
    return true;
  }
  if (msg.type === "umo-capture") {
    capture(sender.tab, msg.rect, msg.dpr).then(img => sendResponse({ ok: true, image: img }))
      .catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg.type === "umo-options") { chrome.runtime.openOptionsPage(); }
  if (msg.type === "umo-tts") {
    speakEleven(msg.text, msg.id, sender.tab ? sender.tab.id : null).then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, code: e.code || "tts_error", error: String(e.message || e) }));
    return true;
  }
  if (msg.type === "umo-tts-stop") { chrome.runtime.sendMessage({ target: "umo-offscreen", type: "stop" }).catch(() => {}); return false; }
  if ((msg.type === "umo-tts-ended" || msg.type === "umo-tts-started") && msg.tabId) { chrome.tabs.sendMessage(msg.tabId, msg).catch(() => {}); return false; }
  if (msg.type === "umo-dw") {
    (/23degrees\.io/i.test(msg.src) ? fetch23degrees(msg.src) : fetchDatawrapper(msg.src)).then(data => sendResponse({ ok: true, data })).catch(e => sendResponse({ ok: false, error: String(e.message || e) }));
    return true;
  }
  return false;
});

const SYSTEM = "Du bist UMO, ein Assistent für barrierearme Websites. Antworte ausschließlich mit einem gültigen JSON-Objekt, ohne Text davor oder danach und ohne Markdown. Verwende innerhalb von Texten keine geraden Anführungszeichen, sondern „ und “.";
const sleepMs = ms => new Promise(r => setTimeout(r, ms));
// Repariert den häufigsten Fehler: gerade Anführungszeichen innerhalb eines Textes.
// Ein " beendet einen String nur, wenn danach (nach Leerzeichen) , } ] oder : folgt.
function repairQuotes(src) {
  let out = "", inStr = false, open = true;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inStr) { out += ch; if (ch === '"') inStr = true; continue; }
    if (ch === "\\") { out += ch + (src[i + 1] || ""); i++; continue; }
    if (ch === '"') {
      let j = i + 1; while (j < src.length && /\s/.test(src[j])) j++;
      if (j >= src.length || ",}]:".includes(src[j])) { out += ch; inStr = false; }
      else { out += open ? "„" : "“"; open = !open; }
      continue;
    }
    if (ch === "\n") { out += "\\n"; continue; }
    out += ch;
  }
  return out;
}
function parseJsonLoose(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), t = clean.lastIndexOf("}");
  if (s < 0 || t < 0) throw new Error("keine JSON-Klammern");
  const body = clean.slice(s, t + 1);
  try { return JSON.parse(body); } catch (e) {}
  return JSON.parse(repairQuotes(body));
}
async function logError(entry) {
  try { const { lastErrors = [] } = await chrome.storage.local.get("lastErrors"); lastErrors.unshift(Object.assign({ at: Date.now() }, entry)); await chrome.storage.local.set({ lastErrors: lastErrors.slice(0, 8) }); } catch (e) {}
}
function classify(status, detail) {
  const d = String(detail || "").toLowerCase();
  if (status === 401 || status === 403 && /key|auth/.test(d)) return "bad_key";
  if (/credit balance|billing|insufficient/.test(d)) return "no_credit";
  if (status === 404 || /model/.test(d) && /not.?found|does not exist|invalid/.test(d)) return "bad_model";
  if (status === 429) return "rate_limited";
  if (status === 529 || /overloaded/.test(d)) return "overloaded";
  if (status >= 500) return "server";
  if (status === 413 || /too long|prompt is too long|too large/.test(d)) return "too_long";
  return "api_error";
}
async function callClaude({ prompt, image, maxTokens }) {
  const { apiKey, model, apiBase } = await chrome.storage.local.get(["apiKey", "model", "apiBase"]);
  if (!apiKey) { const e = new Error("Kein API-Schlüssel hinterlegt"); e.code = "no_key"; throw e; }
  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({ type: "text", text: prompt });
  let tokens = maxTokens || 2000, lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch((apiBase || DEFAULTS.apiBase).replace(/\/$/, "") + "/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: model || DEFAULTS.model, max_tokens: tokens, system: SYSTEM, messages: [{ role: "user", content }] })
      });
    } catch (e) {
      lastErr = Object.assign(new Error("Keine Verbindung zur KI: " + e.message), { code: "network" });
      await sleepMs(1200 * (attempt + 1)); continue;
    }
    if (!res.ok) {
      let detail = ""; try { detail = (await res.json()).error?.message || ""; } catch (_) {}
      const code = classify(res.status, detail);
      lastErr = Object.assign(new Error(`API-Fehler ${res.status}${detail ? ": " + detail : ""}`), { code, status: res.status });
      if (["rate_limited", "overloaded", "server"].includes(code) && attempt < 3) { await sleepMs([1500, 4000, 8000][attempt]); continue; }
      break;
    }
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    try { return parseJsonLoose(text); }
    catch (e) {
      lastErr = Object.assign(new Error(data.stop_reason === "max_tokens" ? "Antwort war zu lang und wurde abgeschnitten" : "Antwort war kein gültiges JSON"), { code: "bad_json", sample: text.slice(0, 200) });
      if (data.stop_reason === "max_tokens") tokens = Math.min(tokens * 2, 8000);
      if (attempt < 2) continue;
      break;
    }
  }
  await logError({ code: lastErr.code, message: lastErr.message, model: model || DEFAULTS.model, sample: lastErr.sample || "" });
  throw lastErr;
}

// Sitzungs-Bedürfnisse: chrome.storage.session gilt bis Chrome geschlossen wird; Content Scripts dürfen mitlesen
try { chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" }); } catch (e) {}

/* ElevenLabs-Stimme (Standard: Amy). Audio läuft in einem Offscreen-Dokument der Extension. */
const ttsCache = new Map();
async function elevenAudio(text) {
  const { elevenKey, elevenVoice, elevenModel, elevenBase } = await chrome.storage.local.get(["elevenKey", "elevenVoice", "elevenModel", "elevenBase"]);
  if (!elevenKey) { const e = new Error("Kein ElevenLabs-Schlüssel"); e.code = "no_tts_key"; throw e; }
  const voice = elevenVoice || DEFAULTS.elevenVoice, model = elevenModel || DEFAULTS.elevenModel;
  const key = voice + "|" + model + "|" + text;
  if (ttsCache.has(key)) return ttsCache.get(key);
  const res = await fetch(`${(elevenBase || DEFAULTS.elevenBase).replace(/\/$/, "")}/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": elevenKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: text.slice(0, 4500), model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.75, speed: 0.95 } })
  });
  if (!res.ok) {
    let d = "", st = ""; try { const j = await res.json(); st = (j.detail && j.detail.status) || ""; d = (j.detail && (j.detail.message || j.detail.status || JSON.stringify(j.detail))) || ""; } catch (_) {}
    const all = (st + " " + d).toLowerCase();
    const e = new Error(`ElevenLabs ${res.status}${d ? ": " + d : ""}`);
    e.code = /quota|credits|character limit/.test(all) ? "tts_quota"
      : /voice_not_found|voice.*not.*found|library|shared voice|add.*voice/.test(all) || res.status === 404 ? "tts_voice"
      : /paid|plan|subscription|upgrade|free users/.test(all) || res.status === 402 ? "tts_plan"
      : res.status === 401 || /invalid_api_key|api key/.test(all) ? "tts_bad_key" : "tts_error";
    await logError({ code: e.code, message: e.message, model: "ElevenLabs " + voice });
    throw e;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const url = "data:audio/mpeg;base64," + btoa(bin);
  ttsCache.set(key, url); if (ttsCache.size > 40) ttsCache.delete(ttsCache.keys().next().value);
  return url;
}
async function ensureOffscreen() {
  const has = chrome.runtime.getContexts ? (await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] })).length > 0 : false;
  if (!has) await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["AUDIO_PLAYBACK"], justification: "UMO liest Inhalte mit der gewählten Stimme vor." });
}
async function speakEleven(text, id, tabId) {
  const url = await elevenAudio(String(text || "").trim());
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ target: "umo-offscreen", type: "play", url, id, tabId });
}

/* Datawrapper-Grafiken (z. B. charts.bpb.de, datawrapper.dwcdn.net): Daten und Beschreibung direkt holen.
   Eingebettete Versionen leiten oft auf eine neuere Version weiter, der folgen wir. */
/* 23degrees (z. B. tagesschau.de): content.json + data/id/<dataId>.json, Daten im Langformat */
const quillText = q => { try { return (JSON.parse(q).ops || []).map(o => typeof o.insert === "string" ? o.insert : "").join("").replace(/\s+/g, " ").trim(); } catch (e) { return String(q || "").trim(); } };
async function fetch23degrees(src) {
  const m = new URL(src).pathname.match(/\/embed\/([^/?#]+)/);
  if (!m) throw new Error("Unbekannte 23degrees-Adresse");
  const base = `https://g-cdn.23degrees.io/${m[1]}/`;
  const c = await (await fetch(base + "content.json")).json();
  const ts = c.typeSpecific || {};
  const dataId = ts.dataId || c.dataId;
  if (!dataId) throw new Error("Keine Daten-ID");
  const rows = (await (await fetch(`${base}data/id/${dataId}.json`)).json()).data || [];
  const fields = ts.fields || {};
  const names = Object.keys(fields).sort((a, b) => (fields[a].sequence || 0) - (fields[b].sequence || 0) || a.localeCompare(b));
  const valF = names.filter(n => fields[n].fieldType === "valueField" || fields[n].dataType === "number");
  const catF = names.filter(n => !valF.includes(n));
  const title = n => fields[n] && fields[n].title || n;
  const esc = v => { const t = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? ""); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  let csv = "";
  if (catF.length >= 2 && valF.length === 1) {
    // Pivot: erste Kategorie als Zeilen, zweite als Spalten
    const [r, k] = catF, v = valF[0];
    const cols = [...new Set(rows.map(x => x[k]))], keys = [...new Set(rows.map(x => x[r]))];
    csv = [title(r), ...cols].map(esc).join(",") + "\n" + keys.map(key => [key, ...cols.map(col => { const hit = rows.find(x => x[r] === key && x[k] === col); return hit ? hit[v] : ""; })].map(esc).join(",")).join("\n");
  } else {
    const cols = [...catF, ...valF];
    csv = cols.map(n => esc(title(n))).join(",") + "\n" + rows.map(x => cols.map(n => esc(x[n])).join(",")).join("\n");
  }
  const pub = ts.data && ts.data.publisher;
  return { title: quillText(c.name) || c.fileName || "", description: quillText(c.subTitle), source: pub ? quillText(pub.name).replace(/^Quelle:\s*/i, "") : "", notes: quillText(c.description), csv, provider: "23degrees" };
}

async function fetchDatawrapper(src) {
  const u0 = new URL(src);
  let url = u0.origin + u0.pathname.replace(/\/?$/, "/");
  let props = null;
  for (let i = 0; i < 4; i++) {
    const html = await (await fetch(url, { cache: "no-store" })).text();
    const m = html.match(/__DW_SVELTE_PROPS__\s*=\s*JSON\.parse\(("(?:[^"\\]|\\.)*")\)/);
    if (m) { try { props = JSON.parse(JSON.parse(m[1])); } catch (e) {} break; }
    const red = (html.match(/http-equiv=["']?refresh["']?[^>]*url=([^"'>\s]+)/i) || html.match(/url=([^"'>\s;]+)/i) || [])[1];
    if (!red) break;
    url = new URL(red, url).href.replace(/[?#].*$/, "").replace(/\/?$/, "/");
  }
  let csv = "";
  for (const f of ["data.csv", "dataset.csv"]) {
    try {
      const r = await fetch(url + f, { cache: "no-store" });
      if (r.ok && /csv|text\/plain/i.test(r.headers.get("content-type") || "")) { csv = (await r.text()).slice(0, 20000); if (csv.trim()) break; }
    } catch (e) {}
  }
  const c = (props && props.chart) || {}, md = c.metadata || {}, d = md.describe || {}, a = md.annotate || {};
  const strip = t => String(t || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!csv && !c.title) throw new Error("Keine Daten in der Grafik gefunden");
  return { url, title: strip(c.title), type: c.type || "", intro: strip(d.intro), source: strip(d["source-name"]), notes: strip(a.notes), csv };
}

async function capture(tab, rect, dpr) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const sx = Math.max(0, Math.round(rect.x * dpr)), sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.max(1, Math.min(bmp.width - sx, Math.round(rect.w * dpr)));
  const sh = Math.max(1, Math.min(bmp.height - sy, Math.round(rect.h * dpr)));
  const scale = Math.min(1, 1568 / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { mediaType: "image/jpeg", data: btoa(bin) };
}

/* ---------- Updates ----------
   1. Liegt im Extension-Ordner eine neuere Version (vom UMO-Updater geholt), lädt sich die Extension selbst neu.
   2. Zusätzlich prüft sie die Release-Adresse aus umo-config.json und meldet neue Versionen.
   Bei Installation über den Chrome Web Store übernimmt Chrome die Updates, dann ist beides aus. */
const LOADED_VERSION = chrome.runtime.getManifest().version;
const FROM_STORE = !!chrome.runtime.getManifest().update_url;
function cmpVersion(a, b) {
  const x = String(a).split(".").map(n => parseInt(n, 10) || 0), y = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
async function diskVersion() {
  try { return (await (await fetch(chrome.runtime.getURL("manifest.json"), { cache: "no-store" })).json()).version || null; } catch (e) { return null; }
}
async function filesComplete() {
  try {
    for (const f of ["background.js", "content/umo.js", "content/umo.css", "content/readability.js", "options/options.html"]) {
      const r = await fetch(chrome.runtime.getURL(f), { cache: "no-store" });
      if (!r.ok || !(await r.text()).length) return false;
    }
    return true;
  } catch (e) { return false; }
}
async function checkDisk() {
  if (FROM_STORE) return false;
  try {
    const v = await diskVersion();
    const m = { version: v };
    if (v && cmpVersion(v, LOADED_VERSION) > 0) {
      if (!(await filesComplete())) return false; // Updater ist noch beim Kopieren
      await chrome.storage.local.set({ pendingReload: v });
      await chrome.storage.local.set({ justUpdated: { from: LOADED_VERSION, to: m.version, at: Date.now() } });
      chrome.runtime.reload();
      return true;
    }
  } catch (e) {}
  return false;
}
async function checkRemote() {
  if (FROM_STORE) return null;
  let url = "";
  try { url = (await (await fetch(chrome.runtime.getURL("umo-config.json"), { cache: "no-store" })).json()).updateManifestUrl || ""; } catch (e) {}
  const now = Date.now();
  if (!url) { await chrome.storage.local.set({ updateInfo: { state: "unconfigured", checked: now } }); return null; }
  try {
    const v = await (await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + now, { cache: "no-store" })).json();
    const newer = v && v.version && cmpVersion(v.version, LOADED_VERSION) > 0;
    await chrome.storage.local.set({ updateInfo: { state: newer ? "available" : "current", latest: v.version, notes: v.notes || "", zip: v.zip || "", checked: now } });
    chrome.action.setBadgeText({ text: newer ? "NEU" : "" });
    if (newer) chrome.action.setBadgeBackgroundColor({ color: "#FF541B" });
    return v;
  } catch (e) {
    await chrome.storage.local.set({ updateInfo: { state: "error", error: String(e.message || e), checked: now } });
    return null;
  }
}
async function updateTick() { if (!(await checkDisk())) await checkRemote(); }
chrome.alarms.create("umo-update", { periodInMinutes: 5, delayInMinutes: 0.2 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === "umo-update") updateTick(); });
chrome.runtime.onStartup.addListener(updateTick);
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "umo-restart") { chrome.runtime.reload(); return false; }
  if (msg.type === "umo-disk-version") { diskVersion().then(v => sendResponse({ disk: v, loaded: LOADED_VERSION })); return true; }
  if (msg.type === "umo-check-update") { updateTick().then(async () => sendResponse(await chrome.storage.local.get(["updateInfo"]))); return true; }
  return false;
});
