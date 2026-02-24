import { useSyncExternalStore, useCallback } from "react";

function subscribe(callback: () => void) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
    };
}

function getSnapshot() {
    return navigator.onLine;
}

function getServerSnapshot() {
    return true; // SSR always reports online
}

/**
 * React hook that tracks the browser's online/offline status.
 * Uses `useSyncExternalStore` for tear-free concurrent reads.
 */
export function useOnlineStatus(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
