/**
 * Mock database for development without MySQL
 * Stores data in memory for demo purposes
 */

import { InsertUser, users, sessions, tenants, leads, conversations } from "../drizzle/schema";

// In-memory storage
const memoryDb: any = {
  users: new Map(),
  sessions: new Map(),
  sessions_auth: new Map(),
  tenants: new Map([[
    1, 
    { id: 1, name: "Demo Company", slug: "demo", plan: "pro", isActive: true, 
      settings: JSON.stringify({ timezone: "America/Asuncion", language: "es" }),
      createdAt: new Date(), updatedAt: new Date() }
  ]]),
  leads: new Map(),
  conversations: new Map(),
  messages: new Map(),
  pipelines: new Map(),
  pipelineStages: new Map(),
  leadTasks: new Map(),
  templates: new Map(),
  campaigns: new Map(),
  quickReplies: new Map(),
  tags: new Map(),
  leadTags: new Map(),
  chatMessages: new Map(),
  reminders: new Map(),
  onboarding: new Map([[1, { tenantId: 1, companyCompleted: true, teamCompleted: false, whatsappCompleted: false, importCompleted: false, firstMessageCompleted: false, lastStep: 'company' }]]),
  terms: new Map(),
};

// Create dev user
const devUser = {
  id: 1,
  tenantId: 1,
  openId: "dev@localhost",
  name: "Developer",
  email: "dev@localhost",
  role: "owner",
  loginMethod: "dev",
  isActive: true,
  hasSeenTour: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};
memoryDb.users.set("dev@localhost", devUser);
memoryDb.users.set(1, devUser);
console.log("[MockDB] Dev user created:", devUser.openId);

// Create demo leads
for (let i = 1; i <= 5; i++) {
  memoryDb.leads.set(i, {
    id: i,
    tenantId: 1,
    name: `Cliente Demo ${i}`,
    email: `cliente${i}@demo.com`,
    phone: `+595991${100000 + i}`,
    status: i % 2 === 0 ? "active" : "new",
    source: "website",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getDb() {
  return {
    select: (fields?: any) => ({
      from: (table: any) => {
        const tableName = table?._?.name || table;
        return {
          where: (condition: any) => ({
            limit: (n: number) => {
              // Simple mock query - return all data for demo
              const data = Array.from(memoryDb[tableName]?.values() || []);
              return data.slice(0, n);
            },
            orderBy: (...args: any[]) => ({
              limit: (n: number) => Array.from(memoryDb[tableName]?.values() || []).slice(0, n),
            }),
          }),
          orderBy: (...args: any[]) => ({
            limit: (n: number) => Array.from(memoryDb[tableName]?.values() || []).slice(0, n),
            where: (condition: any) => ({
              limit: (n: number) => Array.from(memoryDb[tableName]?.values() || []).slice(0, n),
            }),
          }),
          limit: (n: number) => Array.from(memoryDb[tableName]?.values() || []).slice(0, n),
        };
      },
    }),
    insert: (table: any) => ({
      values: (data: any) => ({
        onDuplicateKeyUpdate: (update: any) => Promise.resolve(),
        execute: async () => {
          const tableName = table?._?.name || table;
          if (!memoryDb[tableName]) memoryDb[tableName] = new Map();
          const id = data.id || Date.now();
          memoryDb[tableName].set(id, { ...data, id, createdAt: new Date(), updatedAt: new Date() });
          console.log("[MockDB] Insert into", tableName, "id:", id);
          return { insertId: id };
        },
      }),
      execute: async () => Promise.resolve(),
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => {
          const tableName = table?._?.name || table;
          console.log("[MockDB] Update", tableName);
          return Promise.resolve();
        },
      }),
    }),
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve(),
    }),
    execute: async (sql: string | any, params?: any[]) => {
      const sqlStr = typeof sql === 'string' ? sql : JSON.stringify(sql).substring(0, 100);
      console.log("[MockDB] Execute:", sqlStr.substring(0, 50));
      return [];
    },
    transaction: async (fn: any) => {
      const tx = {
        execute: async (sql: string | any, params?: any[]) => {
          const sqlStr = typeof sql === 'string' ? sql : JSON.stringify(sql);
          console.log("[MockDB] Transaction execute:", sqlStr.substring(0, 50));
          return [];
        },
        insert: (table: any) => ({
          values: (data: any) => ({
            execute: async () => Promise.resolve(),
          }),
        }),
        update: (table: any) => ({
          set: (data: any) => ({
            where: (condition: any) => Promise.resolve(),
          }),
        }),
        delete: (table: any) => ({
          where: (condition: any) => Promise.resolve(),
        }),
      };
      return await fn(tx);
    },
    query: {},
  } as any;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  console.log("[MockDB] Upsert user:", user.openId);
  memoryDb.users.set(user.openId, {
    ...user,
    id: user.id || Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getUserByOpenId(openId: string) {
  console.log("[MockDB] Get user by openId:", openId);
  const user = memoryDb.users.get(openId);
  console.log("[MockDB] Found user:", user ? "YES" : "NO");
  return user || null;
}

export function getMemoryDb() {
  return memoryDb;
}

console.log("[Database] MOCK MODE - Using in-memory storage");
