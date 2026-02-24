import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Prefetch hook that pre-loads tRPC data on hover or user intent signals.
 * Uses React Query's prefetchQuery under the hood via tRPC.
 *
 * Usage:
 * ```tsx
 * const { prefetchLeads, prefetchDashboard } = usePrefetch();
 * <Link onMouseEnter={prefetchLeads} href="/leads">Leads</Link>
 * ```
 */
export function usePrefetch() {
    const utils = trpc.useUtils();

    const prefetchLeads = useCallback(() => {
        utils.leads.list.prefetch({
            limit: 25,
            offset: 0,
        });
    }, [utils]);

    const prefetchDashboard = useCallback(() => {
        utils.dashboard.getStats.prefetch();
    }, [utils]);

    const prefetchPipeline = useCallback(() => {
        utils.pipelines.list.prefetch();
    }, [utils]);

    const prefetchChat = useCallback(() => {
        utils.chat.listConversations.prefetch(undefined);
    }, [utils]);

    return {
        prefetchLeads,
        prefetchDashboard,
        prefetchPipeline,
        prefetchChat,
    };
}
