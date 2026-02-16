import Foundation

public enum HandshakeError: Error {
    case invalidRole
    case policyDenied(String)
    case invalidIntent
    case invalidAuthorization
    case unknownTransaction
}

public struct MerchantContext {
    public var accountId: UUID
    public var deviceId: UUID
    public var keyTag: String
    public var policy: RiskPolicy

    public init(accountId: UUID, deviceId: UUID, keyTag: String, policy: RiskPolicy) {
        self.accountId = accountId
        self.deviceId = deviceId
        self.keyTag = keyTag
        self.policy = policy
    }
}

public struct PayerContext {
    public var accountId: UUID
    public var deviceId: UUID
    public var keyTag: String
    public var policy: RiskPolicy

    public init(accountId: UUID, deviceId: UUID, keyTag: String, policy: RiskPolicy) {
        self.accountId = accountId
        self.deviceId = deviceId
        self.keyTag = keyTag
        self.policy = policy
    }
}

public final class TwoWayQRHandshakeCoordinator {
    private let codec: QRPayloadCodec
    private let cryptoProvider: CryptoProvider
    private let transactionStore: LocalTransactionStore
    private let riskEngine: RiskPolicyEngine

    public init(
        codec: QRPayloadCodec,
        cryptoProvider: CryptoProvider,
        transactionStore: LocalTransactionStore,
        riskEngine: RiskPolicyEngine
    ) {
        self.codec = codec
        self.cryptoProvider = cryptoProvider
        self.transactionStore = transactionStore
        self.riskEngine = riskEngine
    }

    public func buildMerchantIntent(amountCents: Int, currency: String, context: MerchantContext, counter: Int) throws -> (qrText: String, transaction: LocalTransaction) {
        let now = Date()
        let txId = UUID()
        let intentId = UUID()
        let nonce = cryptoProvider.randomNonce(length: 16)
        let expiresAt = now.addingTimeInterval(30)
        let signMaterial = "\(txId.uuidString)|\(intentId.uuidString)|\(amountCents)|\(currency)|\(nonce)|\(counter)|\(ISO8601DateFormatter().string(from: expiresAt))"
        let signature = try cryptoProvider.sign(message: signMaterial, keyTag: context.keyTag)

        let intent = PaymentIntent(
            txId: txId,
            merchantIntentId: intentId,
            merchantAccountId: context.accountId,
            merchantDeviceId: context.deviceId,
            amountCents: amountCents,
            currency: currency,
            merchantNonce: nonce,
            merchantCounter: counter,
            issuedAt: now,
            expiresAt: expiresAt,
            merchantSignature: signature
        )

        let localTx = LocalTransaction(
            txId: txId,
            merchantAccountId: context.accountId,
            payerAccountId: nil,
            merchantDeviceId: context.deviceId,
            payerDeviceId: nil,
            amountCents: amountCents,
            currency: currency,
            merchantIntentId: intentId,
            payerAuthorizationId: nil,
            merchantNonce: nonce,
            payerNonce: nil,
            merchantCounter: counter,
            payerCounter: nil,
            state: .initiated,
            failureReason: nil,
            createdAt: now,
            updatedAt: now,
            idempotencyKey: "merchant:\(txId.uuidString)"
        )

        try transactionStore.save(localTx)
        return (try codec.encode(intent, as: .paymentIntent), localTx)
    }

    public func buildPayerAuthorization(intentQR: String, context: PayerContext, counter: Int) throws -> (qrText: String, transaction: LocalTransaction) {
        let intent = try codec.decode(intentQR, to: PaymentIntent.self)
        switch riskEngine.evaluateIntent(intent, policy: context.policy) {
        case .allow:
            break
        case .deny(let reason):
            throw HandshakeError.policyDenied(reason)
        }

        let payerNonce = cryptoProvider.randomNonce(length: 16)
        let now = Date()
        let signMaterial = "\(intent.txId.uuidString)|\(intent.merchantIntentId.uuidString)|\(intent.amountCents)|\(intent.currency)|\(payerNonce)|\(counter)|\(ISO8601DateFormatter().string(from: now))"
        let payerSignature = try cryptoProvider.sign(message: signMaterial, keyTag: context.keyTag)

        let authorization = PaymentAuthorization(
            txId: intent.txId,
            merchantIntentId: intent.merchantIntentId,
            payerAuthorizationId: UUID(),
            payerAccountId: context.accountId,
            payerDeviceId: context.deviceId,
            amountCents: intent.amountCents,
            currency: intent.currency,
            payerNonce: payerNonce,
            payerCounter: counter,
            authorizedAt: now,
            payerSignature: payerSignature
        )

        let localTx = LocalTransaction(
            txId: intent.txId,
            merchantAccountId: intent.merchantAccountId,
            payerAccountId: context.accountId,
            merchantDeviceId: intent.merchantDeviceId,
            payerDeviceId: context.deviceId,
            amountCents: intent.amountCents,
            currency: intent.currency,
            merchantIntentId: intent.merchantIntentId,
            payerAuthorizationId: authorization.payerAuthorizationId,
            merchantNonce: intent.merchantNonce,
            payerNonce: payerNonce,
            merchantCounter: intent.merchantCounter,
            payerCounter: counter,
            state: .authorized,
            failureReason: nil,
            createdAt: now,
            updatedAt: now,
            idempotencyKey: "payer:\(intent.txId.uuidString):\(authorization.payerAuthorizationId.uuidString)"
        )

        try transactionStore.save(localTx)
        return (try codec.encode(authorization, as: .paymentAuthorization), localTx)
    }

    public func acceptAuthorization(authorizationQR: String, context: MerchantContext) throws -> (qrText: String, receipt: PaymentReceipt, transaction: LocalTransaction) {
        let authorization = try codec.decode(authorizationQR, to: PaymentAuthorization.self)
        guard var localTx = try transactionStore.get(txId: authorization.txId) else {
            throw HandshakeError.unknownTransaction
        }

        guard authorization.amountCents == localTx.amountCents,
              authorization.currency == localTx.currency,
              authorization.merchantIntentId == localTx.merchantIntentId else {
            throw HandshakeError.invalidAuthorization
        }

        localTx.payerAuthorizationId = authorization.payerAuthorizationId
        localTx.payerAccountId = authorization.payerAccountId
        localTx.payerDeviceId = authorization.payerDeviceId
        localTx.payerNonce = authorization.payerNonce
        localTx.payerCounter = authorization.payerCounter
        localTx.state = .pendingSync
        localTx.updatedAt = Date()
        try transactionStore.save(localTx)

        let receiptMessage = "\(authorization.txId.uuidString)|\(authorization.payerAuthorizationId.uuidString)|accepted_offline"
        let receiptSignature = try cryptoProvider.sign(message: receiptMessage, keyTag: context.keyTag)

        let receipt = PaymentReceipt(
            txId: authorization.txId,
            receiptId: UUID(),
            merchantAccountId: context.accountId,
            payerAccountId: authorization.payerAccountId,
            amountCents: authorization.amountCents,
            currency: authorization.currency,
            status: .pendingSync,
            createdAt: Date(),
            merchantSignature: receiptSignature
        )

        return (try codec.encode(receipt, as: .paymentReceipt), receipt, localTx)
    }
}
