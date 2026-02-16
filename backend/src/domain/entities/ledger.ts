import type { ISODateString } from "./common.js";

export type LedgerEntryType = "topup" | "offline_debit" | "offline_credit" | "refund" | "reversal";

export interface LedgerEntry {
  entryId: string;
  accountId: string;
  txId: string;
  type: LedgerEntryType;
  deltaCents: number;
  currency: string;
  createdAt: ISODateString;
  metadata?: Record<string, string>;
}
