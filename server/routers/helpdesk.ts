import { z } from "zod";
import { and, desc, eq, like, or } from "drizzle-orm";
import { conversations, supportQueues, supportUserQueues, quickAnswers, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const helpdeskRouter = router({
  // Queues
  listQueues: permissionProcedure("helpdesk.view").query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(supportQueues).orderBy(supportQueues.name);
  }),

  createQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({
      name: z.string().min(2).max(100),
      color: z.string().min(3).max(32),
      greetingMessage: z.string().max(5000).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const res = await db.insert(supportQueues).values({
        name: input.name,
        color: input.color,
        greetingMessage: input.greetingMessage ?? null,
      });
      return { id: res[0].insertId };
    }),

  updateQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(100).optional(),
      color: z.string().min(3).max(32).optional(),
      greetingMessage: z.string().max(5000).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(supportQueues)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.color ? { color: input.color } : {}),
          ...(input.greetingMessage !== undefined ? { greetingMessage: input.greetingMessage } : {}),
        })
        .where(eq(supportQueues.id, input.id));
      return { ok: true };
    }),

  deleteQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(supportQueues).where(eq(supportQueues.id, input.id));
      return { ok: true };
    }),

  // Queue membership (assign agents to queues)
  listQueueMembers: permissionProcedure("helpdesk.view")
    .input(z.object({ queueId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: supportUserQueues.id,
        userId: supportUserQueues.userId,
        name: users.name,
        email: users.email,
        role: users.role,
      })
        .from(supportUserQueues)
        .innerJoin(users, eq(supportUserQueues.userId, users.id))
        .where(eq(supportUserQueues.queueId, input.queueId))
        .orderBy(users.name);
    }),

  setQueueMembers: permissionProcedure("helpdesk.manage")
    .input(z.object({
      queueId: z.number(),
      userIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Replace membership atomically (best effort)
      await db.delete(supportUserQueues).where(eq(supportUserQueues.queueId, input.queueId));
      if (input.userIds.length) {
        await db.insert(supportUserQueues).values(
          input.userIds.map(uid => ({
            queueId: input.queueId,
            userId: uid,
          }))
        );
      }
      return { ok: true };
    }),

  // Tickets on top of conversations
  listInbox: permissionProcedure("helpdesk.view")
    .input(z.object({
      queueId: z.number().optional().nullable(),
      ticketStatus: z.enum(["pending", "open", "closed"]).optional(),
      assignedToId: z.number().optional().nullable(),
      search: z.string().optional(),
      limit: z.number().min(10).max(200).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const userRole = (ctx.user?.role || "viewer") as string;
      const isPrivileged = ["owner", "admin", "supervisor"].includes(userRole);

      const whereParts = [];

      if (input.queueId) whereParts.push(eq(conversations.queueId, input.queueId));
      if (input.ticketStatus) whereParts.push(eq(conversations.ticketStatus, input.ticketStatus));
      if (input.assignedToId !== undefined) {
        whereParts.push(input.assignedToId === null ? eq(conversations.assignedToId, null as any) : eq(conversations.assignedToId, input.assignedToId));
      }

      // Agents: if not privileged, only see their assigned tickets
      if (!isPrivileged && ctx.user && userRole === "agent") {
        whereParts.push(eq(conversations.assignedToId, ctx.user.id));
      }

      if (input.search && input.search.trim().length > 0) {
        const q = `%${input.search.trim()}%`;
        whereParts.push(or(
          like(conversations.contactName, q),
          like(conversations.contactPhone, q),
        ));
      }

      const whereClause = whereParts.length ? and(...whereParts as any) : undefined;

      const query = db.select().from(conversations);
      if (whereClause) query.where(whereClause);

      return query.orderBy(desc(conversations.lastMessageAt)).limit(input.limit);
    }),

  setTicketStatus: permissionProcedure("helpdesk.manage")
    .input(z.object({
      conversationId: z.number(),
      ticketStatus: z.enum(["pending", "open", "closed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({ ticketStatus: input.ticketStatus })
        .where(eq(conversations.id, input.conversationId));
      return { ok: true };
    }),

  assignConversation: permissionProcedure("helpdesk.manage")
    .input(z.object({
      conversationId: z.number(),
      assignedToId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({ assignedToId: input.assignedToId })
        .where(eq(conversations.id, input.conversationId));
      return { ok: true };
    }),

  setConversationQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({
      conversationId: z.number(),
      queueId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({ queueId: input.queueId })
        .where(eq(conversations.id, input.conversationId));
      return { ok: true };
    }),

  // Quick Answers
  listQuickAnswers: permissionProcedure("helpdesk.view")
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.search && input.search.trim()) {
        const q = `%${input.search.trim()}%`;
        return db.select().from(quickAnswers)
          .where(or(like(quickAnswers.shortcut, q), like(quickAnswers.message, q)))
          .orderBy(desc(quickAnswers.updatedAt));
      }
      return db.select().from(quickAnswers).orderBy(desc(quickAnswers.updatedAt)).limit(200);
    }),

  upsertQuickAnswer: permissionProcedure("helpdesk.manage")
    .input(z.object({
      id: z.number().optional(),
      shortcut: z.string().min(1).max(5000),
      message: z.string().min(1).max(10000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.id) {
        await db.update(quickAnswers).set({ shortcut: input.shortcut, message: input.message }).where(eq(quickAnswers.id, input.id));
        return { id: input.id };
      }
      const res = await db.insert(quickAnswers).values({ shortcut: input.shortcut, message: input.message });
      return { id: res[0].insertId };
    }),

  deleteQuickAnswer: permissionProcedure("helpdesk.manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(quickAnswers).where(eq(quickAnswers.id, input.id));
      return { ok: true };
    }),
});
