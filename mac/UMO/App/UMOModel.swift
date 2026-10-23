import SwiftUI
import UniformTypeIdentifiers

/// Zentraler Zustand. Phase 0/1: Skelett – Claude Code baut Fenster, Pille und Ansichten aus.
@MainActor
final class UMOModel: ObservableObject {
    static let shared = UMOModel()

    enum Content { case none, pdf(URL), text(String, source: String) }
    enum Phase { case idle, working(String), pdf(PDFUnderstanding), failed(String) }

    @Published var showPill = UserDefaults.standard.object(forKey: "showPill") as? Bool ?? true {
        didSet { UserDefaults.standard.set(showPill, forKey: "showPill") }
    }
    @Published var content: Content = .none
    @Published var phase: Phase = .idle
    @Published var level: Prompts.Level = .einfach
    /// Nur jetzt: bis UMO beendet wird
    @Published var sessionNeeds: [String] = []
    /// Immer: im Schlüsselbund
    var alwaysNeeds: [String] {
        get { (Keychain.get("needs") ?? "").split(separator: "\n").map(String.init) }
        set { Keychain.set(newValue.joined(separator: "\n"), for: "needs") }
    }
    var model: String { UserDefaults.standard.string(forKey: "model") ?? "claude-sonnet-5-5" }

    func openForFrontmostContent() {
        if let url = PDFContext.frontmostPDFPath() { openPDF(url); return }
        // TODO Phase 2: Mail (AppleScript), markierter Text (AXUIElement), sonst Fensterbild nach Klick
        UMOWindow.shared.show()
    }

    func pickPDF() {
        let p = NSOpenPanel()
        p.allowedContentTypes = [.pdf]
        p.message = "Wähle das PDF, das UMO dir erklären soll."
        if p.runModal() == .OK, let url = p.url { openPDF(url) }
    }

    func openPDF(_ url: URL) {
        content = .pdf(url)
        UMOWindow.shared.show()
        phase = .working("Ich lese das Dokument für dich …")
        let needs = Prompts.needsLine(always: alwaysNeeds, session: sessionNeeds)
        Task {
            do { phase = .pdf(try await PDFUnderstanding.run(url: url, level: level, needs: needs, model: model)) }
            catch let e as ClaudeClient.Failure { phase = .failed(e.message) }
            catch { phase = .failed("Ich konnte das Dokument nicht öffnen.") }
        }
    }

    func openForText(_ text: String, source: String) {
        content = .text(text, source: source)
        UMOWindow.shared.show()
        // TODO Phase 2: Text vereinfachen / erklären
    }
}

/// Das UMO-Fenster (dunkel, wie das Sheet der Extension). TODO Phase 0: Gestaltung nach Figma.
@MainActor
final class UMOWindow {
    static let shared = UMOWindow()
    private var window: NSWindow?

    func show() {
        if window == nil {
            let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 460, height: 720),
                             styleMask: [.titled, .closable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
            w.title = "UMO"
            w.titlebarAppearsTransparent = true
            w.isReleasedWhenClosed = false
            w.contentView = NSHostingView(rootView: PanelView().environmentObject(UMOModel.shared))
            w.center()
            window = w
        }
        NSApp.activate(ignoringOtherApps: true)
        window?.makeKeyAndOrderFront(nil)
    }
}
