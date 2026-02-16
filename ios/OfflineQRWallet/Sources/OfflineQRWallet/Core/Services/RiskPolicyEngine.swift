import Foundation

public enum RiskDecision: Equatable {
    case allow
    case deny(String)
}

public final class RiskPolicyEngine {
    public init() {}

    public func evaluateIntent(_ intent: PaymentIntent, policy: RiskPolicy, now: Date = Date()) -> RiskDecision {
        if intent.amountCents <= 0 || intent.amountCents > policy.maxPerTransactionCents {
            return .deny("transaction limit exceeded")
        }

        if intent.expiresAt < now {
            return .deny("intent expired")
        }

        let skew = abs(intent.issuedAt.timeIntervalSince(now))
        if skew > TimeInterval(policy.maxClockSkewSeconds) {
            return .deny("clock skew too large")
        }

        return .allow
    }

    public func allowOfflineUsage(lastSyncAt: Date, now: Date, policy: RiskPolicy) -> RiskDecision {
        let age = now.timeIntervalSince(lastSyncAt)
        let maxSeconds = TimeInterval(policy.maxSyncAgeHours * 60 * 60)
        if age > maxSeconds {
            return .deny("device sync stale")
        }

        return .allow
    }
}
