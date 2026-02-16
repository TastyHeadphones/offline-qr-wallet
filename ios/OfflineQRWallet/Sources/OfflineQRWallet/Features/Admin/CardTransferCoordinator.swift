import Foundation

public final class CardTransferCoordinator {
    private let backendAPI: WalletBackendAPI
    private let deviceIdentityService: DeviceIdentityService

    public init(backendAPI: WalletBackendAPI, deviceIdentityService: DeviceIdentityService) {
        self.backendAPI = backendAPI
        self.deviceIdentityService = deviceIdentityService
    }

    public func transferToNewPhone(
        accountId: UUID,
        fromDeviceId: UUID,
        actorAccountId: UUID,
        newPhoneKeyTag: String,
        keyVersion: Int
    ) async throws -> CardTransferCompletion {
        let challenge = try await backendAPI.startCardTransfer(
            accountId: accountId,
            fromDeviceId: fromDeviceId,
            actorAccountId: actorAccountId
        )

        let registration = try deviceIdentityService.prepareRegistration(
            accountId: challenge.accountId,
            role: challenge.role,
            keyTag: newPhoneKeyTag,
            keyVersion: keyVersion
        )

        return try await backendAPI.completeCardTransfer(
            transferCode: challenge.transferCode,
            newDevicePublicKey: registration.publicKey,
            keyVersion: registration.keyVersion,
            actorAccountId: actorAccountId
        )
    }
}
