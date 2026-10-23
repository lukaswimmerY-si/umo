import Foundation

/// Lädt die Sprachregeln aus Resources/Prompts (wörtlich aus der Extension) und baut Prompts zusammen.
enum Prompts {
    enum Level { case einfach, leicht }

    static func file(_ name: String) -> String {
        guard let url = Bundle.main.url(forResource: name, withExtension: "txt"),
              let s = try? String(contentsOf: url, encoding: .utf8) else { return "" }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func rules(_ level: Level) -> String { file(level == .leicht ? "leichte-sprache" : "einfache-sprache") }

    /// Wie needsLine() in der Extension: Immer + Nur jetzt
    static func needsLine(always: [String], session: [String]) -> String {
        var parts: [String] = []
        if !always.isEmpty { parts.append("Immer: " + always.joined(separator: "; ")) }
        if !session.isEmpty { parts.append("Gerade jetzt: " + session.joined(separator: "; ")) }
        return parts.isEmpty ? "" : "Wünsche der Person, bitte berücksichtigen:\n\"\"\"\(parts.joined(separator: "\n"))\"\"\""
    }

    static func pdfUnderstanding(level: Level, needs: String) -> String {
        file("pdf-verstehen")
            .replacingOccurrences(of: "{{TON}}", with: file("ton"))
            .replacingOccurrences(of: "{{SPRACHE}}", with: rules(level))
            .replacingOccurrences(of: "{{BEDUERFNISSE}}", with: needs)
    }
}
