import Foundation

public protocol CryptoProvider {
    func sign(message: String, keyTag: String) throws -> String
    func verify(signature: String, message: String, publicKey: String) -> Bool
    func exportPublicKey(keyTag: String) throws -> String
    func randomNonce(length: Int) -> String
}

public protocol SecureKeyStore {
    func ensureSigningKey(keyTag: String) throws
    func deleteSigningKey(keyTag: String) throws
}
