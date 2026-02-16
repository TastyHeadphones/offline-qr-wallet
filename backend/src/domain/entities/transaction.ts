import type { ISODateString } from "./common.js";

export type OfflineTransactionStatus =
  | "accepted"
  | "rejected"
  | "duplicate"
  | "reconciled"
  | "reversed";

export interface OfflineTransaction {
  txId: string;
  idempotencyKey: string;
  merchantIntentId: string;
  payerAuthorizationId: string;
  merchantAccountId: string;
  payerAccountId: string;
  merchantDeviceId: string;
  payerDeviceId: string;
  amountCents: number;
  currency: string;
  merchantNonce: string;
  payerNonce: string;
  merchantCounter: number;
  payerCounter: number;
  intentIssuedAt: ISODateString;
  authorizationIssuedAt: ISODateString;
  expiresAt: ISODateString;
  merchantSignature: string;
  payerSignature: string;
  merchantClientSubmittedAt: ISODateString;
  status: OfflineTransactionStatus;
  failureReason?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OfflineTransactionResult {
  txId: string;
  status: OfflineTransactionStatus;
  reason?: string;
  walletAfter?: {
    payerAvailableCents: number;
    merchantAvailableCents: number;
  };
}
