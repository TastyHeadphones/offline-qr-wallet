# Backend API (Initial Scaffold)

## Start

```bash
cd /Users/young/Github/offline-qr-wallet/backend
npm install
npm run dev
```

Base URL: `http://localhost:8080`

## Main Endpoints

- `POST /v1/accounts`
- `POST /v1/devices/register`
- `POST /v1/devices/:deviceId/freeze`
- `POST /v1/cards/transfer/start`
- `POST /v1/cards/transfer/complete`
- `POST /v1/wallet/topup`
- `GET /v1/wallet/:accountId/balance`
- `POST /v1/offline-transactions/sync`
- `POST /v1/wallet/refund`
- `POST /v1/settlements/reconcile`
- `GET /v1/history/:accountId`
- `GET /v1/audit/:subjectId`

## Minimal Flow Example

1. Create payer account + merchant account.
2. Register a device for each account.
3. Top up payer wallet.
4. Upload offline transactions via `/v1/offline-transactions/sync`.
5. Query balances/history.
6. (Optional) transfer card to a new phone with `/v1/cards/transfer/start` then `/v1/cards/transfer/complete`.
7. Reconcile at end of day with `/v1/settlements/reconcile`.

## Notes

- Persistence is in-memory in this baseline.
- Signature verification is stubbed and must be replaced with real asymmetric verification.
- Risk policy is centrally enforced in sync ingestion.
