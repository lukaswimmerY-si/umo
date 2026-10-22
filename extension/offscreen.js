// UMO: spielt die ElevenLabs-Stimme ab, unabhängig von den Regeln der besuchten Seite.
let audio = null;
function stop() { if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio = null; } }
chrome.runtime.onMessage.addListener(m => {
  if (m.target !== "umo-offscreen") return;
  if (m.type === "stop") { stop(); return; }
  if (m.type === "play") {
    stop();
    const a = audio = new Audio(m.url);
    const done = err => { if (audio !== a) return; audio = null; chrome.runtime.sendMessage({ type: "umo-tts-ended", id: m.id, tabId: m.tabId, error: err || "" }); };
    a.onended = () => done();
    a.onerror = () => done("Wiedergabe fehlgeschlagen");
    a.onloadedmetadata = () => chrome.runtime.sendMessage({ type: "umo-tts-started", id: m.id, tabId: m.tabId, duration: a.duration || 0 });
    a.play().catch(e => done(String(e)));
  }
});
