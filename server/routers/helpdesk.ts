import { z } from "zod";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { conversations, supportQueues, supportUserQueues, quickAnswers, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const helpdeskRouter = router({
  // Queues
  listQueues: permissionProcedure("helpdesk.view").query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(supportQueues).where(eq(supportQueues.tenantId, ctx.tenantId)).orderBy(supportQueues.name);
  }),

  createQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({
      name: z.string().min(2).max(100),
      color: z.string().min(3).max(32),
      greetingMessage: z.string().max(5000).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const res = await db.insert(supportQueues).values({
        tenantId: ctx.tenantId,
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
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(supportQueues)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.color ? { color: input.color } : {}),
          ...(input.greetingMessage !== undefined ? { greetingMessage: input.greetingMessage } : {}),
        })
        .where(and(eq(supportQueues.tenantId, ctx.tenantId), eq(supportQueues.id, input.id)));
      return { ok: true };
    }),

  deleteQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(supportQueues).where(and(eq(supportQueues.tenantId, ctx.tenantId), eq(supportQueues.id, input.id)));
      return { ok: true };
    }),

  // Queue membership (assign agents to queues)
  listQueueMembers: permissionProcedure("helpdesk.view")
    .input(z.object({ queueId: z.number() }))
    .query(async ({ input, ctx }) => {
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
        .where(and(eq(supportUserQueues.tenantId, ctx.tenantId), eq(supportUserQueues.queueId, input.queueId)))
        .orderBy(users.name);
    }),

  setQueueMembers: permissionProcedure("helpdesk.manage")
    .input(z.object({
      queueId: z.number(),
      userIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Replace membership atomically (best effort)
      await db.delete(supportUserQueues).where(and(eq(supportUserQueues.tenantId, ctx.tenantId), eq(supportUserQueues.queueId, input.queueId)));
      if (input.userIds.length) {
        await db.insert(supportUserQueues).values(
          input.userIds.map(uid => ({
            tenantId: ctx.tenantId,
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

      const whereParts = [eq(conversations.tenantId, ctx.tenantId)];

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
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({ ticketStatus: input.ticketStatus })
        .where(and(eq(conversations.tenantId, ctx.tenantId), eq(conversations.id, input.conversationId)));
      return { ok: true };
    }),

  assignConversation: permissionProcedure("helpdesk.manage")
    .input(z.object({
      conversationId: z.number(),
      assignedToId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({
          assignedToId: input.assignedToId,
          // Auto-open ticket if pending when assigning
          ticketStatus: sql`CASE WHEN ${conversations.ticketStatus} = 'pending' THEN 'open' ELSE ${conversations.ticketStatus} END`
        })
        .where(and(eq(conversations.tenantId, ctx.tenantId), eq(conversations.id, input.conversationId)));
      return { ok: true };
    }),

  setConversationQueue: permissionProcedure("helpdesk.manage")
    .input(z.object({
      conversationId: z.number(),
      queueId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(conversations)
        .set({ queueId: input.queueId })
        .where(and(eq(conversations.tenantId, ctx.tenantId), eq(conversations.id, input.conversationId)));
      return { ok: true };
    }),

  // Quick Answers
  listQuickAnswers: permissionProcedure("helpdesk.view")
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.search && input.search.trim()) {
        const q = `%${input.search.trim()}%`;
        return db.select().from(quickAnswers)
          .where(and(eq(quickAnswers.tenantId, ctx.tenantId), or(like(quickAnswers.shortcut, q), like(quickAnswers.message, q))))
          .orderBy(desc(quickAnswers.updatedAt));
      }
      return db.select().from(quickAnswers).where(eq(quickAnswers.tenantId, ctx.tenantId)).orderBy(desc(quickAnswers.updatedAt)).limit(200);
    }),

  upsertQuickAnswer: permissionProcedure("helpdesk.manage")
    .input(z.object({
      id: z.number().optional(),
      shortcut: z.string().min(1).max(5000),
      message: z.string().min(1).max(10000),
      attachments: z.array(z.object({
        url: z.string(),
        name: z.string(),
        type: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.id) {
        await db.update(quickAnswers).set({
          shortcut: input.shortcut,
          message: input.message,
          attachments: input.attachments ?? [],
        }).where(and(eq(quickAnswers.tenantId, ctx.tenantId), eq(quickAnswers.id, input.id)));
        return { id: input.id };
      }
      const res = await db.insert(quickAnswers).values({
        tenantId: ctx.tenantId,
        shortcut: input.shortcut,
        message: input.message,
        attachments: input.attachments ?? [],
      });
      return { id: res[0].insertId };
    }),

  deleteQuickAnswer: permissionProcedure("helpdesk.manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(quickAnswers).where(and(eq(quickAnswers.tenantId, ctx.tenantId), eq(quickAnswers.id, input.id)));
      return { ok: true };
    }),
});
