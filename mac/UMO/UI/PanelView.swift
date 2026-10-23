import SwiftUI

/// Phase 1: Anzeige „PDF verstehen“ – Aufgaben und Fristen zuerst. Skelett, Gestaltung folgt dem Figma-Design.
struct PanelView: View {
    @EnvironmentObject var model: UMOModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                switch model.phase {
                case .idle:
                    Text("Zieh ein PDF hierher oder drücke ⌥ Leertaste, wenn ein Dokument offen ist.")
                        .font(.title3)
                case .working(let note):
                    HStack(spacing: 10) { ProgressView(); Text(note) }
                case .failed(let msg):
                    Text(msg).padding().background(RoundedRectangle(cornerRadius: 20).stroke(Color.orange))
                case .pdf(let r):
                    if !r.aufgaben.isEmpty || !r.betraege.isEmpty {
                        Text("Was musst du tun?").font(.title2.bold())
                        ForEach(r.aufgaben) { t in
                            VStack(alignment: .leading, spacing: 4) {
                                if !t.bis.isEmpty { Text(t.bis).font(.title3.bold()).foregroundStyle(.orange) }
                                Text(t.was)
                                // TODO Phase 1: „Zeig mir die Stelle“ → PDFContext.find(t.zitat, in:) und markieren
                            }
                            .padding().frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 20).fill(.quaternary))
                        }
                        ForEach(r.betraege) { b in
                            HStack { Text(b.wofuer); Spacer(); Text(b.wert).font(.title3.bold()) }
                                .padding().background(RoundedRectangle(cornerRadius: 20).fill(.quaternary))
                        }
                    }
                    Text("Worum geht es?").font(.title2.bold())
                    Text(r.worum).font(.title3)
                    Text("Einfach erklärt").font(.title2.bold())
                    ForEach(Array(r.zusammenfassung.enumerated()), id: \.offset) { _, s in Text(s) }
                    if !r.hilfe.isEmpty { Text(r.hilfe).foregroundStyle(.secondary) }
                    Button("Vorlesen") { Speech.shared.speak(([r.worum] + r.aufgaben.map { "\($0.was) \($0.bis)" } + r.zusammenfassung).joined(separator: " ")) }
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(minWidth: 400, minHeight: 560)
        .onDrop(of: [.pdf, .fileURL], isTargeted: nil) { providers in
            guard let p = providers.first else { return false }
            _ = p.loadObject(ofClass: URL.self) { url, _ in
                if let url, url.pathExtension.lowercased() == "pdf" { Task { @MainActor in model.openPDF(url) } }
            }
            return true
        }
    }
}

struct SettingsView: View {
    @State private var key = Keychain.get("apiKey") ?? ""
    @AppStorage("model") private var model = "claude-sonnet-5-5"
    @State private var status = ""

    var body: some View {
        Form {
            SecureField("Claude API-Schlüssel", text: $key)
            TextField("Modell", text: $model)
            HStack {
                Button("Speichern") { Keychain.set(key.trimmingCharacters(in: .whitespaces), for: "apiKey"); status = "Gespeichert." }
                Button("Verbindung testen") {
                    Keychain.set(key.trimmingCharacters(in: .whitespaces), for: "apiKey")
                    Task {
                        do { _ = try await ClaudeClient(model: model, maxTokens: 50).ask([.text("Antworte mit {\"ok\":true}")]); status = "Verbindung steht." }
                        catch let e as ClaudeClient.Failure { status = e.message } catch { status = "Fehler." }
                    }
                }
                Text(status).foregroundStyle(.secondary)
            }
            // TODO Phase 0: Stimme (Speech.germanVoices) und Tempo, Pille, Tastenkürzel (KeyboardShortcuts.Recorder)
        }
        .padding(20).frame(width: 480)
    }
}
