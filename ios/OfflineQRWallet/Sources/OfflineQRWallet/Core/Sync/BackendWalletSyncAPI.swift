import Foundation

public final class BackendWalletSyncAPI: WalletBackendAPI {
    private let baseURL: URL
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
        self.encoder.dateEncodingStrategy = .iso8601
        self.decoder.dateDecodingStrategy = .iso8601
    }

    public func createAccount(externalIdentity: String, displayName: String, roles: [UserRole]) async throws -> AccountProfile {
        let payload = CreateAccountRequest(externalIdentity: externalIdentity, displayName: displayName, roles: roles)
        let response: AccountBundleResponse = try await post(path: "/v1/accounts", payload: payload)
        return response.account.toModel()
    }

    public func registerDevice(_ request: DeviceRegistrationRequest) async throws -> DeviceIdentity {
        let response: DeviceRegisterResponse = try await post(path: "/v1/devices/register", payload: request)
        return response.device.toModel()
    }

    public func topUp(accountId: UUID, amountCents: Int, reference: String, actorAccountId: UUID?) async throws -> WalletSnapshot {
        let payload = TopUpRequest(
            accountId: accountId,
            amountCents: amountCents,
            currency: "CNY",
            reference: reference,
            actorAccountId: actorAccountId
        )
        let _: TopUpResponse = try await post(path: "/v1/wallet/topup", payload: payload)
        return try await fetchWalletSnapshot(accountId: accountId)
    }

    public func refund(originalTxId: UUID, amountCents: Int, reason: String, actorAccountId: UUID) async throws -> RefundResult {
        let payload = RefundRequest(
            originalTxId: originalTxId,
            amountCents: amountCents,
            reason: reason,
            actorAccountId: actorAccountId
        )
        let response: RefundResponse = try await post(path: "/v1/wallet/refund", payload: payload)
        return RefundResult(txId: response.txId, payerBalance: response.payerBalance, merchantBalance: response.merchantBalance)
    }

    public func freezeDevice(deviceId: UUID, reason: String, actorAccountId: UUID) async throws {
        let payload = FreezeDeviceRequest(reason: reason, actorAccountId: actorAccountId)
        let _: FreezeDeviceResponse = try await post(path: "/v1/devices/\(deviceId.uuidString)/freeze", payload: payload)
    }

    public func startCardTransfer(accountId: UUID, fromDeviceId: UUID, actorAccountId: UUID) async throws -> CardTransferChallenge {
        let payload = StartCardTransferRequest(
            accountId: accountId,
            fromDeviceId: fromDeviceId,
            actorAccountId: actorAccountId
        )
        let response: CardTransferStartResponse = try await post(path: "/v1/cards/transfer/start", payload: payload)
        return response.toModel()
    }

    public func completeCardTransfer(
        transferCode: String,
        newDevicePublicKey: String,
        keyVersion: Int,
        actorAccountId: UUID
    ) async throws -> CardTransferCompletion {
        let payload = CompleteCardTransferRequest(
            transferCode: transferCode,
            newDevicePublicKey: newDevicePublicKey,
            keyVersion: keyVersion,
            actorAccountId: actorAccountId
        )
        let response: CardTransferCompleteResponse = try await post(path: "/v1/cards/transfer/complete", payload: payload)
        return response.toModel()
    }

    public func syncOfflineTransactions(merchantDeviceId: UUID, submittedAt: Date, transactions: [SyncUploadItem]) async throws -> [SyncUploadResult] {
        let payload = OfflineSyncRequest(
            merchantDeviceId: merchantDeviceId,
            submittedAt: submittedAt,
            transactions: transactions
        )
        let response: OfflineSyncResponse = try await post(path: "/v1/offline-transactions/sync", payload: payload)
        return response.results
    }

    public func fetchWalletSnapshot(accountId: UUID) async throws -> WalletSnapshot {
        let url = makeURL(path: "/v1/wallet/\(accountId.uuidString)/balance")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let dto = try decoder.decode(WalletSnapshotDTO.self, from: data)
        return WalletSnapshot(
            accountId: dto.accountId,
            availableCents: dto.availableCents,
            updatedAt: dto.updatedAt,
            version: dto.version,
            source: .authoritativeServer
        )
    }

    private func post<RequestBody: Encodable, ResponseBody: Decodable>(path: String, payload: RequestBody) async throws -> ResponseBody {
        let url = makeURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(payload)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }

        return try decoder.decode(ResponseBody.self, from: data)
    }

    private func makeURL(path: String) -> URL {
        if path.hasPrefix("/") {
            return baseURL.appendingPathComponent(String(path.dropFirst()))
        }
        return baseURL.appendingPathComponent(path)
    }
}

