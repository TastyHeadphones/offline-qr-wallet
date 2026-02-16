import Foundation

public final class WalletCoordinator {
    private let walletSnapshotStore: WalletSnapshotStore

    public init(walletSnapshotStore: WalletSnapshotStore) {
        self.walletSnapshotStore = walletSnapshotStore
    }

    public func offlineBalance(accountId: UUID) throws -> WalletSnapshot? {
        try walletSnapshotStore.load(accountId: accountId)
    }

    public func updateFromServer(_ snapshot: WalletSnapshot) throws {
        try walletSnapshotStore.save(snapshot)
    }
}
