import Foundation

public enum QRPayloadType: String, Codable {
    case paymentIntent
    case paymentAuthorization
    case paymentReceipt
}

public struct QRPayloadEnvelope: Codable, Equatable {
    public var type: QRPayloadType
    public var payload: String
    public var createdAt: Date

    public init(type: QRPayloadType, payload: String, createdAt: Date) {
        self.type = type
        self.payload = payload
        self.createdAt = createdAt
    }
}

public protocol QRPayloadCodec {
    func encode<T: Encodable>(_ model: T, as type: QRPayloadType) throws -> String
    func decode<T: Decodable>(_ text: String, to type: T.Type) throws -> T
}
