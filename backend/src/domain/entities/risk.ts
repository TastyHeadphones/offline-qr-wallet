export interface RiskPolicy {
  maxPerTransactionCents: number;
  maxPerDayPerPayerCents: number;
  maxUnsyncedPerMerchant: number;
  maxSyncAgeHours: number;
  maxClockSkewSeconds: number;
}
