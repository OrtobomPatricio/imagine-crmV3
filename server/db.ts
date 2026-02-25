import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import * as mockDb from './db-mock';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// Lazily create the drizzle instance so local tooling can run without a DB.
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (_db) return _db;

  // Check if we should use mock database
  if (process.env.USE_MOCK_DB === "true" || !process.env.DATABASE_URL) {
    console.log("[Database] Using MOCK database (USE_MOCK_DB=true or no DATABASE_URL)");
    _db = await mockDb.getDb();
    return _db;
  }

  try {
    if (!_pool) {
      console.log("[Database] Initializing MySQL connection pool...");
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        multipleStatements: false,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
    }

    // Health check
    const connection = await _pool.getConnection();
    await connection.ping();
    connection.release();

    _db = drizzle(_pool as any);
    console.log("[Database] MySQL connection initialized successfully.");
  } catch (error) {
    console.error("[Database] MySQL Connection FAILURE:", error);
    console.log("[Database] Falling back to MOCK database...");
    _db = await mockDb.getDb();
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      tenantId: user.tenantId ?? 1,
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'owner';
      updateSet.role = 'owner';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
