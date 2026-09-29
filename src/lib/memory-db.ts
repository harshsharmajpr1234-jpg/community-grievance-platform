import { randomUUID } from "node:crypto";

type Doc = Record<string, any>;

function matchDoc(doc: Doc, filter: Doc): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  if (filter.$or && Array.isArray(filter.$or)) {
    const matchOr = filter.$or.some((subFilter: Doc) => matchDoc(doc, subFilter));
    if (!matchOr) return false;
  }

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      if ("$in" in value && Array.isArray(value.$in)) {
        if (!value.$in.includes(doc[key])) return false;
      } else if ("$nin" in value && Array.isArray(value.$nin)) {
        if (value.$nin.includes(doc[key])) return false;
      } else if ("$ne" in value) {
        if (doc[key] === value.$ne) return false;
      } else if ("$regex" in value) {
        const re = new RegExp(value.$regex, value.$options || "i");
        if (!re.test(String(doc[key] ?? ""))) return false;
      } else if ("$gte" in value || "$lte" in value || "$gt" in value || "$lt" in value) {
        const val = doc[key];
        if (value.$gte !== undefined && val < value.$gte) return false;
        if (value.$lte !== undefined && val > value.$lte) return false;
        if (value.$gt !== undefined && val <= value.$gt) return false;
        if (value.$lt !== undefined && val >= value.$lt) return false;
      }
    } else {
      if (doc[key] !== value) return false;
    }
  }
  return true;
}

export class InMemoryCollection<T extends Doc = Doc> {
  private docs: T[] = [];
  private uniqueIndexes: Array<Record<string, number>> = [];

  constructor(public name: string) {}

  async createIndex(keys: Record<string, number>, opts?: { unique?: boolean; sparse?: boolean }) {
    if (opts?.unique) {
      const exists = this.uniqueIndexes.some((idx) => Object.keys(idx).join(",") === Object.keys(keys).join(","));
      if (!exists) this.uniqueIndexes.push(keys);
    }
    return `${this.name}_${Object.keys(keys).join("_")}`;
  }

  private checkUniqueConstraint(doc: T, excludeIndex = -1) {
    for (const keys of this.uniqueIndexes) {
      for (const key of Object.keys(keys)) {
        const val = doc[key];
        if (val !== undefined && val !== null && val !== "") {
          const dupIdx = this.docs.findIndex((d, idx) => idx !== excludeIndex && d[key] === val);
          if (dupIdx !== -1) {
            const err = new Error(`E11000 duplicate key error collection: ${this.name} index: ${key}_1 dup key: { ${key}: "${val}" }`);
            (err as any).code = 11000;
            (err as any).keyPattern = { [key]: 1 };
            throw err;
          }
        }
      }
    }
  }

  async findOne(filter: Doc = {}): Promise<T | null> {
    const item = this.docs.find((d) => matchDoc(d, filter));
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  find(filter: Doc = {}) {
    let result = this.docs.filter((d) => matchDoc(d, filter));

    const cursor = {
      sort(sortObj: Record<string, number>) {
        const keys = Object.keys(sortObj);
        if (keys.length > 0) {
          result.sort((a, b) => {
            for (const k of keys) {
              const dir = sortObj[k];
              const aVal = a[k] instanceof Date ? a[k].getTime() : a[k];
              const bVal = b[k] instanceof Date ? b[k].getTime() : b[k];
              if (aVal < bVal) return dir > 0 ? -1 : 1;
              if (aVal > bVal) return dir > 0 ? 1 : -1;
            }
            return 0;
          });
        }
        return cursor;
      },
      skip(n: number) {
        result = result.slice(n);
        return cursor;
      },
      limit(n: number) {
        result = result.slice(0, n);
        return cursor;
      },
      async toArray(): Promise<T[]> {
        return JSON.parse(JSON.stringify(result));
      },
      async *[Symbol.asyncIterator]() {
        for (const doc of result) {
          yield JSON.parse(JSON.stringify(doc));
        }
      },
    };
    return cursor;
  }

  async insertOne(doc: T) {
    const newDoc: Record<string, any> = { ...doc };
    if (!newDoc._id) newDoc._id = randomUUID();
    if (!newDoc.id) newDoc.id = newDoc._id;

    this.checkUniqueConstraint(newDoc as T);
    this.docs.push(newDoc as T);
    return { acknowledged: true, insertedId: newDoc._id };
  }

  async insertMany(docs: T[]) {
    const insertedIds: any[] = [];
    for (const doc of docs) {
      const res = await this.insertOne(doc);
      insertedIds.push(res.insertedId);
    }
    return { acknowledged: true, insertedCount: docs.length, insertedIds };
  }

  async updateOne(filter: Doc, update: Doc, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((d) => matchDoc(d, filter));
    if (index === -1) {
      if (options?.upsert) {
        const newDoc: any = {};
        if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
        if (update.$set) Object.assign(newDoc, update.$set);
        if (!newDoc.id) newDoc.id = randomUUID();
        await this.insertOne(newDoc as T);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc.id };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const doc: Record<string, any> = { ...this.docs[index] };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        doc[k] = (Number(doc[k]) || 0) + Number(v);
      }
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        if (!Array.isArray(doc[k])) doc[k] = [];
        doc[k].push(v);
      }
    }
    this.checkUniqueConstraint(doc as T, index);
    this.docs[index] = doc as T;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async updateMany(filter: Doc, update: Doc) {
    let modified = 0;
    for (let i = 0; i < this.docs.length; i++) {
      if (matchDoc(this.docs[i], filter)) {
        if (update.$set) Object.assign(this.docs[i] as Record<string, any>, update.$set);
        modified++;
      }
    }
    return { acknowledged: true, matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter: Doc) {
    const index = this.docs.findIndex((d) => matchDoc(d, filter));
    if (index !== -1) {
      this.docs.splice(index, 1);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter: Doc) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matchDoc(d, filter));
    const deletedCount = before - this.docs.length;
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(filter: Doc = {}): Promise<number> {
    return this.docs.filter((d) => matchDoc(d, filter)).length;
  }
}

class InMemoryDb {
  private collectionsMap = new Map<string, InMemoryCollection<any>>();

  collection<T extends Doc = Doc>(name: string): InMemoryCollection<T> {
    if (!this.collectionsMap.has(name)) {
      this.collectionsMap.set(name, new InMemoryCollection<T>(name));
    }
    return this.collectionsMap.get(name)!;
  }

  async command(cmd: Record<string, any>) {
    if (cmd.ping) return { ok: 1 };
    return { ok: 1 };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _inMemoryDbInstance: InMemoryDb | undefined;
}

export function getInMemoryDb(): InMemoryDb {
  if (!global._inMemoryDbInstance) {
    global._inMemoryDbInstance = new InMemoryDb();
  }
  return global._inMemoryDbInstance;
}
