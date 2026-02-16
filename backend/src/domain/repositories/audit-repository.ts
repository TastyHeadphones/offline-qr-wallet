import type { AuditEvent } from "../entities/audit.js";

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  listBySubject(subjectId: string, limit: number): Promise<AuditEvent[]>;
}
