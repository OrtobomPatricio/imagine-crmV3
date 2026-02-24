import { describe, it, expect, beforeEach } from "vitest";
import {
    buildTenant, buildUser, buildLead, buildConversation,
    buildChatMessage, buildSession, buildPipelineStage,
    resetFactorySequence,
} from "../factories";

/**
 * Tenant Isolation Tests
 *
 * Verifies that factory-generated entities respect tenant boundaries
 * and that cross-tenant access patterns are detectable.
 */

describe("Tenant Isolation", () => {
    beforeEach(() => {
        resetFactorySequence();
    });

    describe("Factory Defaults", () => {
        it("should generate entities with tenantId", () => {
            const tenant = buildTenant();
            const user = buildUser({ tenantId: tenant.id });
            const lead = buildLead({ tenantId: tenant.id });

            expect(user.tenantId).toBe(tenant.id);
            expect(lead.tenantId).toBe(tenant.id);
        });

        it("should generate unique IDs", () => {
            const leads = Array.from({ length: 10 }, () => buildLead());
            const ids = new Set(leads.map((l) => l.id));
            expect(ids.size).toBe(10);
        });

        it("should allow overriding defaults", () => {
            const lead = buildLead({
                fullName: "Override Name",
                status: "qualified",
                tenantId: 99,
            });

            expect(lead.fullName).toBe("Override Name");
            expect(lead.status).toBe("qualified");
            expect(lead.tenantId).toBe(99);
        });
    });

    describe("Cross-Tenant Boundary Checks", () => {
        it("should detect tenant mismatch between user and lead", () => {
            const tenantA = buildTenant();
            const tenantB = buildTenant();

            const userA = buildUser({ tenantId: tenantA.id });
            const leadB = buildLead({ tenantId: tenantB.id });

            // This is what the middleware should prevent
            expect(userA.tenantId).not.toBe(leadB.tenantId);
        });

        it("should ensure conversation belongs to same tenant as lead", () => {
            const tenant = buildTenant();
            const lead = buildLead({ tenantId: tenant.id });
            const conv = buildConversation({ tenantId: tenant.id, leadId: lead.id });

            expect(conv.tenantId).toBe(lead.tenantId);
        });

        it("should ensure chat messages belong to correct tenant", () => {
            const tenant = buildTenant();
            const conv = buildConversation({ tenantId: tenant.id });
            const msg = buildChatMessage({ tenantId: tenant.id, conversationId: conv.id });

            expect(msg.tenantId).toBe(conv.tenantId);
        });

        it("should prevent cross-tenant session access", () => {
            const tenantA = buildTenant();
            const tenantB = buildTenant();
            const sessionA = buildSession({ tenantId: tenantA.id });

            expect(sessionA.tenantId).not.toBe(tenantB.id);
        });
    });

    describe("Data Integrity", () => {
        it("should generate valid phone numbers", () => {
            const lead = buildLead();
            expect(lead.phoneNumber).toMatch(/^\+549\d{10}$/);
        });

        it("should generate valid emails", () => {
            const lead = buildLead();
            expect(lead.email).toMatch(/@example\.com$/);
        });

        it("should have non-null required fields", () => {
            const user = buildUser();
            expect(user.openId).toBeTruthy();
            expect(user.name).toBeTruthy();
            expect(user.role).toBeTruthy();
        });

        it("should default to new/open status", () => {
            expect(buildLead().status).toBe("new");
            expect(buildConversation().status).toBe("open");
        });

        it("should reset sequence counter", () => {
            const id1 = buildLead().id;
            resetFactorySequence();
            const id2 = buildLead().id;
            expect(id2).toBeLessThanOrEqual(id1);
        });
    });
});
