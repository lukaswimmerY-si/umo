import Foundation

/// Phase 1: PDF verstehen. Ergebnis in der Reihenfolge der Anzeige: Aufgaben und Fristen zuerst.
struct PDFUnderstanding {
    struct Aufgabe: Identifiable { let id = UUID(); let was: String; let bis: String; let zitat: String }
    struct Amount: Identifiable { let id = UUID(); let wert: String; let wofuer: String; let zitat: String }

    var art = "", absender = "", worum = "", hilfe = ""
    var aufgaben: [Aufgabe] = [], betraege: [Amount] = []
    var unterlagen: [String] = [], zusammenfassung: [String] = [], fragen: [String] = []

    init(json o: [String: Any]) {
        func s(_ k: String) -> String { (o[k] as? String) ?? "" }
        func list(_ k: String) -> [[String: Any]] { (o[k] as? [[String: Any]]) ?? [] }
        art = s("art"); absender = s("absender"); worum = s("worum"); hilfe = s("hilfe")
        aufgaben = list("aufgaben").map { Aufgabe(was: $0["was"] as? String ?? "", bis: $0["bis"] as? String ?? "", zitat: $0["zitat"] as? String ?? "") }
            .filter { !$0.was.isEmpty }
        betraege = list("betraege").map { Amount(wert: $0["wert"] as? String ?? "", wofuer: $0["wofuer"] as? String ?? "", zitat: $0["zitat"] as? String ?? "") }
            .filter { !$0.wert.isEmpty }
        unterlagen = (o["unterlagen"] as? [String]) ?? []
        zusammenfassung = (o["zusammenfassung"] as? [String]) ?? []
        fragen = (o["fragen"] as? [String]) ?? []
    }

    static func run(url: URL, level: Prompts.Level, needs: String, model: String) async throws -> PDFUnderstanding {
        let data = try Data(contentsOf: url)
        // TODO Phase 1: API-Grenzen für PDFs prüfen (Seiten, Größe); bei Überschreitung PDFKit-Text in Stücken senden.
        let prompt = Prompts.pdfUnderstanding(level: level, needs: needs)
        let json = try await ClaudeClient(model: model, maxTokens: 3000).ask([.pdf(data), .text(prompt)])
        return PDFUnderstanding(json: json)
    }
}
