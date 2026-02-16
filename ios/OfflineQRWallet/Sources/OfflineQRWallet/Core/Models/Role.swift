import Foundation

public enum UserRole: String, Codable, CaseIterable {
    case payer
    case cashier
    case admin
}
