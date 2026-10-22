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

async function loadVoice() {
  const s = await chrome.storage.local.get(["elevenKey", "elevenVoice", "elevenModel"]);
  $("elKey").value = s.elevenKey || ""; $("elVoice").value = s.elevenVoice || "xTXZTtb6MuzG0jJR05Y9"; $("elModel").value = s.elevenModel || "eleven_multilingual_v2";
}
const elStatus = (t, ok) => { $("elSt").textContent = t; $("elSt").className = "status " + (ok ? "ok" : "bad"); };
async function saveVoice() { await chrome.storage.local.set({ elevenKey: $("elKey").value.trim(), elevenVoice: $("elVoice").value.trim() || "xTXZTtb6MuzG0jJR05Y9", elevenModel: $("elModel").value }); }
$("elSave").onclick = async () => { await saveVoice(); elStatus("Gespeichert.", true); };
$("elTest").onclick = async () => {
  await saveVoice(); elStatus("Lade Stimme …", true);
  chrome.runtime.sendMessage({ type: "umo-tts", text: "Hallo, ich bin UMO. Ich lese dir Texte und Grafiken in einfacher Sprache vor.", id: 0 }, r => {
    if (r && r.ok) elStatus("Läuft.", true);
    else elStatus(r && r.code === "no_tts_key" ? "Bitte zuerst einen Schlüssel eintragen." : r && r.code === "tts_bad_key" ? "Der Schlüssel wird nicht akzeptiert." : "Fehler: " + (r && r.error || "keine Antwort"), false);
  });
};
loadVoice();
