import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { logger, safeError } from "../_core/logger";

// Redis instance for WebSocket adapter
const getRedisClient = () => {
    if (!process.env.REDIS_URL) return null;
    return new Redis(process.env.REDIS_URL);
};
import { getDb } from "../db";
import { users, sessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import cookie from "cookie";

// Event types for type safety
export interface ServerToClientEvents {
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

export interface ClientToServerEvents {
    "conversation:join": (conversationId: number) => void;
    "conversation:leave": (conversationId: number) => void;
    "conversation:typing": (data: { conversationId: number; isTyping: boolean }) => void;
    "message:read": (conversationId: number) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId?: number;
    userRole?: string;
    userName?: string;
    authenticated: boolean;
}

// Socket.IO instance
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

// User socket mapping for direct messaging
const userSockets = new Map<number, string[]>(); // userId -> socketIds[]

export async function initWebSocket(server: HttpServer): Promise<SocketIOServer> {
    const redis = getRedisClient();
    
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.NODE_ENV === "development" 
                ? ["http://localhost:3000", "http://localhost:5173"] 
                : [process.env.CLIENT_URL || ""],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Use Redis adapter for multi-instance scaling
    if (redis) {
        const pubClient = redis.duplicate();
        const subClient = redis.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("websocket: redis adapter enabled");
    }

    // Authentication middleware using cookies
    io.use(async (socket: Socket, next) => {
        try {
            // DEV BYPASS: Allow all connections in dev mode with bypass auth
            if (process.env.NODE_ENV === "development" && process.env.VITE_DEV_BYPASS_AUTH === "1") {
                socket.data.userId = 1; // Default dev user
                socket.data.userRole = "owner";
                socket.data.userName = "Dev User";
                socket.data.authenticated = true;
                logger.debug("websocket: dev bypass auth");
                return next();
            }

            // Parse cookies from handshake
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error("Authentication required"));
            }

            const cookies = cookie.parse(cookieHeader);
            const sessionToken = cookies.session_token || cookies.session;
            
            if (!sessionToken) {
                return next(new Error("Authentication required"));
            }

            // Validate session token
            const db = await getDb();
            if (!db) {
                return next(new Error("Database unavailable"));
            }

            const sessionRows = await db.select()
                .from(sessions)
                .where(eq(sessions.sessionToken, sessionToken))
                .limit(1);

            if (!sessionRows.length || new Date(sessionRows[0].expiresAt) < new Date()) {
                return next(new Error("Invalid or expired session"));
            }

            const userRows = await db.select()
                .from(users)
                .where(eq(users.id, sessionRows[0].userId))
                .limit(1);

            if (!userRows.length) {
                return next(new Error("User not found"));
            }

            if (!userRows[0].isActive) {
                return next(new Error("User account is disabled"));
            }

            socket.data.userId = userRows[0].id;
            socket.data.userRole = userRows[0].role;
            socket.data.userName = userRows[0].name;
            socket.data.authenticated = true;

            next();
        } catch (err) {
            logger.error({ err: safeError(err) }, "websocket auth error");
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        const userName = socket.data.userName;

        logger.info({ userId, socketId: socket.id }, "websocket: client connected");

        // Track user socket
        if (userId) {
            const sockets = userSockets.get(userId) || [];
            sockets.push(socket.id);
            userSockets.set(userId, sockets);

            // Broadcast online status
            socket.broadcast.emit("user:online", { userId, userName, isOnline: true });
        }

        // Join conversation room
        socket.on("conversation:join", (conversationId: number) => {
            const room = `conversation:${conversationId}`;
            socket.join(room);
            logger.info({ userId, conversationId, socketId: socket.id }, "websocket: client joined conversation");
        });

        // Leave conversation room
        socket.on("conversation:leave", (conversationId: number) => {
            const room = `conversation:${conversationId}`;
            socket.leave(room);
            logger.debug({ userId, conversationId }, "websocket: left conversation");
        });

        // Typing indicator
        socket.on("conversation:typing", (data: { conversationId: number; isTyping: boolean }) => {
            const room = `conversation:${data.conversationId}`;
            socket.to(room).emit("conversation:typing", {
                conversationId: data.conversationId,
                userId: userId!,
                userName: userName!,
                isTyping: data.isTyping,
            });
        });

        // Mark messages as read
        socket.on("message:read", async (conversationId: number) => {
            // Broadcast to other participants in conversation
            const room = `conversation:${conversationId}`;
            socket.to(room).emit("message:read", { conversationId, userId });
        });

        // Disconnect handler
        socket.on("disconnect", () => {
            logger.info({ userId, socketId: socket.id }, "websocket: client disconnected");
            
            if (userId) {
                const sockets = userSockets.get(userId) || [];
                const filtered = sockets.filter(id => id !== socket.id);
                
                if (filtered.length === 0) {
                    userSockets.delete(userId);
                    // Broadcast offline status
                    socket.broadcast.emit("user:online", { userId, userName, isOnline: false });
                } else {
                    userSockets.set(userId, filtered);
                }
            }
        });
    });

    logger.info("websocket: server initialized");
    return io;
}

// Get IO instance
export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    if (!io) {
        throw new Error("WebSocket server not initialized");
    }
    return io;
}

// Check if IO is initialized
export function isIOInitialized(): boolean {
    return io !== null;
}

// Emit to specific user
export function emitToUser(userId: number, event: keyof ServerToClientEvents, data: any): void {
    if (!io) return;
    const socketIds = userSockets.get(userId);
    if (socketIds) {
        socketIds.forEach(socketId => {
            io?.to(socketId).emit(event, data);
        });
    }
}

// Emit to conversation participants
export function emitToConversation(conversationId: number, event: keyof ServerToClientEvents, data: any): void {
    if (!io) {
        logger.warn("[emitToConversation] IO not initialized");
        return;
    }
    const room = `conversation:${conversationId}`;
    logger.info(`[emitToConversation] Emitting ${event} to room ${room}`);
    io.to(room).emit(event, data);
}

// Broadcast to all connected clients
export function broadcast(event: keyof ServerToClientEvents, data: any): void {
    if (!io) return;
    io.emit(event, data);
}

// Emit to users with specific role
export async function emitToRole(role: string, event: keyof ServerToClientEvents, data: any): Promise<void> {
    if (!io) return;
    
    const db = await getDb();
    if (!db) return;

    const userRows = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.role, role));

    userRows.forEach(row => {
        emitToUser(row.id, event, data);
    });
}
