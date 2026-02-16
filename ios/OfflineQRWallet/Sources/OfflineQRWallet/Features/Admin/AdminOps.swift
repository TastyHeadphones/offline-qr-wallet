import Foundation

public struct DeviceFreezeRequest: Equatable {
    public var deviceId: UUID
    public var reason: String
    public var actorAccountId: UUID

    public init(deviceId: UUID, reason: String, actorAccountId: UUID) {
        self.deviceId = deviceId
        self.reason = reason
        self.actorAccountId = actorAccountId
    }
}

public struct CardTransferRequest: Equatable {
    public var accountId: UUID
    public var fromDeviceId: UUID
    public var actorAccountId: UUID

    public init(accountId: UUID, fromDeviceId: UUID, actorAccountId: UUID) {
        self.accountId = accountId
        self.fromDeviceId = fromDeviceId
        self.actorAccountId = actorAccountId
    }
}

public final class AdminOps {
    public init() {}

    public func validateFreezeRequest(_ request: DeviceFreezeRequest) -> Bool {
        !request.reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public func validateCardTransferRequest(_ request: CardTransferRequest) -> Bool {
        request.accountId == request.actorAccountId
    }
}
