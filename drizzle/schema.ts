import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, uniqueIndex, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: varchar("password", { length: 255 }), // For native credential login
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Pro roles: owner/admin/supervisor/agent/viewer
  role: mysqlEnum("role", ["owner", "admin", "supervisor", "agent", "viewer"]).default("agent").notNull(),
  // Optional override that maps to a custom key in permissionsMatrix
  customRole: varchar("customRole", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  hasSeenTour: boolean("hasSeenTour").default(false).notNull(),
  invitationToken: varchar("invitationToken", { length: 255 }),
  invitationExpires: timestamp("invitationExpires"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Global app settings (single-tenant for now, but ready for multi-tenant later).
 * This powers the Settings panel: branding, locale, scheduling rules, permissions matrix.
 */
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  singleton: int("singleton").notNull().default(1),
  companyName: varchar("companyName", { length: 120 }).default("Imagine Lab CRM").notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  timezone: varchar("timezone", { length: 60 }).default("America/Asuncion").notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
  currency: varchar("currency", { length: 10 }).default("PYG").notNull(),

  // Permissions matrix by role. Example:
  // { owner: ["*"], admin: ["dashboard.*", "leads.*"], agent: ["leads.view"] }
  permissionsMatrix: json("permissionsMatrix").$type<Record<string, string[]>>(),

  // Scheduling settings
  scheduling: json("scheduling").$type<{
    slotMinutes: number;
    maxPerSlot: number;
    allowCustomTime: boolean;
  }>(),

  // Dashboard configuration (quick actions visibility and layout)
  dashboardConfig: json("dashboardConfig").$type<{
    visibleWidgets?: Record<string, boolean>;
    layout?: any[]; // react-grid-layout array
  }>(),

  // Sales & Commissions Configuration
  salesConfig: json("salesConfig").$type<{
    defaultCommissionRate: number; // e.g., 0.10 for 10%
    currencySymbol: string; // e.g., "G$"
    requireValueOnWon: boolean; // Force entering value when moving to "Won"
  }>(),

  // SMTP Configuration (for email invitations)
  smtpConfig: json("smtpConfig").$type<{
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass?: string | null;
    from?: string;
  }>(),

  // Storage Configuration (S3/Forge)
  storageConfig: json("storageConfig").$type<{
    provider: "forge" | "s3";
    bucket?: string;
    region?: string;
    accessKey?: string | null;
    secretKey?: string | null;
    endpoint?: string;
    publicUrl?: string;
  }>(),

  // AI Configuration (OpenAI/Anthropic)
  aiConfig: json("aiConfig").$type<{
    provider: "openai" | "anthropic";
    apiKey?: string | null;
    model?: string;
  }>(),

  // Google Maps Configuration
  mapsConfig: json("mapsConfig").$type<{
    apiKey?: string | null;
  }>(),

  // SLA Configuration
  slaConfig: json("slaConfig").$type<{
    maxResponseTimeMinutes: number; // e.g. 60
    alertEmail?: string;
    notifySupervisor: boolean;
  }>(),

  // Security Configuration
  securityConfig: json("securityConfig").$type<{
    allowedIps: string[];
    maxLoginAttempts?: number;
    sessionTimeoutMinutes?: number;
  }>(),

  // Meta / WhatsApp Configuration (Dynamic)
  metaConfig: json("metaConfig").$type<{
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
  }>(),

  // Chat Distribution Configuration
  chatDistributionConfig: json("chatDistributionConfig").$type<{
    mode: "manual" | "round_robin" | "all_agents";
    excludeAgentIds: number[];
  }>(),
  lastAssignedAgentId: int("lastAssignedAgentId"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  uniqSingleton: uniqueIndex("uniq_app_settings_singleton").on(t.singleton),
}));

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;

/**
 * Reminder templates for appointments
 */
