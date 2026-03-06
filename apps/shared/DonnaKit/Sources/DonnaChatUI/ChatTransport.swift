import Foundation

public enum DonnaChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(DonnaChatEventPayload)
    case agent(DonnaAgentEventPayload)
    case seqGap
}

public protocol DonnaChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> DonnaChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [DonnaChatAttachmentPayload]) async throws -> DonnaChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> DonnaChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<DonnaChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension DonnaChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "DonnaChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> DonnaChatSessionsListResponse {
        throw NSError(
            domain: "DonnaChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
