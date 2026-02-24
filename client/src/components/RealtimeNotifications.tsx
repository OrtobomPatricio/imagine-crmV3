import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import { MessageSquare, User, CheckCircle, AlertCircle, Tag } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function RealtimeNotifications() {
    const [, navigate] = useLocation();
    const { on } = useWebSocket();
    const utils = trpc.useUtils();

    // New message notification
    useEffect(() => {
        const unsubscribe = on("message:new", (data) => {
            // Only show notification if message is from contact (not from me)
            if (data.fromMe) return;

            // Play notification sound (optional)
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore autoplay errors

            // Show toast notification
            toast.info(
                <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
                    <div>
                        <div className="font-medium">Nuevo mensaje</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                            {data.senderName || "Contacto"}: {data.content}
                        </div>
                    </div>
                </div>,
                {
                    duration: 5000,
                    action: {
                        label: "Ver",
                        onClick: () => navigate(`/chat?conversation=${data.conversationId}`),
                    },
                }
            );

            // Invalidate queries to refresh UI
            utils.chat.listConversations.invalidate();
            utils.chat.getMessages.invalidate({ conversationId: data.conversationId });
        });

        return unsubscribe;
    }, [on, navigate, utils]);

    // Conversation assigned notification
    useEffect(() => {
        const unsubscribe = on("conversation:assigned", (data) => {
            toast.info(
                <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-primary" />
                    <div>
                        <div className="font-medium">Conversación asignada</div>
                        <div className="text-sm text-muted-foreground">
                            {data.assignedToName 
                                ? `Asignada a ${data.assignedToName}`
                                : "Sin asignar"
                            }
                        </div>
                    </div>
                </div>,
                {
                    action: {
                        label: "Ver",
                        onClick: () => navigate(`/chat?conversation=${data.conversationId}`),
                    },
                }
            );

            utils.chat.listConversations.invalidate();
            utils.helpdesk.listInbox.invalidate();
        });

        return unsubscribe;
    }, [on, navigate, utils]);

    // Task created notification
    useEffect(() => {
        const unsubscribe = on("task:created", (data) => {
            toast.info(
                <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-yellow-500" />
                    <div>
                        <div className="font-medium">Nueva tarea</div>
                        <div className="text-sm text-muted-foreground">{data.title}</div>
                        {data.assignedToName && (
                            <div className="text-xs text-muted-foreground">
                                Asignada a: {data.assignedToName}
                            </div>
                        )}
                    </div>
                </div>,
                {
                    action: {
                        label: "Ver",
                        onClick: () => navigate(`/leads?id=${data.leadId}&tab=tasks`),
                    },
                }
            );

            utils.notesTasks.listTasks.invalidate();
        });

        return unsubscribe;
    }, [on, navigate, utils]);

    // Task completed notification
    useEffect(() => {
        const unsubscribe = on("task:completed", (data) => {
            toast.success(
                <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                    <div>
                        <div className="font-medium">Tarea completada</div>
                        {data.completedByName && (
                            <div className="text-xs text-muted-foreground">
                                Por: {data.completedByName}
                            </div>
                        )}
                    </div>
                </div>
            );

            utils.notesTasks.listTasks.invalidate();
        });

        return unsubscribe;
    }, [on, utils]);

    // User online/offline status
    useEffect(() => {
        const unsubscribe = on("user:online", (data) => {
            // Only show for team members going online
            toast.info(
                <div className="flex items-center gap-2">
                    <div 
                        className={`w-2 h-2 rounded-full ${data.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                    />
                    <span className="text-sm">
                        {data.userName} {data.isOnline ? "está en línea" : "se desconectó"}
                    </span>
                </div>,
                { duration: 3000 }
            );
        });

        return unsubscribe;
    }, [on]);

    // WhatsApp connection status
    useEffect(() => {
        const unsubscribe = on("whatsapp:status", (data) => {
            const statusText = {
                connected: "Conectado",
                disconnected: "Desconectado",
                connecting: "Conectando...",
                qr_ready: "QR listo para escanear",
            };

            const statusColor = {
                connected: "text-green-500",
                disconnected: "text-red-500",
                connecting: "text-yellow-500",
                qr_ready: "text-blue-500",
            };

            toast.info(
                <div className="flex items-start gap-2">
                    <AlertCircle className={`h-4 w-4 mt-0.5 ${statusColor[data.status]}`} />
                    <div>
                        <div className="font-medium">WhatsApp {statusText[data.status]}</div>
                    </div>
                </div>,
                {
                    duration: data.status === "disconnected" ? 5000 : 3000,
                }
            );
        });

        return unsubscribe;
    }, [on]);

    return null; // This is a logic-only component
}
