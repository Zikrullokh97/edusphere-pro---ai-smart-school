import type { Response } from "express";
import { isAppError } from "./errors.js";

export function sendRepoError(res: Response, error: unknown) {
  if (isAppError(error)) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  const lower = message.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("mavjud") || lower.includes("allaqachon")) {
    return res.status(409).json({ error: message, code: "CONFLICT" });
  }
  if (lower.includes("topilmadi") || lower.includes("not found")) {
    return res.status(404).json({ error: message, code: "NOT_FOUND" });
  }
  if (lower.includes("403") || lower.includes("denied") || lower.includes("forbidden")) {
    return res.status(403).json({ error: message, code: "FORBIDDEN" });
  }
  console.error("Production repository error:", error);
  return res.status(500).json({ error: message, code: "INTERNAL" });
}

export function okItem(res: Response, item: unknown, status = 200) {
  return res.status(status).json({ success: true, item, data: item, items: Array.isArray(item) ? item : undefined });
}
