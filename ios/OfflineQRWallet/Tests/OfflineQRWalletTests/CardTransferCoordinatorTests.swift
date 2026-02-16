import XCTest
@testable import OfflineQRWallet

final class CardTransferCoordinatorTests: XCTestCase {
    func testTransferFlowUsesStartThenCompleteWithNewKey() async throws {
        let accountId = UUID()
        let oldDeviceId = UUID()
        let actorId = accountId

        let mockAPI = MockWalletBackendAPI(
            challenge: CardTransferChallenge(
                transferId: UUID(),
                transferCode: "transfer-code-1234",
                accountId: accountId,
                fromDeviceId: oldDeviceId,
                role: .payer,
                expiresAt: Date().addingTimeInterval(300)
            )
        )

        let identityService = DeviceIdentityService(
            keyStore: InMemorySecureKeyStore(),
            cryptoProvider: DemoCryptoProvider()
        )

        let coordinator = CardTransferCoordinator(
            backendAPI: mockAPI,
            deviceIdentityService: identityService
        )

        let result = try await coordinator.transferToNewPhone(
            accountId: accountId,
            fromDeviceId: oldDeviceId,
            actorAccountId: actorId,
            newPhoneKeyTag: "new-phone-key",
            keyVersion: 2
        )

        XCTAssertEqual(mockAPI.lastCompleteTransferCode, "transfer-code-1234")
        XCTAssertEqual(mockAPI.lastCompletePublicKey, "new-phone-key")
        XCTAssertEqual(result.revokedDeviceId, oldDeviceId)
        XCTAssertEqual(result.newDevice.accountId, accountId)
    }
}

private final class MockWalletBackendAPI: WalletBackendAPI {
    let challenge: CardTransferChallenge
    var lastCompleteTransferCode: String?
    var lastCompletePublicKey: String?

    init(challenge: CardTransferChallenge) {
        self.challenge = challenge
    }

    func createAccount(externalIdentity: String, displayName: String, roles: [UserRole]) async throws -> AccountProfile {
        AccountProfile(
            id: challenge.accountId,
            externalIdentity: externalIdentity,
            displayName: displayName,
            roles: roles,
            status: .active,
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    func registerDevice(_ request: DeviceRegistrationRequest) async throws -> DeviceIdentity {
        DeviceIdentity(
            deviceId: UUID(),
            accountId: request.accountId,
            role: request.role,
            publicKey: request.publicKey,
            keyVersion: request.keyVersion,
            status: .active,
            registeredAt: Date(),
            lastSyncAt: Date()
        )
    }

    func topUp(accountId: UUID, amountCents: Int, reference: String, actorAccountId: UUID?) async throws -> WalletSnapshot {
        WalletSnapshot(accountId: accountId, availableCents: amountCents, updatedAt: Date(), version: 1, source: .authoritativeServer)
    }

    func refund(originalTxId: UUID, amountCents: Int, reason: String, actorAccountId: UUID) async throws -> RefundResult {
        RefundResult(txId: originalTxId, payerBalance: amountCents, merchantBalance: 0)
    }

    func freezeDevice(deviceId: UUID, reason: String, actorAccountId: UUID) async throws {}

    func startCardTransfer(accountId: UUID, fromDeviceId: UUID, actorAccountId: UUID) async throws -> CardTransferChallenge {
        challenge
    }

    func completeCardTransfer(
        transferCode: String,
        newDevicePublicKey: String,
        keyVersion: Int,
        actorAccountId: UUID
    ) async throws -> CardTransferCompletion {
        lastCompleteTransferCode = transferCode
        lastCompletePublicKey = newDevicePublicKey
        let newDevice = DeviceIdentity(
            deviceId: UUID(),
            accountId: challenge.accountId,
            role: challenge.role,
            publicKey: newDevicePublicKey,
            keyVersion: keyVersion,
            status: .active,
            registeredAt: Date(),
            lastSyncAt: Date()
        )
        return CardTransferCompletion(
            transferId: challenge.transferId,
            revokedDeviceId: challenge.fromDeviceId,
            newDevice: newDevice
        )
    }

    func syncOfflineTransactions(merchantDeviceId: UUID, submittedAt: Date, transactions: [SyncUploadItem]) async throws -> [SyncUploadResult] {
        []
    }

    func fetchWalletSnapshot(accountId: UUID) async throws -> WalletSnapshot {
        WalletSnapshot(accountId: accountId, availableCents: 0, updatedAt: Date(), version: 0, source: .authoritativeServer)
    }
}