export const reminderTemplates = mysqlTable("reminder_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  // e.g. "Hola {{name}}, recordá tu cita mañana a las {{time}}"
  daysBefore: int("daysBefore").default(1).notNull(), // 0 = same day, 1 = 1 day before
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReminderTemplate = typeof reminderTemplates.$inferSelect;
export type InsertReminderTemplate = typeof reminderTemplates.$inferInsert;

/**
 * WhatsApp numbers for campaigns
 */
export const whatsappNumbers = mysqlTable("whatsapp_numbers", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }),
  country: varchar("country", { length: 50 }).notNull(),
  countryCode: varchar("countryCode", { length: 5 }).notNull(),
  status: mysqlEnum("status", ["active", "warming_up", "blocked", "disconnected"]).default("warming_up").notNull(),
  warmupDay: int("warmupDay").default(0).notNull(),
  warmupStartDate: timestamp("warmupStartDate"),
  dailyMessageLimit: int("dailyMessageLimit").default(20).notNull(),
  messagesSentToday: int("messagesSentToday").default(0).notNull(),
  totalMessagesSent: int("totalMessagesSent").default(0).notNull(),
  lastConnected: timestamp("lastConnected"),
  isConnected: boolean("isConnected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsappNumber = typeof whatsappNumbers.$inferSelect;
export type InsertWhatsappNumber = typeof whatsappNumbers.$inferInsert;

/**
 * Sales Pipelines (e.g., "Default", "Real Estate", "b2b")
 */
export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = typeof pipelines.$inferInsert;

/**
 * Stages within a pipeline (e.g., "New", "Qualified", "Won")
 */
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#e2e8f0"),
  order: int("order").default(0).notNull(),
  type: mysqlEnum("type", ["open", "won", "lost"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

/**
 * Custom Fields Definitions
 */
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["lead", "contact", "company"]).default("lead").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["text", "number", "date", "select", "checkbox"]).notNull(),
  options: json("options").$type<string[]>(), // For select type options
  isRequired: boolean("isRequired").default(false).notNull(),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;

/**
 * Leads managed in the CRM
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(), // Unique index added below
  email: varchar("email", { length: 320 }),
  country: varchar("country", { length: 50 }).notNull(),
  // Status is deprecated but kept for migration. Use pipelineStageId instead.
  status: mysqlEnum("status", ["new", "contacted", "qualified", "negotiation", "won", "lost"]).default("new").notNull(),
  pipelineStageId: int("pipelineStageId").references(() => pipelineStages.id, { onDelete: "set null" }),
  // Order inside a pipeline stage (Kanban). Lower means earlier.
  kanbanOrder: int("kanbanOrder").default(0).notNull(),
  customFields: json("customFields").$type<Record<string, any>>(), // Store dynamic values { "fieldId": value }
  source: varchar("source", { length: 100 }),
  notes: text("notes"),
  value: decimal("value", { precision: 12, scale: 2 }).default("0.00"), // Deal value
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0.00"),
  assignedToId: int("assignedToId").references(() => users.id, { onDelete: "set null" }),
  whatsappNumberId: int("whatsappNumberId").references(() => whatsappNumbers.id, { onDelete: "set null" }),
  whatsappConnectionType: mysqlEnum("whatsappConnectionType", ["api", "qr"]),
  externalChatId: varchar("externalChatId", { length: 100 }),
  lastContactedAt: timestamp("lastContactedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  uniqPhone: uniqueIndex("uniq_leads_phone").on(t.phone),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Message Templates
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["whatsapp", "email"]).default("whatsapp").notNull(),
  attachments: json("attachments").$type<{ url: string; name: string; type: string }[]>(), // Array of attachments
  variables: json("variables").$type<string[]>(), // ["name", "company"]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Campaigns for mass messaging
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["whatsapp", "email"]).default("whatsapp").notNull(),
  templateId: int("templateId").references(() => templates.id, { onDelete: "set null" }),
  audienceConfig: json("audienceConfig"), // Stores filters used to select audience
  status: mysqlEnum("status", ["draft", "scheduled", "running", "paused", "completed", "cancelled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  totalRecipients: int("totalRecipients").default(0).notNull(),
  messagesSent: int("messagesSent").default(0).notNull(),
  messagesDelivered: int("messagesDelivered").default(0).notNull(),
  messagesRead: int("messagesRead").default(0).notNull(),
  messagesFailed: int("messagesFailed").default(0).notNull(),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign recipients linking campaigns to leads
 */
export const campaignRecipients = mysqlTable("campaign_recipients", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
  whatsappNumberId: int("whatsappNumberId").references(() => whatsappNumbers.id, { onDelete: "set null" }),
  // WhatsApp Cloud API message id (to track delivery/read)
  whatsappMessageId: varchar("whatsappMessageId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed", "read"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: prevent duplicate recipients for same campaign+lead
  uniqueCampaignLead: uniqueIndex("unique_campaign_lead").on(table.campaignId, table.leadId),
}));

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = typeof campaignRecipients.$inferInsert;



