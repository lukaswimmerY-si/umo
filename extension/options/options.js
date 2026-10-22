const $ = id => document.getElementById(id);
const st = $("st");
function status(text, ok) { st.textContent = text; st.className = "status " + (ok ? "ok" : "bad"); }
async function load() {
  const s = await chrome.storage.local.get(["apiKey", "model", "needs", "showLauncher", "hiddenSites"]);
  $("key").value = s.apiKey || "";
  $("model").value = s.model || "claude-haiku-5-5";
  $("needs").value = s.needs || "";
  $("show").checked = s.showLauncher !== false;
  renderHidden(s.hiddenSites || []);
}
function renderHidden(list) {
  const el = $("hidden");
  el.innerHTML = "";
  if (!list.length) { el.textContent = "Keine Seiten."; return; }
  list.forEach(h => {
    const b = document.createElement("button");
    b.className = "ghost"; b.style.cssText = "margin:0 6px 6px 0;padding:6px 12px;font-size:13px";
    b.textContent = h + " wieder zeigen";
    b.onclick = async () => { const s = await chrome.storage.local.get("hiddenSites"); const next = (s.hiddenSites || []).filter(x => x !== h); await chrome.storage.local.set({ hiddenSites: next }); renderHidden(next); };
    el.appendChild(b);
  });
}
$("save").onclick = async () => {
  await chrome.storage.local.set({ apiKey: $("key").value.trim(), model: $("model").value });
  status("Gespeichert.", true);
};
$("test").onclick = async () => {
  await chrome.storage.local.set({ apiKey: $("key").value.trim(), model: $("model").value });
  status("Teste …", true);
  chrome.runtime.sendMessage({ type: "umo-ai", prompt: 'Antworte nur mit JSON: {"ok":true}', maxTokens: 20 }, r => {
    if (r && r.ok) status("Verbindung steht.", true);
    else status({ no_key: "Bitte zuerst einen Schlüssel eintragen.", bad_key: "Der Schlüssel wird nicht akzeptiert.", no_credit: "Das Guthaben des API-Kontos ist aufgebraucht.", bad_model: "Dieses Modell ist mit dem Schlüssel nicht verfügbar. Wähle ein anderes.", overloaded: "Claude ist gerade überlastet. Versuch es gleich noch einmal.", network: "Keine Verbindung zur KI." }[r && r.code] || "Fehler: " + (r && r.error || "keine Antwort"), false);
    renderErrors();
  });
};
$("saveNeeds").onclick = async () => { await chrome.storage.local.set({ needs: $("needs").value.trim() }); status("", true); $("saveNeeds").textContent = "Gespeichert"; setTimeout(() => $("saveNeeds").textContent = "Speichern", 1500); };
$("show").onchange = () => chrome.storage.local.set({ showLauncher: $("show").checked });
load();

const fmtTime = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "";
async function renderUpdate() {
  const m = chrome.runtime.getManifest();
  const { updateInfo: u, justUpdated: j } = await chrome.storage.local.get(["updateInfo", "justUpdated"]);
  const st = $("upState"), dt = $("upDetail");
  if (m.update_url) { st.textContent = `Version ${m.version}. Updates kommen automatisch über den Chrome Web Store.`; st.className = "status ok"; dt.textContent = ""; return; }
  const fresh = j && Date.now() - j.at < 864e5 ? ` Zuletzt aktualisiert von ${j.from} auf ${j.to}.` : "";
  if (!u || u.state === "unconfigured") { st.textContent = `Version ${m.version}.`; st.className = "status"; dt.textContent = "Für diese Version ist keine Update-Adresse hinterlegt. Versionen aus dem GitHub-Release bringen sie automatisch mit." + fresh; return; }
  if (u.state === "available") { st.textContent = `Version ${m.version}. Neue Version ${u.latest} ist verfügbar.`; st.className = "status bad"; dt.innerHTML = `Mit dem UMO-Updater kommt sie innerhalb von 15 Minuten von selbst. Ohne Updater: <a href="${u.zip}">Paket herunterladen</a>, Ordner ersetzen, dann lädt sich UMO selbst neu.${u.notes ? "<br>Neu: " + u.notes.replace(/</g, "&lt;") : ""}`; return; }
  if (u.state === "error") { st.textContent = `Version ${m.version}.`; st.className = "status"; dt.textContent = `Update-Prüfung fehlgeschlagen (${fmtTime(u.checked)}): ${u.error}`; return; }
  st.textContent = `Version ${m.version} ist aktuell.`; st.className = "status ok"; dt.textContent = `Zuletzt geprüft: ${fmtTime(u.checked)}.` + fresh;
}
chrome.runtime.sendMessage({ type: "umo-disk-version" }, r => {
  if (r && r.disk && r.disk !== r.loaded) { $("upRestart").hidden = false; $("upDetail").textContent = `Version ${r.disk} ist schon heruntergeladen und wartet auf den Neustart.`; }
});
$("upRestart").onclick = () => chrome.runtime.sendMessage({ type: "umo-restart" });
$("upCheck").onclick = () => { $("upState").textContent = "Prüfe …"; chrome.runtime.sendMessage({ type: "umo-check-update" }, () => renderUpdate()); };
chrome.storage.onChanged.addListener(ch => { if (ch.updateInfo || ch.justUpdated) renderUpdate(); });
renderUpdate();

