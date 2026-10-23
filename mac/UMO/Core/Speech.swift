import AVFoundation

/// Vorlesen mit der besten deutschen Stimme auf dem Mac (Premium > Erweitert > Standard).
final class Speech: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    static let shared = Speech()
    private let synth = AVSpeechSynthesizer()
    @Published var spokenRange: NSRange?
    @Published var isSpeaking = false

    override init() { super.init(); synth.delegate = self }

    static var germanVoices: [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("de") }
            .sorted { $0.quality.rawValue > $1.quality.rawValue }
    }

    func speak(_ text: String) {
        stop()
        let u = AVSpeechUtterance(string: text.replacingOccurrences(of: "·", with: ""))
        let id = UserDefaults.standard.string(forKey: "voiceID")
        u.voice = id.flatMap { AVSpeechSynthesisVoice(identifier: $0) } ?? Self.germanVoices.first
        u.rate = UserDefaults.standard.object(forKey: "voiceRate") as? Float ?? 0.45
        isSpeaking = true
        synth.speak(u)
    }

    func stop() { synth.stopSpeaking(at: .immediate); isSpeaking = false; spokenRange = nil }

    func speechSynthesizer(_ s: AVSpeechSynthesizer, willSpeakRangeOfSpeechString r: NSRange, utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.spokenRange = r }
    }
    func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.isSpeaking = false; self.spokenRange = nil }
    }
}
