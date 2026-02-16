import Foundation

public final class CashierCollectFlow {
    private let handshake: TwoWayQRHandshakeCoordinator

    public init(handshake: TwoWayQRHandshakeCoordinator) {
        self.handshake = handshake
    }

    public func createIntent(amountCents: Int, currency: String, context: MerchantContext, nextCounter: Int) throws -> String {
        let output = try handshake.buildMerchantIntent(
            amountCents: amountCents,
            currency: currency,
            context: context,
            counter: nextCounter
        )
        return output.qrText
    }

    public func acceptPayerAuthorization(_ payerAuthorizationQR: String, context: MerchantContext) throws -> PaymentReceipt {
        let output = try handshake.acceptAuthorization(authorizationQR: payerAuthorizationQR, context: context)
        return output.receipt
    }
}
