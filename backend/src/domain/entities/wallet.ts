import type { ISODateString } from "./common.js";

export interface Wallet {
  accountId: string;
  availableCents: number;
  updatedAt: ISODateString;
  version: number;
}
