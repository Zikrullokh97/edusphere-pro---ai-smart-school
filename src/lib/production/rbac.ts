import { ForbiddenError, UnauthorizedError, ValidationError } from "./errors.js";
import type { Actor, Role } from "./types.js";

export function requireActor(actor?: Actor | null): Actor {
  if (!actor?.uid || !actor.role || !actor.schoolId) {
    throw new UnauthorizedError("Authentication required");
  }
  return actor;
}

export function requireRole(actor: Actor, ...roles: Role[]): Actor {
  const current = requireActor(actor);
  if (!roles.includes(current.role)) {
    throw new ForbiddenError("Unauthorized role");
  }
  return current;
}

export function assertSameSchool(actor: Actor, schoolId: unknown): void {
  if (typeof schoolId === "string" && schoolId && schoolId !== actor.schoolId) {
    throw new ForbiddenError("Cross-school access denied");
  }
}

export function rejectClientOwnershipFields(payload: Record<string, unknown>): void {
  const forbidden = ["schoolId", "ownerId", "createdBy", "archivedBy", "archivedAt"];
  for (const key of forbidden) {
    if (key in payload) delete payload[key];
  }
}

export function classKey(value: unknown): string {
  return String(value || "").trim();
}

export function teacherOwnsClass(actor: Actor, className: unknown): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role !== "TEACHER") return false;
  const name = classKey(className);
  if (!name) return false;
  const assigned = actor.assignedClasses || [];
  return assigned.includes(name) || actor.homeroomClass === name;
}

export function parentOwnsStudent(actor: Actor, studentId: unknown): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role !== "PARENT_STUDENT") return false;
  const id = String(studentId || "");
  const allowed = [actor.studentId, ...(actor.childrenIds || [])].filter(Boolean);
  return allowed.includes(id);
}

export function requireNonEmpty(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(message);
  return value.trim();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
