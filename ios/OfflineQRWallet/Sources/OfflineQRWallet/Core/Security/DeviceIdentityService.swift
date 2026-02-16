import Foundation

public struct DeviceRegistrationRequest: Codable, Equatable {
    public var accountId: UUID
    public var role: UserRole
    public var publicKey: String
    public var keyVersion: Int

    public init(accountId: UUID, role: UserRole, publicKey: String, keyVersion: Int) {
        self.accountId = accountId
        self.role = role
        self.publicKey = publicKey
        self.keyVersion = keyVersion
    }
}

public final class DeviceIdentityService {
    private let keyStore: SecureKeyStore
    private let cryptoProvider: CryptoProvider

    public init(keyStore: SecureKeyStore, cryptoProvider: CryptoProvider) {
        self.keyStore = keyStore
        self.cryptoProvider = cryptoProvider
    }

    public func prepareRegistration(accountId: UUID, role: UserRole, keyTag: String, keyVersion: Int) throws -> DeviceRegistrationRequest {
        try keyStore.ensureSigningKey(keyTag: keyTag)
        let publicKey = try cryptoProvider.exportPublicKey(keyTag: keyTag)
        return DeviceRegistrationRequest(accountId: accountId, role: role, publicKey: publicKey, keyVersion: keyVersion)
    }
}
