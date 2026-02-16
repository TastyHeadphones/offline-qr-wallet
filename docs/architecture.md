# High-Level Architecture (Code Baseline)

## Backend

- API layer: input validation, auth boundary (to be integrated), and transport concerns.
- Domain services: account/device lifecycle, card transfer lifecycle, wallet operations, offline transaction sync, reconciliation, audit.
- Repositories: abstract persistence interfaces currently backed by in-memory store.
- Risk policy service: centralizes offline thresholds and clock/sync checks.

## iOS Modules

- `Core/Models`: transaction/account/risk structures shared by payer/cashier roles.
- `Core/Security`: device identity setup and signing abstraction.
- `Core/QR`: QR payload codec and two-way handshake state coordinator.
- `Core/Storage`: local transaction and wallet snapshot store contracts.
- `Core/Sync`: backend server client API (provisioning/funds/risk ops/card transfer) and pending transaction sync coordinator.
- `Features/Payer` and `Features/Cashier`: role-specific orchestration built on core services.
- `Features/Admin`: freeze/recovery and card transfer orchestration.

## Payment Lifecycle in Current Code

1. Cashier builds signed merchant intent and displays QR.
2. Payer scans intent, validates policy window, signs authorization, displays QR.
3. Cashier scans authorization and creates pending-sync receipt.
4. Merchant device uploads pending transactions when online.
5. Backend validates signatures/policy/idempotency, posts ledger movements, returns statuses.
6. Client marks transaction as synced/rejected and refreshes wallet snapshot.
