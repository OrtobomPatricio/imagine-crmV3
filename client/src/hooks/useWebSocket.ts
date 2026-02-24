import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

// Event types matching server
interface ServerToClientEvents {
    "message:new": (data: {
        id: number;
        conversationId: number;
        content: string;
        fromMe: boolean;
        createdAt: Date;
        senderName?: string;
    }) => void;
    "message:status": (data: {
        messageId: number;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: Date;
    }) => void;
    "conversation:assigned": (data: {
        conversationId: number;
        assignedToId: number | null;
        assignedToName: string | null;
    }) => void;
    "conversation:typing": (data: {
        conversationId: number;
        userId: number;
        userName: string;
        isTyping: boolean;
    }) => void;
    "lead:updated": (data: {
        leadId: number;
        changes: Record<string, any>;
        updatedBy?: string;
    }) => void;
    "lead:stage_changed": (data: {
        leadId: number;
        oldStageId: number;
        newStageId: number;
        movedBy?: string;
    }) => void;
    "notification:new": (data: {
        id: number;
        title: string;
        content: string;
        type: string;
        createdAt: Date;
    }) => void;
    "task:created": (data: {
        id: number;
        leadId: number;
        title: string;
        dueDate?: Date;
        assignedToName?: string;
    }) => void;
    "task:completed": (data: {
        id: number;
        completedByName?: string;
    }) => void;
    "user:online": (data: { userId: number; userName: string; isOnline: boolean }) => void;
    "whatsapp:status": (data: {
        connectionId: number;
        status: "connected" | "disconnected" | "connecting" | "qr_ready";
        qrCode?: string;
    }) => void;
}

interface ClientToServerEvents {
    "conversation:join": (conversationId: number) => void;
    "conversation:leave": (conversationId: number) => void;
    "conversation:typing": (data: { conversationId: number; isTyping: boolean }) => void;
    "message:read": (conversationId: number) => void;
}

let globalSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(() => globalSocket?.connected ?? false);
    const reconnectAttempts = useRef(0);

    // Initialize socket connection
    useEffect(() => {
        // Create socket connection - cookies are sent automatically with credentials
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        
        // Only create socket if it doesn't exist
        if (!globalSocket) {
            console.log("[WebSocket] Creating new connection to", socketUrl);
            globalSocket = io(socketUrl, {
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                withCredentials: true,
            });
        } else {
            console.log("[WebSocket] Existing socket found, connected:", globalSocket.connected);
            // If socket exists but is disconnected, try to reconnect
            if (!globalSocket.connected) {
                console.log("[WebSocket] Reconnecting...");
                globalSocket.connect();
            }
            setIsConnected(globalSocket.connected);
        }

        // Set up event listeners
        const onConnect = () => {
            console.log("[WebSocket] Connected");
            setIsConnected(true);
            reconnectAttempts.current = 0;
        };

        const onDisconnect = (reason: string) => {
            console.log("[WebSocket] Disconnected:", reason);
            setIsConnected(false);
        };

        const onConnectError = (error: Error) => {
            console.error("[WebSocket] Connection error:", error.message);
            reconnectAttempts.current++;
            setIsConnected(false);
            
            if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
                console.error("[WebSocket] Max reconnection attempts reached");
                globalSocket?.disconnect();
            }
        };

        globalSocket.on("connect", onConnect);
        globalSocket.on("disconnect", onDisconnect);
        globalSocket.on("connect_error", onConnectError);

        // Check current state
        if (globalSocket.connected) {
            setIsConnected(true);
        }

        // Cleanup
        return () => {
            globalSocket?.off("connect", onConnect);
            globalSocket?.off("disconnect", onDisconnect);
            globalSocket?.off("connect_error", onConnectError);
        };
    }, []);

    // Reconnect helper
    const reconnect = useCallback(() => {
        if (globalSocket && !globalSocket.connected) {
            console.log("[WebSocket] Manual reconnect...");
            reconnectAttempts.current = 0;
            globalSocket.connect();
        }
    }, []);

    // Event subscription helpers
    const on = useCallback(<K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        globalSocket?.on(event, handler as any);
        return () => {
            globalSocket?.off(event, handler as any);
        };
    }, []);

    const off = useCallback(<K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        globalSocket?.off(event, handler as any);
    }, []);

    // Emit helpers
    const joinConversation = useCallback((conversationId: number) => {
        if (globalSocket?.connected) {
            console.log(`[WebSocket] Joining conversation ${conversationId}`);
            globalSocket.emit("conversation:join", conversationId);
        } else {
            console.log(`[WebSocket] Socket not ready, queueing join for ${conversationId}`);
            // Retry after a short delay
            setTimeout(() => joinConversation(conversationId), 500);
        }
    }, []);

    const leaveConversation = useCallback((conversationId: number) => {
        if (globalSocket?.connected) {
            console.log(`[WebSocket] Leaving conversation ${conversationId}`);
            globalSocket.emit("conversation:leave", conversationId);
        }
    }, []);

    const sendTyping = useCallback((conversationId: number, isTyping: boolean) => {
        globalSocket?.emit("conversation:typing", { conversationId, isTyping });
    }, []);

    const markAsRead = useCallback((conversationId: number) => {
        globalSocket?.emit("message:read", conversationId);
    }, []);

    return {
        isConnected,
        socket: globalSocket,
        on,
        off,
        joinConversation,
        leaveConversation,
        sendTyping,
        markAsRead,
        reconnect,
    };
}

// Hook for real-time conversation updates
export function useConversationWebSocket(conversationId: number | null) {
    const { isConnected, joinConversation, leaveConversation, on, off, sendTyping, markAsRead, socket } = useWebSocket();

    useEffect(() => {
        if (!conversationId || !isConnected) return;

        console.log(`[useConversationWebSocket] Joining conversation ${conversationId} (connected: ${isConnected})`);
        joinConversation(conversationId);
        
        return () => {
            console.log(`[useConversationWebSocket] Leaving conversation ${conversationId}`);
            leaveConversation(conversationId);
        };
    }, [conversationId, isConnected, joinConversation, leaveConversation]);

    return {
        on,
        off,
        isConnected,
        sendTyping: (isTyping: boolean) => {
            if (conversationId) sendTyping(conversationId, isTyping);
        },
        markAsRead: () => {
            if (conversationId) markAsRead(conversationId);
        },
    };
}

// Hook for real-time notifications
export function useNotificationWebSocket(onNotification: (data: any) => void) {
    const { on, off } = useWebSocket();

    useEffect(() => {
        const handler = (data: any) => onNotification(data);
        on("notification:new", handler);
        return () => off("notification:new", handler);
    }, [on, off, onNotification]);
}

// Hook for real-time task updates
export function useTaskWebSocket(
    onTaskCreated?: (data: any) => void,
    onTaskCompleted?: (data: any) => void
) {
    const { on, off } = useWebSocket();

    useEffect(() => {
        if (onTaskCreated) {
            on("task:created", onTaskCreated);
        }
        if (onTaskCompleted) {
            on("task:completed", onTaskCompleted);
        }
        return () => {
            if (onTaskCreated) off("task:created", onTaskCreated);
            if (onTaskCompleted) off("task:completed", onTaskCompleted);
        };
    }, [on, off, onTaskCreated, onTaskCompleted]);
}
