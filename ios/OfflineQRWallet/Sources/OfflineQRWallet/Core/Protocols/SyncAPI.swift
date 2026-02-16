import Foundation

public struct SyncUploadItem: Codable, Equatable {
    public var txId: UUID
    public var idempotencyKey: String
    public var merchantIntentId: UUID
    public var payerAuthorizationId: UUID
    public var merchantAccountId: UUID
    public var payerAccountId: UUID
    public var merchantDeviceId: UUID
    public var payerDeviceId: UUID
    public var amountCents: Int
    public var currency: String
    public var merchantNonce: String
    public var payerNonce: String
    public var merchantCounter: Int
    public var payerCounter: Int
    public var intentIssuedAt: Date
    public var authorizationIssuedAt: Date
    public var expiresAt: Date
    public var merchantSignature: String
    public var payerSignature: String

    public init(
        txId: UUID,
        idempotencyKey: String,
        merchantIntentId: UUID,
        payerAuthorizationId: UUID,
        merchantAccountId: UUID,
        payerAccountId: UUID,
        merchantDeviceId: UUID,
        payerDeviceId: UUID,
        amountCents: Int,
        currency: String,
        merchantNonce: String,
        payerNonce: String,
        merchantCounter: Int,
        payerCounter: Int,
        intentIssuedAt: Date,
        authorizationIssuedAt: Date,
        expiresAt: Date,
        merchantSignature: String,
        payerSignature: String
    ) {
        self.txId = txId
        self.idempotencyKey = idempotencyKey
        self.merchantIntentId = merchantIntentId
        self.payerAuthorizationId = payerAuthorizationId
        self.merchantAccountId = merchantAccountId
        self.payerAccountId = payerAccountId
        self.merchantDeviceId = merchantDeviceId
        self.payerDeviceId = payerDeviceId
        self.amountCents = amountCents
        self.currency = currency
        self.merchantNonce = merchantNonce
        self.payerNonce = payerNonce
        self.merchantCounter = merchantCounter
        self.payerCounter = payerCounter
        self.intentIssuedAt = intentIssuedAt
        self.authorizationIssuedAt = authorizationIssuedAt
        self.expiresAt = expiresAt
        self.merchantSignature = merchantSignature
        self.payerSignature = payerSignature
    }
}

public struct SyncUploadResult: Codable, Equatable {
    public var txId: UUID
    public var status: String
    public var reason: String?

    public init(txId: UUID, status: String, reason: String?) {
        self.txId = txId
        self.status = status
        self.reason = reason
    }
}

public protocol WalletSyncAPI {
    func syncOfflineTransactions(merchantDeviceId: UUID, submittedAt: Date, transactions: [SyncUploadItem]) async throws -> [SyncUploadResult]
    func fetchWalletSnapshot(accountId: UUID) async throws -> WalletSnapshot
}

public protocol WalletBackendAPI: WalletSyncAPI {
    func createAccount(externalIdentity: String, displayName: String, roles: [UserRole]) async throws -> AccountProfile
    func registerDevice(_ request: DeviceRegistrationRequest) async throws -> DeviceIdentity
    func topUp(accountId: UUID, amountCents: Int, reference: String, actorAccountId: UUID?) async throws -> WalletSnapshot
    func refund(originalTxId: UUID, amountCents: Int, reason: String, actorAccountId: UUID) async throws -> RefundResult
    func freezeDevice(deviceId: UUID, reason: String, actorAccountId: UUID) async throws
    func startCardTransfer(accountId: UUID, fromDeviceId: UUID, actorAccountId: UUID) async throws -> CardTransferChallenge
    func completeCardTransfer(
        transferCode: String,
        newDevicePublicKey: String,
        keyVersion: Int,
        actorAccountId: UUID
    ) async throws -> CardTransferCompletion
}
