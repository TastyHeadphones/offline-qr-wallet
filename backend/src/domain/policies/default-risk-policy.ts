import type { RiskPolicy } from "../entities/risk.js";

export const defaultRiskPolicy: RiskPolicy = {
  maxPerTransactionCents: 10_000,
  maxPerDayPerPayerCents: 50_000,
  maxUnsyncedPerMerchant: 1_000,
  maxSyncAgeHours: 48,
  maxClockSkewSeconds: 300,
};
