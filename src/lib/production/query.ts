export type PageQuery = {
  limit?: unknown;
  cursor?: unknown;
  includeArchived?: unknown;
};

export type PageMeta = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type PageResult<T> = {
  items: T[];
  page: PageMeta;
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export function parseLimit(value: unknown, fallback = DEFAULT_LIMIT): number {
  const raw = typeof value === "string" ? Number(value) : typeof value === "number" ? value : fallback;
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(MAX_LIMIT, Math.floor(raw));
}

export function applyPage<T extends { id?: string }>(items: T[], query: PageQuery = {}): PageResult<T> {
  const limit = parseLimit(query.limit);
  const cursor = typeof query.cursor === "string" ? query.cursor : "";
  let start = 0;
  if (cursor) {
    const idx = items.findIndex((item) => item.id === cursor);
    start = idx === -1 ? 0 : idx + 1;
  }
  const slice = items.slice(start, start + limit);
  const last = slice[slice.length - 1];
  const hasMore = start + slice.length < items.length;
  return {
    items: slice,
    page: {
      limit,
      nextCursor: hasMore && last?.id ? String(last.id) : null,
      hasMore,
    },
  };
}

export function wantsArchived(query: PageQuery): boolean {
  const value = query.includeArchived;
  return value === true || value === "true" || value === "1";
}
