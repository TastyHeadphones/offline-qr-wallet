import Foundation

public final class SyncCoordinator {
    private let syncAPI: WalletSyncAPI
    private let transactionStore: LocalTransactionStore

    public init(syncAPI: WalletSyncAPI, transactionStore: LocalTransactionStore) {
        self.syncAPI = syncAPI
        self.transactionStore = transactionStore
    }

    public func syncPending(merchantDeviceId: UUID) async throws -> [SyncUploadResult] {
        let pending = try transactionStore.list(states: [.pendingSync, .authorized])
        let uploadItems = pending.compactMap { tx -> SyncUploadItem? in
            guard let payerAuthorizationId = tx.payerAuthorizationId,
                  let payerAccountId = tx.payerAccountId,
                  let payerDeviceId = tx.payerDeviceId,
                  let payerNonce = tx.payerNonce,
                  let payerCounter = tx.payerCounter else {
                return nil
            }

            return SyncUploadItem(
                txId: tx.txId,
                idempotencyKey: tx.idempotencyKey,
                merchantIntentId: tx.merchantIntentId,
                payerAuthorizationId: payerAuthorizationId,
                merchantAccountId: tx.merchantAccountId,
                payerAccountId: payerAccountId,
                merchantDeviceId: tx.merchantDeviceId,
                payerDeviceId: payerDeviceId,
                amountCents: tx.amountCents,
                currency: tx.currency,
                merchantNonce: tx.merchantNonce,
                payerNonce: payerNonce,
                merchantCounter: tx.merchantCounter,
                payerCounter: payerCounter,
                intentIssuedAt: tx.createdAt,
                authorizationIssuedAt: tx.updatedAt,
                expiresAt: tx.createdAt.addingTimeInterval(30),
                merchantSignature: "merchant-signature-placeholder",
                payerSignature: "payer-signature-placeholder"
            )
        }

        if uploadItems.isEmpty {
            return []
        }

        let results = try await syncAPI.syncOfflineTransactions(
            merchantDeviceId: merchantDeviceId,
            submittedAt: Date(),
            transactions: uploadItems
        )

        for result in results {
            switch result.status {
            case "accepted", "reconciled":
                try transactionStore.markState(txId: result.txId, state: .synced, failureReason: nil)
            case "duplicate":
                try transactionStore.markState(txId: result.txId, state: .synced, failureReason: "duplicate")
            default:
                try transactionStore.markState(txId: result.txId, state: .rejected, failureReason: result.reason)
            }
        }

        return results
    }
}
