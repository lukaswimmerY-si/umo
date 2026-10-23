import AppKit
import PDFKit

/// Woher das PDF kommt: vorderes Dokument in Vorschau/Acrobat (AppleScript) oder Datei.
enum PDFContext {
    /// Pfad des vorderen Dokuments in Vorschau oder Acrobat, sonst nil.
    /// TODO Phase 1: am echten Mac prüfen (Acrobat-Skript, Rechte-Dialog „Automation“ vorher erklären).
    static func frontmostPDFPath() -> URL? {
        let app = NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? ""
        let script: String
        switch app {
        case "com.apple.Preview":
            script = "tell application \"Preview\" to return path of front document"
        case "com.adobe.Acrobat.Pro", "com.adobe.Reader":
            script = "tell application id \"\(app)\" to return POSIX path of (file alias of active doc as alias)"
        default:
            return nil
        }
        var err: NSDictionary?
        guard let out = NSAppleScript(source: script)?.executeAndReturnError(&err).stringValue, out.hasPrefix("/") else { return nil }
        return URL(fileURLWithPath: out)
    }

    /// Text pro Seite (für „Zeig mir die Stelle“ und für große PDFs)
    static func pages(of url: URL) -> [String] {
        guard let doc = PDFDocument(url: url) else { return [] }
        return (0..<doc.pageCount).map { doc.page(at: $0)?.string ?? "" }
    }

    /// Fundstelle eines wörtlichen Zitats (für „Zeig mir die Stelle“)
    static func find(_ quote: String, in url: URL) -> PDFSelection? {
        guard let doc = PDFDocument(url: url) else { return nil }
        let q = quote.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return nil }
        return doc.findString(q, withOptions: [.caseInsensitive, .diacriticInsensitive]).first
            ?? doc.findString(String(q.prefix(40)), withOptions: [.caseInsensitive]).first
    }
}
