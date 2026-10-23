import SwiftUI
import KeyboardShortcuts

extension KeyboardShortcuts.Name {
    /// ⌥ Leertaste: UMO für das öffnen, was gerade vorne ist
    static let openUMO = Self("openUMO", default: .init(.space, modifiers: [.option]))
}

@main
struct UMOApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var model = UMOModel.shared

    var body: some Scene {
        MenuBarExtra {
            Button("UMO öffnen") { model.openForFrontmostContent() }
            Button("PDF auswählen …") { model.pickPDF() }
            Divider()
            Toggle("Pille anzeigen", isOn: $model.showPill)
            SettingsLink { Text("Einstellungen …") }
            Divider()
            Button("UMO beenden") { NSApp.terminate(nil) }
        } label: {
            Image(systemName: "circle.fill") // TODO Phase 0: eigenes UMO-Symbol (Template-Bild)
        }
        Settings { SettingsView() }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        KeyboardShortcuts.onKeyUp(for: .openUMO) { Task { @MainActor in UMOModel.shared.openForFrontmostContent() } }
        NSApp.servicesProvider = ServiceProvider()
        // TODO Phase 0: PillWindow (schwebendes NSPanel, ziehbar, über allen Spaces) anzeigen, wenn showPill
    }
}

/// Dienste-Menü: Rechtsklick > Dienste > Mit UMO vereinfachen
final class ServiceProvider: NSObject {
    @objc func simplifyText(_ pboard: NSPasteboard, userData: String, error: AutoreleasingUnsafeMutablePointer<NSString>) {
        guard let text = pboard.string(forType: .string), !text.isEmpty else { return }
        Task { @MainActor in UMOModel.shared.openForText(text, source: "Markierter Text") }
    }
}
