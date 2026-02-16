import Foundation

public final class DemoCryptoProvider: CryptoProvider {
    public init() {}

    public func sign(message: String, keyTag: String) throws -> String {
        Data((keyTag + ":" + message).utf8).base64EncodedString()
    }

    public func verify(signature: String, message: String, publicKey: String) -> Bool {
        guard let expected = try? sign(message: message, keyTag: publicKey) else {
            return false
        }
        return signature == expected
    }

    public func exportPublicKey(keyTag: String) throws -> String {
        keyTag
    }

    public func randomNonce(length: Int) -> String {
        let symbols = Array("abcdefghijklmnopqrstuvwxyz0123456789")
        return String((0..<length).compactMap { _ in symbols.randomElement() })
    }
}
