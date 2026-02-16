import { v7 as uuidv7 } from "uuid";
import { nowIso } from "../entities/common.js";
import type { AuditRepository } from "../repositories/audit-repository.js";

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async append(eventType: string, subjectId: string, attributes: Record<string, string>, actor?: { accountId?: string; deviceId?: string }): Promise<void> {
    await this.auditRepository.append({
      eventId: uuidv7(),
      eventType,
      actorAccountId: actor?.accountId,
      actorDeviceId: actor?.deviceId,
      subjectId,
      attributes,
      occurredAt: nowIso(),
    });
  }

  async listBySubject(subjectId: string, limit: number): Promise<readonly unknown[]> {
    return this.auditRepository.listBySubject(subjectId, limit);
  }
}
