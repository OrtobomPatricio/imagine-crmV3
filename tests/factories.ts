/**
 * Test Data Factories
 *
 * Provides builder functions that produce fully-formed test entities
 * with sensible defaults. Every field can be overridden via `Partial<T>`.
 *
 * Usage:
 * ```ts
 * const lead = buildLead({ fullName: "Custom Name" });
 * const user = buildUser({ role: "admin" });
 * const tenant = buildTenant();
 * ```
 */

let seq = 0;
function nextId() { return ++seq; }

// ── Tenant ──
export interface TestTenant {
    id: number;
    name: string;
    slug: string;
    plan: string;
    createdAt: Date;
}

export function buildTenant(overrides: Partial<TestTenant> = {}): TestTenant {
    const id = overrides.id ?? nextId();
    return {
        id,
        name: `Test Tenant ${id}`,
        slug: `test-tenant-${id}`,
        plan: "pro",
        createdAt: new Date(),
        ...overrides,
    };
}

// ── User ──
export interface TestUser {
    id: number;
    tenantId: number;
    openId: string;
    name: string;
    email: string;
    role: "owner" | "admin" | "supervisor" | "agent" | "viewer";
    isActive: boolean;
    createdAt: Date;
}

export function buildUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = overrides.id ?? nextId();
    return {
        id,
        tenantId: 1,
        openId: `openid-${id}`,
        name: `Test User ${id}`,
        email: `user${id}@test.com`,
        role: "agent",
        isActive: true,
        createdAt: new Date(),
        ...overrides,
    };
}

// ── Lead ──
export interface TestLead {
    id: number;
    tenantId: number;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    company: string | null;
    status: string;
    source: string;
    score: number;
    assignedToId: number | null;
    pipelineStageId: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export function buildLead(overrides: Partial<TestLead> = {}): TestLead {
    const id = overrides.id ?? nextId();
    return {
        id,
        tenantId: 1,
        fullName: `Lead ${id}`,
        phoneNumber: `+549${String(id).padStart(10, "0")}`,
        email: `lead${id}@example.com`,
        company: `Company ${id}`,
        status: "new",
        source: "manual",
        score: 0,
        assignedToId: null,
        pipelineStageId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        ...overrides,
    };
}

// ── Conversation ──
export interface TestConversation {
    id: number;
    tenantId: number;
    leadId: number;
    status: string;
    channel: string;
    assignedToId: number | null;
    lastMessageAt: Date | null;
    createdAt: Date;
}

export function buildConversation(overrides: Partial<TestConversation> = {}): TestConversation {
    const id = overrides.id ?? nextId();
    return {
        id,
        tenantId: 1,
        leadId: 1,
        status: "open",
        channel: "whatsapp",
        assignedToId: null,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        ...overrides,
    };
}

// ── Chat Message ──
export interface TestChatMessage {
    id: number;
    tenantId: number;
    conversationId: number;
    body: string;
    fromMe: boolean;
    messageType: string;
    timestamp: Date;
    userId: number | null;
}

export function buildChatMessage(overrides: Partial<TestChatMessage> = {}): TestChatMessage {
    const id = overrides.id ?? nextId();
    return {
        id,
        tenantId: 1,
        conversationId: 1,
        body: `Test message ${id}`,
        fromMe: false,
        messageType: "text",
        timestamp: new Date(),
        userId: null,
        ...overrides,
    };
}

// ── Session ──
export interface TestSession {
    id: number;
    userId: number;
    tenantId: number;
    expiresAt: Date;
    createdAt: Date;
}

export function buildSession(overrides: Partial<TestSession> = {}): TestSession {
    const id = overrides.id ?? nextId();
    return {
        id,
        userId: 1,
        tenantId: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ...overrides,
    };
}

// ── Pipeline Stage ──
export interface TestPipelineStage {
    id: number;
    tenantId: number;
    pipelineId: number;
    name: string;
    order: number;
    color: string;
}

export function buildPipelineStage(overrides: Partial<TestPipelineStage> = {}): TestPipelineStage {
    const id = overrides.id ?? nextId();
    return {
        id,
        tenantId: 1,
        pipelineId: 1,
        name: `Stage ${id}`,
        order: id,
        color: "#3b82f6",
        ...overrides,
    };
}

/**
 * Reset the ID sequence counter.
 * Call in beforeEach() for deterministic test IDs.
 */
export function resetFactorySequence(): void {
    seq = 0;
}
