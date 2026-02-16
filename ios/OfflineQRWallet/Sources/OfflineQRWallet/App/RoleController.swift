import Foundation

public final class RoleController {
    public init() {}

    public func allowedActions(for role: UserRole) -> [String] {
        switch role {
        case .payer:
            return ["scan_merchant_intent", "show_balance", "view_history"]
        case .cashier:
            return ["create_intent", "scan_authorization", "sync_transactions", "view_shift_summary"]
        case .admin:
            return ["freeze_device", "card_transfer", "topup", "refund", "view_audit", "manage_roles"]
        }
    }
}
