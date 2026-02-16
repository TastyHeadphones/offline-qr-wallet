import Foundation

public struct PaymentIntent: Codable, Equatable {
    public var txId: UUID
    public var merchantIntentId: UUID
    public var merchantAccountId: UUID
    public var merchantDeviceId: UUID
    public var amountCents: Int
    public var currency: String
    public var merchantNonce: String
    public var merchantCounter: Int
    public var issuedAt: Date
    public var expiresAt: Date
    public var merchantSignature: String

    public init(
        txId: UUID,
        merchantIntentId: UUID,
        merchantAccountId: UUID,
        merchantDeviceId: UUID,
        amountCents: Int,
        currency: String,
        merchantNonce: String,
        merchantCounter: Int,
        issuedAt: Date,
        expiresAt: Date,
        merchantSignature: String
    ) {
        self.txId = txId
        self.merchantIntentId = merchantIntentId
        self.merchantAccountId = merchantAccountId
        self.merchantDeviceId = merchantDeviceId
        self.amountCents = amountCents
        self.currency = currency
        self.merchantNonce = merchantNonce
        self.merchantCounter = merchantCounter
        self.issuedAt = issuedAt
        self.expiresAt = expiresAt
        self.merchantSignature = merchantSignature
    }
}

public struct PaymentAuthorization: Codable, Equatable {
    public var txId: UUID
    public var merchantIntentId: UUID
    public var payerAuthorizationId: UUID
    public var payerAccountId: UUID
    public var payerDeviceId: UUID
    public var amountCents: Int
    public var currency: String
    public var payerNonce: String
    public var payerCounter: Int
    public var authorizedAt: Date
    public var payerSignature: String

    public init(
        txId: UUID,
        merchantIntentId: UUID,
        payerAuthorizationId: UUID,
        payerAccountId: UUID,
        payerDeviceId: UUID,
        amountCents: Int,
        currency: String,
        payerNonce: String,
        payerCounter: Int,
        authorizedAt: Date,
        payerSignature: String
    ) {
        self.txId = txId
        self.merchantIntentId = merchantIntentId
        self.payerAuthorizationId = payerAuthorizationId
        self.payerAccountId = payerAccountId
        self.payerDeviceId = payerDeviceId
        self.amountCents = amountCents
        self.currency = currency
        self.payerNonce = payerNonce
        self.payerCounter = payerCounter
        self.authorizedAt = authorizedAt
        self.payerSignature = payerSignature
    }
}

public struct PaymentReceipt: Codable, Equatable {
    public var txId: UUID
    public var receiptId: UUID
    public var merchantAccountId: UUID
    public var payerAccountId: UUID
    public var amountCents: Int
    public var currency: String
    public var status: ReceiptStatus
    public var createdAt: Date
    public var merchantSignature: String

    public enum ReceiptStatus: String, Codable {
        case acceptedOffline
        case pendingSync
        case rejected
    }

    public init(
        txId: UUID,
        receiptId: UUID,
        merchantAccountId: UUID,
        payerAccountId: UUID,
        amountCents: Int,
        currency: String,
        status: ReceiptStatus,
        createdAt: Date,
        merchantSignature: String
    ) {
        self.txId = txId
        self.receiptId = receiptId
        self.merchantAccountId = merchantAccountId
        self.payerAccountId = payerAccountId
        self.amountCents = amountCents
        self.currency = currency
        self.status = status
        self.createdAt = createdAt
        self.merchantSignature = merchantSignature
    }
}

public enum LocalTransactionState: String, Codable {
    case initiated
    case authorized
    case accepted
    case pendingSync
    case synced
    case rejected
    case expired
    case canceled
}

public struct LocalTransaction: Codable, Equatable {
    public var txId: UUID
    public var merchantAccountId: UUID
    public var payerAccountId: UUID?
    public var merchantDeviceId: UUID
    public var payerDeviceId: UUID?
    public var amountCents: Int
    public var currency: String
    public var merchantIntentId: UUID
    public var payerAuthorizationId: UUID?
    public var merchantNonce: String
    public var payerNonce: String?
    public var merchantCounter: Int
    public var payerCounter: Int?
    public var state: LocalTransactionState
    public var failureReason: String?
    public var createdAt: Date
    public var updatedAt: Date
    public var idempotencyKey: String

    public init(
        txId: UUID,
        merchantAccountId: UUID,
        payerAccountId: UUID?,
        merchantDeviceId: UUID,
        payerDeviceId: UUID?,
        amountCents: Int,
        currency: String,
        merchantIntentId: UUID,
        payerAuthorizationId: UUID?,
        merchantNonce: String,
        payerNonce: String?,
        merchantCounter: Int,
        payerCounter: Int?,
        state: LocalTransactionState,
        failureReason: String?,
        createdAt: Date,
        updatedAt: Date,
        idempotencyKey: String
    ) {
        self.txId = txId
        self.merchantAccountId = merchantAccountId
        self.payerAccountId = payerAccountId
        self.merchantDeviceId = merchantDeviceId
        self.payerDeviceId = payerDeviceId
        self.amountCents = amountCents
        self.currency = currency
        self.merchantIntentId = merchantIntentId
        self.payerAuthorizationId = payerAuthorizationId
        self.merchantNonce = merchantNonce
        self.payerNonce = payerNonce
        self.merchantCounter = merchantCounter
        self.payerCounter = payerCounter
        self.state = state
        self.failureReason = failureReason
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.idempotencyKey = idempotencyKey
    }
}