/**
 * Activity log for tracking actions
 */
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

/**
 * Integrations with external services (n8n, Chatwoot, etc.)
 */
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["n8n", "chatwoot", "zapier", "webhook"]).notNull(),
  webhookUrl: varchar("webhookUrl", { length: 500 }).notNull(),
  whatsappNumberId: int("whatsappNumberId").notNull().references(() => whatsappNumbers.id, { onDelete: "cascade" }),
  isActive: boolean("isActive").default(true).notNull(),
  events: json("events").$type<string[]>(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idxWhatsappActive: index("idx_integrations_whatsapp_active").on(t.whatsappNumberId, t.isActive),
}));



export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;


/**
 * Workflows for automation (IFTTT)
 */
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  triggerType: mysqlEnum("triggerType", ["lead_created", "lead_updated", "msg_received", "campaign_link_clicked"]).notNull(),
  triggerConfig: json("triggerConfig"), // Filters like { "status": "new" }
  actions: json("actions").$type<any[]>(), // Array of actions: [{ type: 'send_whatsapp', templateId: 1 }]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

/**
 * Logs for workflow execution
 */
export const workflowLogs = mysqlTable("workflow_logs", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  entityId: int("entityId").notNull(), // leadId or other
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowLog = typeof workflowLogs.$inferSelect;
export type InsertWorkflowLog = typeof workflowLogs.$inferInsert;


/**
 * Appointment reasons (editable dropdown options)
 */
export const appointmentReasons = mysqlTable("appointment_reasons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppointmentReason = typeof appointmentReasons.$inferSelect;
export type InsertAppointmentReason = typeof appointmentReasons.$inferInsert;

/**
 * Appointments/Scheduling
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  reasonId: int("reasonId").references(() => appointmentReasons.id, { onDelete: "set null" }),
  appointmentDate: timestamp("appointmentDate").notNull(),
  appointmentTime: varchar("appointmentTime", { length: 10 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),
  leadId: int("leadId").references(() => leads.id, { onDelete: "set null" }),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Chat conversations
 */

/**
 * Helpdesk: Queues and quick answers
 */
export const supportQueues = mysqlTable(
  "support_queues",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 32 }).notNull(),
    greetingMessage: text("greetingMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    uniqName: uniqueIndex("uniq_support_queues_name").on(t.name),
  })
);

export type SupportQueue = typeof supportQueues.$inferSelect;
export type InsertSupportQueue = typeof supportQueues.$inferInsert;

export const supportUserQueues = mysqlTable(
  "support_user_queues",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    queueId: int("queueId").notNull().references(() => supportQueues.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniqUserQueue: uniqueIndex("uniq_user_queue").on(t.userId, t.queueId),
  })
);

export type SupportUserQueue = typeof supportUserQueues.$inferSelect;
export type InsertSupportUserQueue = typeof supportUserQueues.$inferInsert;

