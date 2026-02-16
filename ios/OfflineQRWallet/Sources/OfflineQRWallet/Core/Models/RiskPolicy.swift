import Foundation

public struct RiskPolicy: Codable, Equatable {
    public var maxPerTransactionCents: Int
    public var maxPerDayPerPayerCents: Int
    public var maxUnsyncedPerMerchant: Int
    public var maxSyncAgeHours: Int
    public var maxClockSkewSeconds: Int

    public init(
        maxPerTransactionCents: Int,
        maxPerDayPerPayerCents: Int,
        maxUnsyncedPerMerchant: Int,
        maxSyncAgeHours: Int,
        maxClockSkewSeconds: Int
    ) {
        self.maxPerTransactionCents = maxPerTransactionCents
        self.maxPerDayPerPayerCents = maxPerDayPerPayerCents
        self.maxUnsyncedPerMerchant = maxUnsyncedPerMerchant
        self.maxSyncAgeHours = maxSyncAgeHours
        self.maxClockSkewSeconds = maxClockSkewSeconds
    }

    public static let `default` = RiskPolicy(
        maxPerTransactionCents: 10_000,
        maxPerDayPerPayerCents: 50_000,
        maxUnsyncedPerMerchant: 1_000,
        maxSyncAgeHours: 48,
        maxClockSkewSeconds: 300
    )
}
