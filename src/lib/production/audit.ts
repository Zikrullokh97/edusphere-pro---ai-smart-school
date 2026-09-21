import { nowIso } from "./rbac.js";
import type { Actor, StoredRecord } from "./types.js";

const SENSITIVE = new Set([
  "password",
  "tempPassword",
  "faceEmbedding",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "iin",
]);

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.length > 20 ? `[array:${value.length}]` : value.map(redact);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE.has(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redact(item);
  }
  return out;
}

export function buildAuditRecord(input: {
  actor: Actor;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}): StoredRecord {
  const id = `aud-${input.entity}-${input.entityId}-${input.action}-${Date.now().toString(16)}`;
  return {
    id,
    schoolId: input.actor.schoolId,
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    oldValue: input.oldValue === undefined ? undefined : redact(input.oldValue),
    newValue: input.newValue === undefined ? undefined : redact(input.newValue),
    timestamp: nowIso(),
    immutable: true,
    schemaVersion: 1,
  };
}
