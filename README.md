# offline-qr-wallet

Baseline implementation for a closed-loop wallet with IC-card-like top-up and offline debit using two-way QR exchange between iPhones.

## Repository Layout

- `backend/`: TypeScript REST backend for provisioning, top-up, offline transaction sync, reconciliation, and audit.
- `ios/OfflineQRWallet/`: Swift package with iOS client modules (key identity, two-way QR handshake, local journal, sync abstraction).
- `docs/`: high-level architecture notes.

## Quick Start

### 1) Backend

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:8080` by default.

### 2) iOS Client Module

Open `ios/OfflineQRWallet/Package.swift` in Xcode and integrate the `OfflineQRWallet` library into payer/cashier app targets.

### 3) Run Tests

```bash
cd /Users/young/Github/offline-qr-wallet/backend
npm test

cd /Users/young/Github/offline-qr-wallet/ios/OfflineQRWallet
swift test
```

## Implemented Capabilities (Initial Baseline)

- Account creation and role binding (`payer`, `cashier`, `admin`)
- Device registration and freeze flow
- Card transfer flow (`start` + `complete`) for moving wallet card authority to a new phone while revoking the old device
- Wallet top-up and balance query
- Offline transaction sync ingestion with idempotency handling
- Risk checks (per-transaction limit, daily spend limit, sync freshness, clock skew)
- Refund support
- Reconciliation summary endpoint
- Transaction history and audit log query
- Swift two-way QR handshake coordinator (`intent -> authorization -> receipt`)
- Local transaction persistence contracts and in-memory stores
- Async sync coordinator API for uploading pending offline transactions
- Swift backend API client for provisioning, top-up, refund, freeze, card transfer, balance, and offline sync

## Current Scope Notes

- Storage is in-memory for fast prototyping; replace repository implementations with a persistent DB.
- Signature verification is a scaffold verifier; replace with real asymmetric signature verification before production.
- Swift crypto/key store currently has demo implementations and protocol boundaries for Secure Enclave + Keychain integration.

## App Icon Generation (ImageGen)

Use the bundled ImageGen script (requires `OPENAI_API_KEY`):

```bash
cd /Users/young/Github/offline-qr-wallet
./scripts/generate_app_icon.sh
```

Generated icon path:

- `ios/OfflineQRWallet/Resources/AppIcon/offline-qr-wallet-icon.png`