async function renderErrors() {
  const { lastErrors = [] } = await chrome.storage.local.get("lastErrors");
  const el = $("errList");
  el.textContent = "";
  if (!lastErrors.length) { el.textContent = "Keine Fehler bisher."; return; }
  lastErrors.forEach(e => { const d = document.createElement("div"); d.style.margin = "0 0 6px"; d.textContent = `${fmtTime(e.at)} · ${e.model}: ${e.message}`; el.appendChild(d); });
}
chrome.storage.onChanged.addListener(ch => { if (ch.lastErrors) renderErrors(); });
renderErrors();

const SAMPLE = "Hallo, ich bin UMO. Ich lese dir Texte in Ruhe vor. Wenn dir etwas zu schnell geht, kannst du das Tempo ändern.";
const voiceScore = v => (/premium/i.test(v.name) ? 6 : 0) + (/erweitert|enhanced|verbessert/i.test(v.name) ? 5 : 0) + (/natural|neural|online/i.test(v.name) ? 5 : 0)
  + (/google deutsch/i.test(v.name) ? 3 : 0) + (/anna|petra|helena|katja|amala|seraphina|marlene|vicki|hedda/i.test(v.name) ? 2 : 0) + (/^de-DE/i.test(v.lang) ? 1 : 0)
  - (/grandma|grandpa|oma|opa|eddy|flo|reed|rocko|sandy|shelley|bells|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|bad news|good news|boing|albert|bahh|fred|junior|kathy|ralph|superstar|wobble/i.test(v.name) ? 10 : 0);
const vStatus = (t, ok) => { $("vSt").textContent = t; $("vSt").className = "status " + (ok ? "ok" : "bad"); };
const elStatus = (t, ok) => { $("elSt").textContent = t; $("elSt").className = "status " + (ok ? "ok" : "bad"); };
let saved = {};
function fillVoices() {
  const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
  const sel = $("vName"); sel.textContent = "";
  const auto = document.createElement("option"); auto.value = ""; auto.textContent = vs.length ? `Automatisch (jetzt: ${vs[0].name})` : "Automatisch"; sel.appendChild(auto);
  vs.forEach((v, i) => { const o = document.createElement("option"); o.value = v.name; o.textContent = v.name + (i === 0 ? " · empfohlen" : "") + (v.localService ? "" : " · braucht Internet"); sel.appendChild(o); });
  sel.value = saved.voiceName && vs.some(v => v.name === saved.voiceName) ? saved.voiceName : "";
  if (!vs.length) vStatus("Auf diesem Rechner ist keine deutsche Stimme zu finden.", false);
}
async function loadVoice() {
  saved = await chrome.storage.local.get(["elevenKey", "elevenVoice", "elevenModel", "voiceEngine", "voiceName", "voiceRate"]);
  $("vRate").value = String(saved.voiceRate || 0.9);
  $("elOn").checked = saved.voiceEngine === "eleven";
  $("elKey").value = saved.elevenKey || ""; $("elVoice").value = saved.elevenVoice || "xTXZTtb6MuzG0jJR05Y9"; $("elModel").value = saved.elevenModel || "eleven_multilingual_v2";
  fillVoices(); speechSynthesis.onvoiceschanged = fillVoices;
}
$("vTest").onclick = () => {
  speechSynthesis.cancel();
  const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
  const v = vs.find(x => x.name === $("vName").value) || vs[0];
  const u = new SpeechSynthesisUtterance(SAMPLE); if (v) { u.voice = v; u.lang = v.lang; } u.rate = +$("vRate").value;
  speechSynthesis.speak(u); vStatus(v ? "Du hörst: " + v.name : "Du hörst die Standardstimme.", true);
};
$("vSave").onclick = async () => { await chrome.storage.local.set({ voiceName: $("vName").value, voiceRate: +$("vRate").value }); vStatus("Gespeichert.", true); };
$("vName").onchange = $("vRate").onchange = () => $("vSave").click();
async function saveEleven() { await chrome.storage.local.set({ voiceEngine: $("elOn").checked ? "eleven" : "system", elevenKey: $("elKey").value.trim(), elevenVoice: $("elVoice").value.trim() || "xTXZTtb6MuzG0jJR05Y9", elevenModel: $("elModel").value }); }
$("elOn").onchange = saveEleven;
$("elSave").onclick = async () => { await saveEleven(); elStatus("Gespeichert.", true); };
$("elTest").onclick = async () => {
  await saveEleven(); elStatus("Lade Stimme …", true);
  chrome.runtime.sendMessage({ type: "umo-tts", text: SAMPLE, id: 0 }, r => {
    if (r && r.ok) elStatus("Läuft.", true);
    else elStatus(({ no_tts_key: "Bitte zuerst einen Schlüssel eintragen.", tts_bad_key: "Der Schlüssel wird nicht akzeptiert.",
      tts_voice: "Diese Stimme ist in eurem ElevenLabs-Konto nicht verfügbar.", tts_plan: "Euer ElevenLabs-Tarif erlaubt diese Stimme nicht.", tts_quota: "Das ElevenLabs-Guthaben ist aufgebraucht." }[r && r.code] || "Fehler") + (r && r.error ? " (" + r.error + ")" : ""), false);
  });
};
loadVoice();
