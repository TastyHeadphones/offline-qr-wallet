import type { ISODateString } from "./common.js";

export interface AuditEvent {
  eventId: string;
  eventType: string;
  actorAccountId?: string;
  actorDeviceId?: string;
  subjectId: string;
  occurredAt: ISODateString;
  attributes: Record<string, string>;
}
