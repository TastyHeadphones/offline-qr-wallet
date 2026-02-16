import Foundation

public final class PayerPaymentFlow {
    private let handshake: TwoWayQRHandshakeCoordinator

    public init(handshake: TwoWayQRHandshakeCoordinator) {
        self.handshake = handshake
    }

    public func authorize(merchantIntentQR: String, context: PayerContext, nextCounter: Int) throws -> String {
        let authorization = try handshake.buildPayerAuthorization(intentQR: merchantIntentQR, context: context, counter: nextCounter)
        return authorization.qrText
    }
}
