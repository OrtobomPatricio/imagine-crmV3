import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getPendingActions, removeAction, QueuedAction } from "@/lib/offline-queue";
import { toast } from "sonner";

/**
 * useOfflineQueue Hook
 * Watches connectivity and processes the action queue when online.
 */

export function useOfflineQueue() {
    const [pendingCount, setPendingCount] = useState(0);
    const utils = trpc.useUtils();

    // Mutations for each action type
    const sendMessageMutation = trpc.chat.sendMessage.useMutation();

    const processQueue = async () => {
        const actions = await getPendingActions();
        if (actions.length === 0) return;

        console.log(`[OfflineQueue] Processing ${actions.length} actions...`);

        for (const action of actions) {
            try {
                if (action.type === 'message') {
                    await sendMessageMutation.mutateAsync(action.payload);
                }
                // Add more handlers as needed

                await removeAction(action.id);
            } catch (error) {
                console.error(`[OfflineQueue] Failed to process action ${action.id}`, error);
            }
        }

        setPendingCount(0);
        utils.invalidate(); // Refresh UI after sync
        toast.success(`Sincronización completa: ${actions.length} acciones procesadas.`);
    };

    useEffect(() => {
        const updateCount = async () => {
            const actions = await getPendingActions();
            setPendingCount(actions.length);
        };

        const handleOnline = () => {
            processQueue();
        };

        window.addEventListener('online', handleOnline);
        updateCount();

        const interval = setInterval(updateCount, 5000); // Poll for new local actions

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, []);

    return {
        pendingCount,
        isOnline: navigator.onLine
    };
}
