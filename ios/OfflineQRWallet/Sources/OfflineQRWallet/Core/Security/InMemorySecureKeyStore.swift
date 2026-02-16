import Foundation

public final class InMemorySecureKeyStore: SecureKeyStore {
    private var keys: Set<String> = []

    public init() {}

    public func ensureSigningKey(keyTag: String) throws {
        keys.insert(keyTag)
    }

    public func deleteSigningKey(keyTag: String) throws {
        keys.remove(keyTag)
    }
}
