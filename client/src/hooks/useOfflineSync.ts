import { useEffect, useRef, useCallback } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
    getPendingMessages,
    dequeueMessage,
    type PendingMessage,
} from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Hook that automatically replays pending offline messages when the browser comes back online.
 * Should be mounted once at the App level.
 */
export function useOfflineSync() {
    const isOnline = useOnlineStatus();
    const isSyncing = useRef(false);

    const sendMutation = trpc.chat.sendMessage.useMutation();

    const replayQueue = useCallback(async () => {
        if (isSyncing.current) return;
        isSyncing.current = true;

        const pending = getPendingMessages();
        if (pending.length === 0) {
            isSyncing.current = false;
            return;
        }

        let sent = 0;
        let failed = 0;

        for (const msg of pending) {
            try {
                await sendMutation.mutateAsync({
                    conversationId: msg.conversationId,
                    content: msg.text,
                    messageType: "text",
                });
                dequeueMessage(msg.id);
                sent++;
            } catch {
                failed++;
            }
        }

        if (sent > 0) {
            toast.success(`${sent} mensaje(s) pendientes enviados`);
        }
        if (failed > 0) {
            toast.error(`${failed} mensaje(s) no pudieron enviarse`);
        }

        isSyncing.current = false;
    }, [sendMutation]);

    useEffect(() => {
        if (isOnline) {
            replayQueue();
        }
    }, [isOnline, replayQueue]);
}
