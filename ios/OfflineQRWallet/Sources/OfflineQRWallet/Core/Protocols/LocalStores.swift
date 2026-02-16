import Foundation

public protocol LocalTransactionStore {
    func save(_ transaction: LocalTransaction) throws
    func get(txId: UUID) throws -> LocalTransaction?
    func list(states: Set<LocalTransactionState>) throws -> [LocalTransaction]
    func markState(txId: UUID, state: LocalTransactionState, failureReason: String?) throws
}

public protocol WalletSnapshotStore {
    func load(accountId: UUID) throws -> WalletSnapshot?
    func save(_ snapshot: WalletSnapshot) throws
}