export const quickAnswers = mysqlTable("quick_answers", {
  id: int("id").autoincrement().primaryKey(),
  shortcut: text("shortcut").notNull(),
  message: text("message").notNull(),
  attachments: json("attachments").$type<{ url: string; name: string; type: string }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuickAnswer = typeof quickAnswers.$inferSelect;
export type InsertQuickAnswer = typeof quickAnswers.$inferInsert;


export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  channel: mysqlEnum("channel", ["whatsapp", "facebook"]).default("whatsapp").notNull(),
  whatsappNumberId: int("whatsappNumberId").references(() => whatsappNumbers.id, { onDelete: "set null" }),
  whatsappConnectionType: mysqlEnum("whatsappConnectionType", ["api", "qr"]),
  externalChatId: varchar("externalChatId", { length: 100 }),
  facebookPageId: int("facebookPageId").references(() => facebookPages.id, { onDelete: "set null" }),
  contactPhone: varchar("contactPhone", { length: 50 }).notNull(), // Now generic (phone or PSID)
  contactName: varchar("contactName", { length: 200 }),
  leadId: int("leadId").references(() => leads.id, { onDelete: "set null" }),
  assignedToId: int("assignedToId").references(() => users.id, { onDelete: "set null" }),
  ticketStatus: mysqlEnum("ticketStatus", ["pending", "open", "closed"]).default("pending").notNull(),
  queueId: int("queueId").references(() => supportQueues.id, { onDelete: "set null" }),
  lastMessageAt: timestamp("lastMessageAt"),
  unreadCount: int("unreadCount").default(0).notNull(),
  status: mysqlEnum("status", ["active", "archived", "blocked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idxWhatsappLast: index("idx_conversations_whatsapp_last").on(t.whatsappNumberId, t.lastMessageAt),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages with full media support
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  whatsappNumberId: int("whatsappNumberId").references(() => whatsappNumbers.id, { onDelete: "set null" }),
  whatsappConnectionType: mysqlEnum("whatsappConnectionType", ["api", "qr"]),
  facebookPageId: int("facebookPageId").references(() => facebookPages.id, { onDelete: "set null" }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "video", "audio", "document", "location", "sticker", "contact", "template"]).default("text").notNull(),
  content: text("content"),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaName: varchar("mediaName", { length: 200 }),
  mediaMimeType: varchar("mediaMimeType", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  locationName: varchar("locationName", { length: 200 }),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "read", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  failedAt: timestamp("failedAt"),
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }),
  facebookMessageId: varchar("facebookMessageId", { length: 100 }),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // Idempotency: prevent same WA message in same conversation
  uniqWaMessage: uniqueIndex("uniq_wa_message").on(t.whatsappMessageId, t.conversationId),
  // Performance index for conversation history (also backs FK)
  idxConversationCreated: index("idx_chat_messages_conversation_created").on(t.conversationId, t.createdAt),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Outbound Message Queue for "Industrial" reliability
 */
export const messageQueue = mysqlTable("message_queue", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  // Link to the actual chat message (it should be created in 'pending' state first)
  chatMessageId: int("chatMessageId").references(() => chatMessages.id, { onDelete: "cascade" }),
  priority: int("priority").default(0).notNull(), // 0=normal, 1=high
  status: mysqlEnum("status", ["queued", "processing", "sent", "failed"]).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageQueueItem = typeof messageQueue.$inferSelect;
export type InsertMessageQueueItem = typeof messageQueue.$inferInsert;

/**
 * Scheduled Reminders for Leads
 * Allows scheduling WhatsApp messages with interactive buttons
 */
export const leadReminders = mysqlTable("lead_reminders", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
  conversationId: int("conversationId").references(() => conversations.id, { onDelete: "cascade" }),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Scheduling
  scheduledAt: timestamp("scheduledAt").notNull(), // When to send
  timezone: varchar("timezone", { length: 50 }).default("America/Asuncion"),
  
  // Message content
  message: text("message").notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "document", "template"]).default("text"),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaName: varchar("mediaName", { length: 200 }),
  
  // Interactive buttons (JSON array of button options)
  buttons: json("buttons"), // [{ id: string, text: string }, ...]
  
  // Status tracking
  status: mysqlEnum("status", ["scheduled", "sent", "failed", "cancelled"]).default("scheduled"),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  
  // Response tracking (if buttons were clicked)
  response: varchar("response", { length: 200 }), // Button ID that was clicked
  respondedAt: timestamp("respondedAt"),
  
  // Recurring reminders
  isRecurring: boolean("isRecurring").default(false),
  recurrencePattern: mysqlEnum("recurrencePattern", ["daily", "weekly", "monthly"]),
  recurrenceEndDate: timestamp("recurrenceEndDate"),
  parentReminderId: int("parentReminderId"), // For recurring instances
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idxLeadScheduled: index("idx_reminders_lead_scheduled").on(t.leadId, t.scheduledAt),
  idxStatusScheduled: index("idx_reminders_status_scheduled").on(t.status, t.scheduledAt),
}));

export type LeadReminder = typeof leadReminders.$inferSelect;
export type InsertLeadReminder = typeof leadReminders.$inferInsert;

/**
 * WhatsApp connection settings (API or QR)
 */
