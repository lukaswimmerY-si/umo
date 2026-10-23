import XCTest
@testable import UMO

final class ClaudeClientTests: XCTestCase {
    func testRepairsStraightQuotesInsideText() {
        let raw = "Hier: {\"snacks\":[{\"title\":\"Die \"sonstigen\" Parteien\",\"text\":\"BSW knapp.\"}]}"
        let o = ClaudeClient.parseLoose(raw)
        let first = (o?["snacks"] as? [[String: Any]])?.first
        XCTAssertEqual(first?["title"] as? String, "Die „sonstigen“ Parteien")
    }

    func testParsesFencedJSON() {
        XCTAssertEqual(ClaudeClient.parseLoose("```json\n{\"ok\": true}\n```")?["ok"] as? Bool, true)
    }

    func testClassifiesErrors() {
        XCTAssertEqual(ClaudeClient.classify(status: 401, detail: ""), .badKey)
        XCTAssertEqual(ClaudeClient.classify(status: 400, detail: "your credit balance is too low"), .noCredit)
        XCTAssertEqual(ClaudeClient.classify(status: 529, detail: "overloaded"), .overloaded)
        XCTAssertEqual(ClaudeClient.classify(status: 404, detail: "model: x"), .badModel)
    }

    func testNeedsLineCombinesScopes() {
        let l = Prompts.needsLine(always: ["Kurze Sätze"], session: ["Heute müde"])
        XCTAssertTrue(l.contains("Immer: Kurze Sätze"))
        XCTAssertTrue(l.contains("Gerade jetzt: Heute müde"))
    }
}
