import type { ISODateString } from "./common.js";

export type AccountRole = "payer" | "cashier" | "admin";
export type AccountStatus = "active" | "frozen";

export interface Account {
  id: string;
  externalIdentity: string;
  displayName: string;
  roles: AccountRole[];
  status: AccountStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
