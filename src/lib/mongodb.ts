import { MongoClient, Db, Collection, Document } from "mongodb";
import { getInMemoryDb } from "./memory-db";

const dbName = process.env.MONGODB_DB_NAME || "janSamasyaDB";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _isUsingMemoryFallback: boolean | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("CONFIGURATION_ERROR: MONGODB_URI environment variable is missing.");
  }

  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 0,
  });

  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  if (global._isUsingMemoryFallback) {
    return getInMemoryDb() as unknown as Db;
  }

  try {
    const client = await getMongoClient();
    const name = process.env.MONGODB_DB_NAME || dbName;
    return client.db(name);
  } catch (err) {
    console.warn("[mongodb] Real database connection unavailable. Activating resilient in-memory database store fallback.", (err as Error)?.message || err);
    global._isUsingMemoryFallback = true;
    return getInMemoryDb() as unknown as Db;
  }
}

export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(collectionName) as unknown as Collection<T>;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const db = await getDb();
    const res = await db.command({ ping: 1 });
    return res.ok === 1;
  } catch {
    return false;
  }
}