private struct CreateAccountRequest: Encodable {
    var externalIdentity: String
    var displayName: String
    var roles: [UserRole]
}

private struct DeviceRegisterResponse: Decodable {
    var device: DeviceDTO
}

private struct TopUpRequest: Encodable {
    var accountId: UUID
    var amountCents: Int
    var currency: String
    var reference: String
    var actorAccountId: UUID?
}

private struct TopUpResponse: Decodable {
    var accountId: UUID
    var availableCents: Int
}

private struct RefundRequest: Encodable {
    var originalTxId: UUID
    var amountCents: Int
    var reason: String
    var actorAccountId: UUID
}

private struct RefundResponse: Decodable {
    var txId: UUID
    var payerBalance: Int
    var merchantBalance: Int
}

private struct FreezeDeviceRequest: Encodable {
    var reason: String
    var actorAccountId: UUID
}

private struct FreezeDeviceResponse: Decodable {
    var status: String
}

private struct StartCardTransferRequest: Encodable {
    var accountId: UUID
    var fromDeviceId: UUID
    var actorAccountId: UUID
}

private struct CompleteCardTransferRequest: Encodable {
    var transferCode: String
    var newDevicePublicKey: String
    var keyVersion: Int
    var actorAccountId: UUID
}

private struct AccountBundleResponse: Decodable {
    var account: AccountDTO
}

private struct AccountDTO: Decodable {
    var id: UUID
    var externalIdentity: String
    var displayName: String
    var roles: [UserRole]
    var status: AccountStatus
    var createdAt: Date
    var updatedAt: Date

    func toModel() -> AccountProfile {
        AccountProfile(
            id: id,
            externalIdentity: externalIdentity,
            displayName: displayName,
            roles: roles,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

private struct DeviceDTO: Decodable {
    var id: UUID
    var accountId: UUID
    var role: UserRole
    var publicKey: String
    var keyVersion: Int
    var status: DeviceStatus
    var registeredAt: Date
    var lastSyncAt: Date

    func toModel() -> DeviceIdentity {
        DeviceIdentity(
            deviceId: id,
            accountId: accountId,
            role: role,
            publicKey: publicKey,
            keyVersion: keyVersion,
            status: status,
            registeredAt: registeredAt,
            lastSyncAt: lastSyncAt
        )
    }
}

private struct CardTransferStartResponse: Decodable {
    var transferId: UUID
    var transferCode: String
    var accountId: UUID
    var fromDeviceId: UUID
    var role: UserRole
    var expiresAt: Date

    func toModel() -> CardTransferChallenge {
        CardTransferChallenge(
            transferId: transferId,
            transferCode: transferCode,
            accountId: accountId,
            fromDeviceId: fromDeviceId,
            role: role,
            expiresAt: expiresAt
        )
    }
}

private struct CardTransferCompleteResponse: Decodable {
    var transferId: UUID
    var revokedDeviceId: UUID
    var newDevice: DeviceDTO

    func toModel() -> CardTransferCompletion {
        CardTransferCompletion(
            transferId: transferId,
            revokedDeviceId: revokedDeviceId,
            newDevice: newDevice.toModel()
        )
    }
}

private struct OfflineSyncRequest: Encodable {
    var merchantDeviceId: UUID
    var submittedAt: Date
    var transactions: [SyncUploadItem]
}

private struct OfflineSyncResponse: Decodable {
    var results: [SyncUploadResult]
}

private struct WalletSnapshotDTO: Decodable {
    var accountId: UUID
    var availableCents: Int
    var updatedAt: Date
    var version: Int
}
