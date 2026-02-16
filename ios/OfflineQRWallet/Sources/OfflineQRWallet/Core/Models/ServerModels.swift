import Foundation

public enum AccountStatus: String, Codable, Equatable {
    case active
    case frozen
}

public struct AccountProfile: Codable, Equatable {
    public var id: UUID
    public var externalIdentity: String
    public var displayName: String
    public var roles: [UserRole]
    public var status: AccountStatus
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: UUID,
        externalIdentity: String,
        displayName: String,
        roles: [UserRole],
        status: AccountStatus,
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.externalIdentity = externalIdentity
        self.displayName = displayName
        self.roles = roles
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct RefundResult: Codable, Equatable {
    public var txId: UUID
    public var payerBalance: Int
    public var merchantBalance: Int

    public init(txId: UUID, payerBalance: Int, merchantBalance: Int) {
        self.txId = txId
        self.payerBalance = payerBalance
        self.merchantBalance = merchantBalance
    }
}

public struct CardTransferChallenge: Codable, Equatable {
    public var transferId: UUID
    public var transferCode: String
    public var accountId: UUID
    public var fromDeviceId: UUID
    public var role: UserRole
    public var expiresAt: Date

    public init(
        transferId: UUID,
        transferCode: String,
        accountId: UUID,
        fromDeviceId: UUID,
        role: UserRole,
        expiresAt: Date
    ) {
        self.transferId = transferId
        self.transferCode = transferCode
        self.accountId = accountId
        self.fromDeviceId = fromDeviceId
        self.role = role
        self.expiresAt = expiresAt
    }
}

public struct CardTransferCompletion: Codable, Equatable {
    public var transferId: UUID
    public var revokedDeviceId: UUID
    public var newDevice: DeviceIdentity

    public init(transferId: UUID, revokedDeviceId: UUID, newDevice: DeviceIdentity) {
        self.transferId = transferId
        self.revokedDeviceId = revokedDeviceId
        self.newDevice = newDevice
    }
}
