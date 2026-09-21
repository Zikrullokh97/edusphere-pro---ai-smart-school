import type { StoredRecord } from "./types.js";

export type StoreFilter = {
  field: string;
  op: "==" | "!=" | "in" | "array-contains";
  value: unknown;
};

export interface ProductionStore {
  get(collection: string, id: string): Promise<StoredRecord | null>;
  query(collection: string, filters?: StoreFilter[]): Promise<StoredRecord[]>;
  set(collection: string, id: string, data: StoredRecord): Promise<void>;
  deleteHard(collection: string, id: string): Promise<void>;
  runTransaction<T>(fn: (tx: ProductionStore) => Promise<T>): Promise<T>;
}

function matches(doc: StoredRecord, filters: StoreFilter[] = []): boolean {
  return filters.every((filter) => {
    const current = doc[filter.field];
    if (filter.op === "==") return current === filter.value;
    if (filter.op === "!=") return current !== filter.value;
    if (filter.op === "in") return Array.isArray(filter.value) && filter.value.includes(current);
    if (filter.op === "array-contains") return Array.isArray(current) && current.includes(filter.value);
    return false;
  });
}

export class MemoryStore implements ProductionStore {
  constructor(private readonly buckets: Record<string, StoredRecord[]>) {}

  private col(name: string): StoredRecord[] {
    if (!this.buckets[name]) this.buckets[name] = [];
    return this.buckets[name];
  }

  async get(collection: string, id: string): Promise<StoredRecord | null> {
    return this.col(collection).find((item) => item.id === id) || null;
  }

  async query(collection: string, filters: StoreFilter[] = []): Promise<StoredRecord[]> {
    return this.col(collection).filter((item) => matches(item, filters)).map((item) => ({ ...item }));
  }

  async set(collection: string, id: string, data: StoredRecord): Promise<void> {
    const list = this.col(collection);
    const idx = list.findIndex((item) => item.id === id);
    const record = { ...data, id };
    if (idx === -1) list.push(record);
    else list[idx] = record;
  }

  async deleteHard(collection: string, id: string): Promise<void> {
    this.buckets[collection] = this.col(collection).filter((item) => item.id !== id);
  }

  async runTransaction<T>(fn: (tx: ProductionStore) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

export class FirestoreStore implements ProductionStore {
  constructor(private readonly db: any) {}

  async get(collection: string, id: string): Promise<StoredRecord | null> {
    const snap = await this.db.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  async query(collection: string, filters: StoreFilter[] = []): Promise<StoredRecord[]> {
    let ref: any = this.db.collection(collection);
    for (const filter of filters) {
      ref = ref.where(filter.field, filter.op, filter.value);
    }
    const snap = await ref.get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  async set(collection: string, id: string, data: StoredRecord): Promise<void> {
    await this.db.collection(collection).doc(id).set({ ...data, id }, { merge: true });
  }

  async deleteHard(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }

  async runTransaction<T>(fn: (tx: ProductionStore) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async () => fn(this));
  }
}

export function createProductionStore(adminDb: any | null, memoryBuckets: Record<string, any[]>): ProductionStore {
  if (adminDb) return new FirestoreStore(adminDb);
  return new MemoryStore(memoryBuckets as Record<string, StoredRecord[]>);
}
