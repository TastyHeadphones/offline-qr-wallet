import Foundation

public struct WalletSnapshot: Codable, Equatable {
    public var accountId: UUID
    public var availableCents: Int
    public var updatedAt: Date
    public var version: Int
    public var source: Source

    public enum Source: String, Codable {
        case offlineCache
        case authoritativeServer
    }

    public init(accountId: UUID, availableCents: Int, updatedAt: Date, version: Int, source: Source) {
        self.accountId = accountId
        self.availableCents = availableCents
        self.updatedAt = updatedAt
        self.version = version
        self.source = source
    }
}
