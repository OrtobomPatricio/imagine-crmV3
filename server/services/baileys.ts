import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from 'fs';
import path from 'path';
import pino from 'pino';

// Define session storage path
const SESSIONS_DIR = path.resolve(process.cwd(), "server", "sessions");

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

interface ConnectionState {
    status: 'connecting' | 'connected' | 'disconnected' | 'qr_ready';
    qr?: string;
    socket?: WASocket;
    typingJids?: Set<string>; // Track who is typing
}

// In-memory store for active connections
const connections: Map<number, ConnectionState> = new Map();

// Typing state cleanup timers
const typingTimers: Map<string, NodeJS.Timeout> = new Map();

export const BaileysService = {
    getSocket(userId: number) {
        return connections.get(userId)?.socket;
    },

    async initializeSession(userId: number, onQrUpdate: (qr: string) => void, onStatusUpdate: (status: string) => void) {
        const sessionName = `session_${userId}`;
        const sessionPath = path.join(SESSIONS_DIR, sessionName);

        // Setup Auth State
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }) as any,
            printQRInTerminal: false,
            auth: state,
            browser: ["Imagine CRM", "Chrome", "10.0"],
            syncFullHistory: true, // Enable full history sync
        });

        // Update local state
        connections.set(userId, { status: 'connecting', socket: sock });
        onStatusUpdate('connecting');

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                connections.set(userId, { ...connections.get(userId)!, status: 'qr_ready', qr });
                onQrUpdate(qr);
                onStatusUpdate('qr_ready');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                connections.set(userId, { status: 'disconnected' });
                onStatusUpdate('disconnected');

                if (shouldReconnect) {
                    this.initializeSession(userId, onQrUpdate, onStatusUpdate);
                } else {
                    // Logged out - clear session
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                    }
                }
            } else if (connection === 'open') {
                connections.set(userId, { ...connections.get(userId)!, status: 'connected', qr: undefined });
                onStatusUpdate('connected');
            }
        });

        // Typing Indicators
        sock.ev.on('presence.update', (update) => {
            const jid = update.id;
            const presences = update.presences || {};

            // Check if any participant is composing
            const isTyping = Object.values(presences).some(
                (p: any) => p.lastKnownPresence === 'composing'
            );

            const conn = connections.get(userId);
            if (conn) {
                if (!conn.typingJids) conn.typingJids = new Set();

                if (isTyping) {
                    conn.typingJids.add(jid);

                    // Auto-clear after 3 seconds
                    const timerKey = `${userId}-${jid}`;
                    if (typingTimers.has(timerKey)) {
                        clearTimeout(typingTimers.get(timerKey)!);
                    }
                    typingTimers.set(timerKey, setTimeout(() => {
                        conn.typingJids?.delete(jid);
                        typingTimers.delete(timerKey);
                    }, 3000));
                } else {
                    conn.typingJids.delete(jid);
                }
            }
        });

        // Read Receipts
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update.status === 3) { // Status 3 = read
                    try {
                        const { MessageHandler } = await import("./message-handler");
                        await MessageHandler.handleMessageUpdate(userId, update.key.id!, 'read');
                    } catch (e) {
                        console.error("Baileys: Error updating message status", e);
                    }
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            console.log("Baileys: messages.upsert received type:", m.type);

            if (m.messages && m.messages.length > 0) {
                for (const msg of m.messages) {
                    // Check if it's a message from another user (not us)
                    if (!msg.key.fromMe) {
                        try {
                            console.log("Baileys: Invoking MessageHandler for msg:", msg.key.id);
                            const { MessageHandler } = await import("./message-handler");
                            // Pass the upsert type (notify vs append) to handle history correctly
                            await MessageHandler.handleIncomingMessage(userId, msg, m.type);
                        } catch (e) {
                            console.error("Baileys: Error invoking MessageHandler", e);
                        }
                    } else {
                        // Ideally we should also sync our own sent messages from history
                        // But for now let's focus on incoming
                        // Validating if we should sync "fromMe" history messages too?
                        // User asked for "historial", so YES, we should probably sync sent messages from history too.
                        // Let's enable checking "fromMe" ONLY if type is NOT 'notify' (which is real-time).
                        // Real-time "fromMe" are usually handled by us sending it, but if sent from phone directly?
                        // For safety, let's stick to incoming first as per "Safety" plan, 
                        // but actually "historial" implies both sides.
                        // Let's loosen the check: pass everything to handler, let handler decide based on 'fromMe'.

                        // REVISING STRATEGY: user wants history. History includes sent messages.
                        // I will pass ALL messages to handler, but flag them.
                        try {
                            const { MessageHandler } = await import("./message-handler");
                            await MessageHandler.handleIncomingMessage(userId, msg, m.type);
                        } catch (e) {
                            console.error("Baileys: Error invoking MessageHandler for own message", e);
                        }
                    }
                }
            }
        });

        return sock;
    },

    async disconnect(userId: number) {
        const conn = connections.get(userId);
        if (conn?.socket) {
            conn.socket.end(undefined);
            connections.delete(userId);

            // Cleanup session files
            const sessionName = `session_${userId}`;
            const sessionPath = path.join(SESSIONS_DIR, sessionName);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }
    },

    getStatus(userId: number) {
        return connections.get(userId)?.status || 'disconnected';
    },

    async sendMessage(userId: number, to: string, content: any) {
        const conn = connections.get(userId);
        if (!conn?.socket) throw new Error("WhatsApp connection not active");

        const jid = to.includes('@') ? to : `${to.replace('+', '')}@s.whatsapp.net`;
        return await conn.socket.sendMessage(jid, content);
    },

    async sendReadReceipt(userId: number, to: string, messageId: string, participant?: string) {
        const conn = connections.get(userId);
        if (!conn?.socket) return; // Silent fail if not connected

        const jid = to.includes('@') ? to : `${to.replace('+', '')}@s.whatsapp.net`;

        // Correct way to send read receipt in Baileys
        await conn.socket.readMessages([
            {
                remoteJid: jid,
                id: messageId,
                participant: participant // needed for groups, optional for DMs
            }
        ]);
    },

    getQr(userId: number) {
        return connections.get(userId)?.qr;
    },

    getTypingStatus(userId: number, jid: string) {
        const conn = connections.get(userId);
        return conn?.typingJids?.has(jid) || false;
    },

    getAllTypingJids(userId: number) {
        const conn = connections.get(userId);
        return Array.from(conn?.typingJids || []);
    }
};
