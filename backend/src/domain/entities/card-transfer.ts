import type { AccountRole } from "./account.js";
import type { ISODateString } from "./common.js";

export type CardTransferStatus = "pending" | "completed" | "expired" | "canceled";

export interface CardTransferSession {
  transferId: string;
  transferCode: string;
  accountId: string;
  fromDeviceId: string;
  role: AccountRole;
  status: CardTransferStatus;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  completedAt?: ISODateString;
  newDeviceId?: string;
}
