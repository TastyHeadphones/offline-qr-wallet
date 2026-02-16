import type { RiskPolicy } from "../entities/risk.js";
import type { Device } from "../entities/device.js";

export class RiskPolicyService {
  constructor(private readonly policy: RiskPolicy) {}

  get snapshot(): RiskPolicy {
    return this.policy;
  }

  isClockSkewAcceptable(referenceIso: string, candidateIso: string): boolean {
    const reference = new Date(referenceIso).getTime();
    const candidate = new Date(candidateIso).getTime();
    const diffSeconds = Math.abs(reference - candidate) / 1_000;
    return diffSeconds <= this.policy.maxClockSkewSeconds;
  }

  isWithinTransactionLimit(amountCents: number): boolean {
    return amountCents > 0 && amountCents <= this.policy.maxPerTransactionCents;
  }

  hasFreshSync(device: Device, nowIsoTimestamp: string): boolean {
    const now = new Date(nowIsoTimestamp).getTime();
    const lastSync = new Date(device.lastSyncAt).getTime();
    const ageHours = (now - lastSync) / (1_000 * 60 * 60);
    return ageHours <= this.policy.maxSyncAgeHours;
  }

  withinDailyLimit(currentDaySpentCents: number, newAmountCents: number): boolean {
    return currentDaySpentCents + newAmountCents <= this.policy.maxPerDayPerPayerCents;
  }

  withinUnsyncedLimit(currentUnsyncedCount: number): boolean {
    return currentUnsyncedCount <= this.policy.maxUnsyncedPerMerchant;
  }
}
