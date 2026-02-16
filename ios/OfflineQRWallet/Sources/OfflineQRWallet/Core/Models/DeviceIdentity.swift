import Foundation

public enum DeviceStatus: String, Codable {
    case active
    case frozen
    case revoked
}

public struct DeviceIdentity: Codable, Equatable {
    public var deviceId: UUID
    public var accountId: UUID
    public var role: UserRole
    public var publicKey: String
    public var keyVersion: Int
    public var status: DeviceStatus
    public var registeredAt: Date
    public var lastSyncAt: Date

    public init(
        deviceId: UUID,
        accountId: UUID,
        role: UserRole,
        publicKey: String,
        keyVersion: Int,
        status: DeviceStatus,
        registeredAt: Date,
        lastSyncAt: Date
    ) {
        self.deviceId = deviceId
        self.accountId = accountId
        self.role = role
        self.publicKey = publicKey
        self.keyVersion = keyVersion
        self.status = status
        self.registeredAt = registeredAt
        self.lastSyncAt = lastSyncAt
    }
}
