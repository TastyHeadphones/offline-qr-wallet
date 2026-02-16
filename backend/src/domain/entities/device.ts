import type { AccountRole } from "./account.js";
import type { ISODateString } from "./common.js";

export type DeviceStatus = "active" | "frozen" | "revoked";

export interface Device {
  id: string;
  accountId: string;
  role: AccountRole;
  publicKey: string;
  keyVersion: number;
  status: DeviceStatus;
  registeredAt: ISODateString;
  lastSyncAt: ISODateString;
  freezeReason?: string;
}
