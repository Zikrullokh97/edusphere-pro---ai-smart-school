import { ConflictError, isAppError } from "./errors.js";
import type { Actor, StoredRecord } from "./types.js";
import type { ProductionRepos } from "./schoolDataService.js";

export type SyncAction = {
  id?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

export type SyncResult = {
  duplicate: boolean;
  result: {
    status: "synced";
    entity: "attendance" | "grades";
    entityId: string;
    version?: number;
    source?: string;
  };
};

const seen = new Map<string, SyncResult>();

function idempotencyKey(actor: Actor, action: SyncAction): string {
  return `${actor.uid}:${String(action.id || "")}`;
}

function academicPayload(action: SyncAction): Record<string, unknown> {
  const payload = { ...(action.payload || {}) };
  if (payload.submission && typeof payload.submission === "object") {
    Object.assign(payload, payload.submission as Record<string, unknown>);
  }
  return payload;
}

function scoreFrom(payload: Record<string, unknown>): number | undefined {
  const raw = payload.score ?? payload.average ?? payload.updatedAverage ?? payload.value;
  const score = Number(raw);
  return Number.isFinite(score) ? score : undefined;
}

function attendanceSource(payload: Record<string, unknown>): string {
  return String(payload.method || payload.source || payload.verifiedVia || payload.verificationMethod || "manual");
}

async function syncAttendance(repos: ProductionRepos, actor: Actor, payload: Record<string, unknown>): Promise<StoredRecord> {
  const studentId = String(payload.studentId || "");
  const className = String(payload.className || payload.classId || payload.grade || "");
  const date = String(payload.date || "");
  const method = attendanceSource(payload);
  const body = { ...payload, className, method, source: method };
  try {
    return await repos.attendance.markAttendance(actor, body);
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
    const existing = await repos.attendance.listAttendance(actor, { studentId, className, date });
    const current = existing[0];
    if (!current) throw error;
    if (payload.status && current.status === String(payload.status).toLowerCase()) return current;
    return repos.attendance.updateAttendance(actor, current.id, body);
  }
}

async function syncGrade(repos: ProductionRepos, actor: Actor, payload: Record<string, unknown>): Promise<StoredRecord> {
  const score = scoreFrom(payload);
  const body = {
    ...payload,
    score: score ?? payload.score,
    average: score ?? payload.average,
    method: payload.method || payload.source || payload.field || "sync",
    source: payload.source || payload.method || "sync",
  };
  try {
    return await repos.grades.createGrade(actor, body);
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
    const listed = await repos.grades.listGrades(actor, {
      studentId: payload.studentId,
      className: payload.className || payload.classId,
      subject: payload.subject || payload.subjectId,
    });
    const current = listed[0];
    if (!current) throw error;
    return repos.grades.updateGrade(actor, current.id, body);
  }
}

export function isAcademicSyncAction(type: unknown): boolean {
  const value = String(type || "");
  return value.startsWith("attendance") || value.startsWith("grade");
}

export async function persistAcademicSync(
  repos: ProductionRepos,
  actor: Actor,
  action: SyncAction,
): Promise<SyncResult> {
  const key = idempotencyKey(actor, action);
  const cached = seen.get(key);
  if (action.id && cached) return { duplicate: true, result: cached.result };

  const type = String(action.type || "");
  const payload = academicPayload(action);
  payload.source = payload.source || payload.method || type;

  let item: StoredRecord;
  let entity: "attendance" | "grades";
  if (type === "attendance_batch") {
    const records = Array.isArray(payload.records) ? payload.records : [payload];
    let last: StoredRecord | null = null;
    for (const record of records) {
      last = await syncAttendance(repos, actor, { ...payload, ...(record as Record<string, unknown>) });
    }
    if (!last) throw new ConflictError("Empty attendance batch");
    item = last;
    entity = "attendance";
  } else if (type.startsWith("attendance")) {
    item = await syncAttendance(repos, actor, payload);
    entity = "attendance";
  } else if (type === "grade_batch") {
    const records = Array.isArray(payload.records) ? payload.records : [payload];
    let last: StoredRecord | null = null;
    for (const record of records) {
      last = await syncGrade(repos, actor, { ...payload, ...(record as Record<string, unknown>) });
    }
    if (!last) throw new ConflictError("Empty grade batch");
    item = last;
    entity = "grades";
  } else if (type.startsWith("grade")) {
    item = await syncGrade(repos, actor, payload);
    entity = "grades";
  } else {
    throw new ConflictError("Unsupported academic sync type");
  }

  const result: SyncResult = {
    duplicate: false,
    result: {
      status: "synced",
      entity,
      entityId: item.id,
      version: Number(item.version || 1),
      source: String(payload.source || type),
    },
  };
  if (action.id) seen.set(key, result);
  return result;
}

export function syncErrorStatus(error: unknown): number {
  if (isAppError(error)) return error.status;
  return 400;
}
