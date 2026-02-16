import Foundation

public final class InMemoryLocalTransactionStore: LocalTransactionStore {
    private var rows: [UUID: LocalTransaction] = [:]

    public init() {}

    public func save(_ transaction: LocalTransaction) throws {
        rows[transaction.txId] = transaction
    }

    public func get(txId: UUID) throws -> LocalTransaction? {
        rows[txId]
    }

    public func list(states: Set<LocalTransactionState>) throws -> [LocalTransaction] {
        rows.values
            .filter { states.contains($0.state) }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    public func markState(txId: UUID, state: LocalTransactionState, failureReason: String?) throws {
        guard var row = rows[txId] else {
            return
        }
        row.state = state
        row.failureReason = failureReason
        row.updatedAt = Date()
        rows[txId] = row
    }
}

public final class InMemoryWalletSnapshotStore: WalletSnapshotStore {
    private var rows: [UUID: WalletSnapshot] = [:]

    public init() {}

    public func load(accountId: UUID) throws -> WalletSnapshot? {
        rows[accountId]
    }

    public func save(_ snapshot: WalletSnapshot) throws {
        rows[snapshot.accountId] = snapshot
    }
}
