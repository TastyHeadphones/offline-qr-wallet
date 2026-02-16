import XCTest
@testable import OfflineQRWallet

final class HandshakeTests: XCTestCase {
    func testTwoWayHandshakeTransitionsToPendingSync() throws {
        let codec = JSONQRPayloadCodec()
        let crypto = DemoCryptoProvider()
        let txStore = InMemoryLocalTransactionStore()
        let risk = RiskPolicyEngine()
        let coordinator = TwoWayQRHandshakeCoordinator(
            codec: codec,
            cryptoProvider: crypto,
            transactionStore: txStore,
            riskEngine: risk
        )

        let merchant = MerchantContext(
            accountId: UUID(),
            deviceId: UUID(),
            keyTag: "merchant-key",
            policy: .default
        )
        let payer = PayerContext(
            accountId: UUID(),
            deviceId: UUID(),
            keyTag: "payer-key",
            policy: .default
        )

        let intent = try coordinator.buildMerchantIntent(
            amountCents: 850,
            currency: "CNY",
            context: merchant,
            counter: 1
        )
        let authorization = try coordinator.buildPayerAuthorization(
            intentQR: intent.qrText,
            context: payer,
            counter: 1
        )
        let result = try coordinator.acceptAuthorization(
            authorizationQR: authorization.qrText,
            context: merchant
        )

        XCTAssertEqual(result.receipt.status, .pendingSync)

        let tx = try txStore.get(txId: intent.transaction.txId)
        XCTAssertNotNil(tx)
        XCTAssertEqual(tx?.state, .pendingSync)
        XCTAssertEqual(tx?.payerAccountId, payer.accountId)
    }
}
