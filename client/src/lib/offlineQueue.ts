/**
 * Offline Message Queue
 * Stores pending messages in localStorage when offline and replays them on reconnect.
 */

const QUEUE_KEY = "crm:offline:messageQueue";

export interface PendingMessage {
    id: string;
    conversationId: number;
    text: string;
    createdAt: string;
}

function getQueue(): PendingMessage[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue: PendingMessage[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a message for later sending */
export function enqueueMessage(msg: Omit<PendingMessage, "id" | "createdAt">): PendingMessage {
    const pending: PendingMessage = {
        ...msg,
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
    };
    const queue = getQueue();
    queue.push(pending);
    saveQueue(queue);
    return pending;
}

/** Get all pending messages */
export function getPendingMessages(): PendingMessage[] {
    return getQueue();
}

/** Remove a message from the queue (after successful send) */
export function dequeueMessage(id: string): void {
    const queue = getQueue().filter((m) => m.id !== id);
    saveQueue(queue);
}

/** Clear the entire queue */
export function clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
}

/** Get count of pending messages */
export function getPendingCount(): number {
    return getQueue().length;
}