export const whatsappConnections = mysqlTable("whatsapp_connections", {
  id: int("id").autoincrement().primaryKey(),
  whatsappNumberId: int("whatsappNumberId").notNull().unique().references(() => whatsappNumbers.id, { onDelete: "cascade" }),
  connectionType: mysqlEnum("connectionType", ["api", "qr"]).notNull(),
  accessToken: text("accessToken"),
  phoneNumberId: varchar("phoneNumberId", { length: 50 }),
  businessAccountId: varchar("businessAccountId", { length: 50 }),
  qrCode: text("qrCode"),
  qrExpiresAt: timestamp("qrExpiresAt"),
  sessionData: text("sessionData"),
  isConnected: boolean("isConnected").default(false).notNull(),
  lastPingAt: timestamp("lastPingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type InsertWhatsappConnection = typeof whatsappConnections.$inferInsert;


/**
 * Facebook Pages
 */
export const facebookPages = mysqlTable("facebook_pages", {
  id: int("id").autoincrement().primaryKey(),
  pageId: varchar("pageId", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  accessToken: text("accessToken"), // Long-lived token
  isConnected: boolean("isConnected").default(true).notNull(),
  pictureUrl: varchar("pictureUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacebookPage = typeof facebookPages.$inferSelect;
export type InsertFacebookPage = typeof facebookPages.$inferInsert;

/**
 * Access Logs for security audit
 */
export const accessLogs = mysqlTable("access_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 200 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv6 compatible
  userAgent: text("userAgent"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  metadata: json("metadata"), // Additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;

/**
 * Active sessions for force logout and session management
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Automations / Workflows
 */



/**
 * User Goals for gamification and tracking
 */
export const goals = mysqlTable('goals', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum('type', ['sales_amount', 'deals_closed', 'leads_created', 'messages_sent']).notNull(),
  targetAmount: int('targetAmount').notNull(),
  currentAmount: int('currentAmount').default(0).notNull(),
  period: mysqlEnum('period', ['daily', 'weekly', 'monthly']).default('monthly').notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * User Achievements (Badges)
 */
export const achievements = mysqlTable('achievements', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar('type', { length: 50 }).notNull(), // e.g., 'first_sale', 'shark'
  unlockedAt: timestamp('unlockedAt').defaultNow().notNull(),
  metadata: json('metadata'),
});

export type Achievement = typeof achievements.$inferSelect;
/**
 * Internal Team Chat messages
 */
export const internalMessages = mysqlTable('internal_messages', {
  id: int('id').autoincrement().primaryKey(),
  senderId: int('senderId').notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: int('recipientId').references(() => users.id, { onDelete: "set null" }), // If NULL, it's a message to "General" channel
  content: text('content').notNull(),
  attachments: json('attachments').$type<{ type: 'image' | 'video' | 'file'; url: string; name: string }[]>(), // Array of attachments
  isRead: boolean('isRead').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = typeof internalMessages.$inferInsert;
/**
 * SMTP Connections - Multiple email accounts
 */
export const smtpConnections = mysqlTable("smtp_connections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Gmail Ventas"
  host: varchar("host", { length: 255 }).notNull(), // e.g., smtp.gmail.com
  port: int("port").notNull(), // e.g., 587
  secure: boolean("secure").default(false).notNull(), // true for 465, false for 587
  user: varchar("user", { length: 255 }).notNull(), // email address
  password: text("password"), // encrypted
  fromEmail: varchar("fromEmail", { length: 255 }), // "From" address
  fromName: varchar("fromName", { length: 100 }), // "From" name
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // One default for sending
  lastTested: timestamp("lastTested"),
  testStatus: mysqlEnum("testStatus", ["untested", "success", "failed"]).default("untested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpConnection = typeof smtpConnections.$inferSelect;
export type InsertSmtpConnection = typeof smtpConnections.$inferInsert;

/**
 * Tags for categorizing leads and conversations
 */
export const tags = mysqlTable("tags", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).default("#3b82f6").notNull(), // hex color
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
    uniqName: uniqueIndex("uniq_tag_name").on(t.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

export const leadTags = mysqlTable("lead_tags", {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
    uniqLeadTag: uniqueIndex("uniq_lead_tag").on(t.leadId, t.tagId),
}));

export type LeadTag = typeof leadTags.$inferSelect;
export type InsertLeadTag = typeof leadTags.$inferInsert;

export const conversationTags = mysqlTable("conversation_tags", {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
    uniqConvTag: uniqueIndex("uniq_conv_tag").on(t.conversationId, t.tagId),
}));

export type ConversationTag = typeof conversationTags.$inferSelect;
export type InsertConversationTag = typeof conversationTags.$inferInsert;

/**
 * Notes and Tasks for leads
 */
export const leadNotes = mysqlTable("lead_notes", {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

export const leadTasks = mysqlTable("lead_tasks", {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    dueDate: timestamp("dueDate"),
    status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
    assignedToId: int("assignedToId").references(() => users.id, { onDelete: "set null" }),
    createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadTask = typeof leadTasks.$inferSelect;
export type InsertLeadTask = typeof leadTasks.$inferInsert;

/**
 * AI Suggestions and Analysis
 */
export const aiSuggestions = mysqlTable("ai_suggestions", {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    suggestion: text("suggestion").notNull(),
    context: text("context"), // JSON with message history used
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = typeof aiSuggestions.$inferInsert;

/**
 * Chatbot Flows and Auto-responses
 */
export const chatbotFlows = mysqlTable("chatbot_flows", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    trigger: mysqlEnum("trigger", ["keyword", "new_conversation", "no_match", "hours"]).notNull(),
    triggerValue: varchar("triggerValue", { length: 200 }), // keyword or condition
    responses: json("responses").$type<string[]>().notNull(), // array of possible responses
    isActive: boolean("isActive").default(true).notNull(),
    hoursOnly: boolean("hoursOnly").default(false).notNull(), // only outside business hours
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatbotFlow = typeof chatbotFlows.$inferSelect;
export type InsertChatbotFlow = typeof chatbotFlows.$inferInsert;

/**
 * Quotations/Quotes System
 */
export const quotations = mysqlTable("quotations", {
    id: int("id").autoincrement().primaryKey(),
    leadId: int("leadId").notNull().references(() => leads.id, { onDelete: "cascade" }),
    conversationId: int("conversationId").references(() => conversations.id, { onDelete: "set null" }),
    quoteNumber: varchar("quoteNumber", { length: 50 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    items: json("items").$type<{name: string; quantity: number; unitPrice: number; total: number}[]>().notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 12, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("PYG").notNull(),
    status: mysqlEnum("status", ["draft", "sent", "approved", "rejected", "expired"]).default("draft").notNull(),
    validUntil: timestamp("validUntil"),
    approvedAt: timestamp("approvedAt"),
    rejectedAt: timestamp("rejectedAt"),
    rejectionReason: text("rejectionReason"),
    pdfUrl: varchar("pdfUrl", { length: 500 }),
    createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Forms/Surveys for lead capture
 */
export const forms = mysqlTable("forms", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    title: varchar("title", { length: 200 }),
    description: text("description"),
    fields: json("fields").$type<{name: string; label: string; type: string; required: boolean; options?: string[]}[]>().notNull(),
    whatsappNumberId: int("whatsappNumberId").references(() => whatsappNumbers.id, { onDelete: "set null" }),
    welcomeMessage: text("welcomeMessage"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;

/**
 * License / Subscription management
 */
export const license = mysqlTable("license", {
    id: int("id").autoincrement().primaryKey(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    status: mysqlEnum("status", ["active", "expired", "canceled", "trial"]).default("trial").notNull(),
    plan: varchar("plan", { length: 50 }).default("starter").notNull(), // starter, pro, enterprise
    expiresAt: timestamp("expiresAt"),
    maxUsers: int("maxUsers").default(5),
    maxWhatsappNumbers: int("maxWhatsappNumbers").default(3),
    maxMessagesPerMonth: int("maxMessagesPerMonth").default(10000),
    features: json("features").$type<string[]>(), // e.g., ["api", "webhooks", "advanced_analytics"]
    metadata: json("metadata").$type<{
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        paymentProvider?: 'stripe' | 'mercadopago';
    }>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type License = typeof license.$inferSelect;
export type InsertLicense = typeof license.$inferInsert;

/**
 * Monthly usage tracking for billing
 */
export const usageTracking = mysqlTable("usage_tracking", {
    id: int("id").autoincrement().primaryKey(),
    year: int("year").notNull(),
    month: int("month").notNull(), // 1-12
    messagesSent: int("messagesSent").default(0),
    messagesReceived: int("messagesReceived").default(0),
    activeUsers: int("activeUsers").default(0),
    activeWhatsappNumbers: int("activeWhatsappNumbers").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
    uniqYearMonth: uniqueIndex("uniq_usage_year_month").on(t.year, t.month),
}));

/**
 * Webhooks for external integrations
 */
export const webhooks = mysqlTable("webhooks", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    events: json("events").$type<string[]>().notNull(), // e.g., ["lead.created", "message.received"]
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const webhookDeliveries = mysqlTable("webhook_deliveries", {
    id: int("id").autoincrement().primaryKey(),
    webhookId: int("webhookId").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 100 }).notNull(),
    payload: text("payload").notNull(),
    responseStatus: int("responseStatus"),
    responseBody: text("responseBody"),
    success: boolean("success").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;
