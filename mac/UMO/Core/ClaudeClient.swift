import Foundation

/// Spricht mit der Claude-API. Vorbild: callClaude in ../extension/background.js
/// (Wiederholungen, tolerantes JSON, klare Fehlerklassen).
struct ClaudeClient {
    enum Failure: Error, Equatable {
        case noKey, badKey, noCredit, badModel, overloaded, offline, badJSON, other(String)

        /// Freundliche Meldung für Menschen
        var message: String {
            switch self {
            case .noKey: return "Dafür braucht UMO einen API-Schlüssel. Du kannst ihn in den Einstellungen eintragen."
            case .badKey: return "Der API-Schlüssel wird nicht akzeptiert. Bitte prüfe ihn in den Einstellungen."
            case .noCredit: return "Das Guthaben des API-Kontos ist aufgebraucht."
            case .badModel: return "Das gewählte Modell ist mit diesem Schlüssel nicht verfügbar. Wähle in den Einstellungen ein anderes."
            case .overloaded: return "Claude ist gerade überlastet. Ich habe es mehrmals versucht. Versuch es gleich noch einmal."
            case .offline: return "Keine Verbindung zum Internet."
            case .badJSON: return "Die Antwort war unvollständig. Versuch es bitte noch einmal."
            case .other(let s): return "Etwas hat nicht geklappt: \(s)"
            }
        }
    }

    enum Part { case text(String), pdf(Data), png(Data) }

    static let system = "Du bist UMO, ein Assistent für verständliche Inhalte. Antworte ausschließlich mit einem gültigen JSON-Objekt, ohne Text davor oder danach und ohne Markdown. Verwende innerhalb von Texten keine geraden Anführungszeichen, sondern „ und “."

    var model: String
    var maxTokens = 3000
    var endpoint = URL(string: "https://api.anthropic.com/v1/messages")!

    func ask(_ parts: [Part]) async throws -> [String: Any] {
        guard let key = Keychain.get("apiKey"), !key.isEmpty else { throw Failure.noKey }
        var content: [[String: Any]] = []
        for p in parts {
            switch p {
            case .text(let t): content.append(["type": "text", "text": t])
            case .pdf(let d): content.append(["type": "document", "source": ["type": "base64", "media_type": "application/pdf", "data": d.base64EncodedString()]])
            case .png(let d): content.append(["type": "image", "source": ["type": "base64", "media_type": "image/png", "data": d.base64EncodedString()]])
            }
        }
        var tokens = maxTokens
        var last: Failure = .other("unbekannt")
        let waits: [Double] = [1.5, 4, 8]
        for attempt in 0..<4 {
            var req = URLRequest(url: endpoint)
            req.httpMethod = "POST"
            req.timeoutInterval = 120
            req.setValue("application/json", forHTTPHeaderField: "content-type")
            req.setValue(key, forHTTPHeaderField: "x-api-key")
            req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
            let body: [String: Any] = ["model": model, "max_tokens": tokens, "system": Self.system,
                                       "messages": [["role": "user", "content": content]]]
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            let data: Data, resp: URLResponse
            do { (data, resp) = try await URLSession.shared.data(for: req) }
            catch {
                last = .offline
                if attempt < 3 { try await Task.sleep(nanoseconds: UInt64(waits[attempt] * 1e9)); continue }
                break
            }
            let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            if status != 200 {
                let detail = ((json["error"] as? [String: Any])?["message"] as? String ?? "").lowercased()
                last = Self.classify(status: status, detail: detail)
                if last == .overloaded, attempt < 3 { try await Task.sleep(nanoseconds: UInt64(waits[attempt] * 1e9)); continue }
                throw last
            }
            let text = (json["content"] as? [[String: Any]] ?? []).compactMap { $0["text"] as? String }.joined()
            if let obj = Self.parseLoose(text) { return obj }
            last = .badJSON
            if (json["stop_reason"] as? String) == "max_tokens" { tokens = min(tokens * 2, 8000) }
            if attempt >= 2 { break }
        }
        throw last
    }

    static func classify(status: Int, detail: String) -> Failure {
        if status == 401 { return .badKey }
        if detail.contains("credit balance") || detail.contains("billing") { return .noCredit }
        if status == 404 || (detail.contains("model") && detail.contains("not")) { return .badModel }
        if status == 529 || status == 429 || status >= 500 || detail.contains("overloaded") { return .overloaded }
        return .other("Fehler \(status)")
    }

    /// JSON aus der Antwort holen; repariert gerade Anführungszeichen mitten im Text (wie repairQuotes in der Extension)
    static func parseLoose(_ raw: String) -> [String: Any]? {
        let clean = raw.replacingOccurrences(of: "```json", with: "").replacingOccurrences(of: "```", with: "")
        guard let s = clean.firstIndex(of: "{"), let e = clean.lastIndex(of: "}"), s <= e else { return nil }
        let body = String(clean[s...e])
        if let o = try? JSONSerialization.jsonObject(with: Data(body.utf8)) as? [String: Any] { return o }
        return try? JSONSerialization.jsonObject(with: Data(repairQuotes(body).utf8)) as? [String: Any]
    }

    static func repairQuotes(_ src: String) -> String {
        var out = "", inStr = false, open = true
        let chars = Array(src)
        var i = 0
        while i < chars.count {
            let ch = chars[i]
            if !inStr { out.append(ch); if ch == "\"" { inStr = true }; i += 1; continue }
            if ch == "\\" { out.append(ch); if i + 1 < chars.count { out.append(chars[i + 1]) }; i += 2; continue }
            if ch == "\"" {
                var j = i + 1
                while j < chars.count, chars[j].isWhitespace { j += 1 }
                if j >= chars.count || ",}]:".contains(chars[j]) { out.append(ch); inStr = false }
                else { out.append(open ? "„" : "“"); open.toggle() }
                i += 1; continue
            }
            if ch == "\n" { out += "\\n"; i += 1; continue }
            out.append(ch); i += 1
        }
        return out
    }
}
