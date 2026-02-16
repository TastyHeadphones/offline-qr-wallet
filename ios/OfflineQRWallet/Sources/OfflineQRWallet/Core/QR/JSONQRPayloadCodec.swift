import Foundation

public enum QRCodecError: Error {
    case invalidEnvelope
    case invalidPayload
}

public final class JSONQRPayloadCodec: QRPayloadCodec {
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init() {
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    public func encode<T: Encodable>(_ model: T, as type: QRPayloadType) throws -> String {
        let payloadData = try encoder.encode(model)
        let envelope = QRPayloadEnvelope(
            type: type,
            payload: payloadData.base64EncodedString(),
            createdAt: Date()
        )
        let envelopeData = try encoder.encode(envelope)
        return envelopeData.base64EncodedString()
    }

    public func decode<T: Decodable>(_ text: String, to type: T.Type) throws -> T {
        guard let envelopeData = Data(base64Encoded: text) else {
            throw QRCodecError.invalidEnvelope
        }
        let envelope = try decoder.decode(QRPayloadEnvelope.self, from: envelopeData)
        guard let payloadData = Data(base64Encoded: envelope.payload) else {
            throw QRCodecError.invalidPayload
        }
        return try decoder.decode(type, from: payloadData)
    }
}
