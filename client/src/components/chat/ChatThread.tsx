import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Paperclip, Send, MapPin, X, ArrowDown, RefreshCw, Loader2, Check, CheckCheck, Clock, Smile } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChatQuickReplies } from "@/components/chat/ChatQuickReplies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  conversationId: number;
  showHelpdeskControls?: boolean;
}

type PendingAttachment = { url: string; name: string; type: string };

type UploadingAttachment = {
  id: string;
  name: string;
  type: string;
  progress: number; // 0..100
  status: "uploading" | "failed";
  error?: string;
};

type SendQueueItem = {
  id: string;
  kind: "text" | "attachment";
  label: string;
  payload: any;
  status: "queued" | "sending" | "sent" | "failed";
  attempts: number;
  nextRetryAt?: number;
  error?: string;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const MAX_AUTO_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

function isProbablyMediaId(value: string) {
  // Meta media IDs are numeric-ish strings; Baileys local URLs start with /api/uploads or http(s)
  if (!value) return false;
  if (value.startsWith("/api/uploads")) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  // If it is only digits and length is large, likely an id
  return /^\d{8,}$/.test(value.trim());
}

export function ChatThread({ conversationId, showHelpdeskControls = false }: Props) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState<UploadingAttachment[]>([]);
  const uploadXhrByIdRef = useRef<Record<string, XMLHttpRequest | null>>({});
  const uploadFileByIdRef = useRef<Record<string, File>>({});

  // Auto-retry countdown UI
  const [nowTick, setNowTick] = useState(() => Date.now());
  const retryTimersRef = useRef<Record<string, any>>({});

  // Scroll UX
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const prevLenRef = useRef(0);

  // Send queue UX
  const [sendQueue, setSendQueue] = useState<SendQueueItem[]>([]);
  const sendQueueRef = useRef<SendQueueItem[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Typing indicator (simulated client-side for now)
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    // Don't close picker for multiple emoji insertion
  };

  useEffect(() => {
    sendQueueRef.current = sendQueue;
  }, [sendQueue]);

  const isPrivileged = useMemo(() => {
    const role = (user?.role || "viewer") as string;
    return ["owner", "admin", "supervisor"].includes(role);
  }, [user?.role]);

  const { data: conversation } = trpc.chat.getById.useQuery(
    { id: conversationId },
    { enabled: showHelpdeskControls }
  );

  const { data: queues } = trpc.helpdesk.listQueues.useQuery(undefined, {
    enabled: showHelpdeskControls && isPrivileged,
  });

  const { data: users } = trpc.team.listUsers.useQuery(undefined, {
    enabled: showHelpdeskControls && isPrivileged,
  });

  const messagesQuery = trpc.chat.getMessages.useInfiniteQuery(
    { conversationId, limit: 50 },
    {
      getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
    }
  );

  const markAsRead = trpc.chat.markAsRead.useMutation({
    onSuccess: async () => {
      // Refresh badges immediately
      await utils.chat.listConversations.invalidate();
      await utils.helpdesk.listInbox.invalidate();
    },
  });

  const setTicketStatus = trpc.helpdesk.setTicketStatus.useMutation({
    onSuccess: async () => {
      await utils.chat.getById.invalidate({ id: conversationId });
      await utils.helpdesk.listInbox.invalidate();
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const setConversationQueue = trpc.helpdesk.setConversationQueue.useMutation({
    onSuccess: async () => {
      await utils.chat.getById.invalidate({ id: conversationId });
      await utils.helpdesk.listInbox.invalidate();
      toast.success("Cola actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const assignConversation = trpc.helpdesk.assignConversation.useMutation({
    onSuccess: async () => {
      await utils.chat.getById.invalidate({ id: conversationId });
      await utils.helpdesk.listInbox.invalidate();
      toast.success("Asignación actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onError: (error) => {
      toast.error(`Error al enviar: ${error.message}`);
    },
  });

  const sortedMessages = useMemo(() => {
    // Fix: Access items correctly based on return type structure
    const pages = messagesQuery.data?.pages || [];
    const list = pages.flatMap((p: any) => p.items || []) ?? [];
    return [...list].sort((a: any, b: any) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [messagesQuery.data]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Track whether the user is near the bottom (to avoid auto-jumping while reading)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance < 80;
      setIsAtBottom(nearBottom);
      if (nearBottom) setUnseenCount(0);
    };

    el.addEventListener("scroll", onScroll, { passive: true } as any);
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll as any);
    };
  }, [conversationId]);

  // On conversation change: mark read + go bottom once messages load
  useEffect(() => {
    prevLenRef.current = 0;
    setUnseenCount(0);
    setIsAtBottom(true);
    markAsRead.mutate({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // When new messages arrive, only auto-scroll if user is at bottom
  useEffect(() => {
    const prev = prevLenRef.current;
    const curr = sortedMessages.length;

    if (curr > prev) {
      const delta = curr - prev;
      if (isAtBottom) {
        scrollToBottom("auto");
      } else {
        setUnseenCount((c) => c + delta);
      }
    }

    prevLenRef.current = curr;
  }, [sortedMessages.length, isAtBottom]);

  const invalidateChatLists = async () => {
    await utils.chat.getMessages.invalidate({ conversationId, limit: 50 });
    await utils.chat.listConversations.invalidate();
    await utils.helpdesk.listInbox.invalidate();
  };

  const updateQueueItem = (id: string, patch: Partial<SendQueueItem>) => {
    setSendQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  // Keep a lightweight tick only when needed (countdown + button labels)
  useEffect(() => {
    const needsTick = sendQueue.some((q) => q.status === "failed" && typeof q.nextRetryAt === "number" && q.attempts < MAX_AUTO_RETRIES);
    if (!needsTick) return;
    const i = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(i);
  }, [sendQueue]);

  // Schedule auto-retries (exponential backoff) without spamming the API
  useEffect(() => {
    // Clear timers that are no longer relevant
    const activeIds = new Set(sendQueue.map((q) => q.id));
    for (const id of Object.keys(retryTimersRef.current)) {
      if (!activeIds.has(id)) {
        clearTimeout(retryTimersRef.current[id]);
        delete retryTimersRef.current[id];
      }
    }

    sendQueue.forEach((q) => {
      if (q.status !== "failed") {
        if (retryTimersRef.current[q.id]) {
          clearTimeout(retryTimersRef.current[q.id]);
          delete retryTimersRef.current[q.id];
        }
        return;
      }

      if (q.attempts >= MAX_AUTO_RETRIES) return;
      if (typeof q.nextRetryAt !== "number") return;

      const delay = Math.max(0, q.nextRetryAt - Date.now());

      // If already scheduled, don't schedule again
      if (retryTimersRef.current[q.id]) return;

      retryTimersRef.current[q.id] = setTimeout(() => {
        // Move back to queue; processor effect will pick it up
        updateQueueItem(q.id, { status: "queued", error: undefined });
        delete retryTimersRef.current[q.id];
      }, delay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendQueue]);

  const processQueue = async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      while (true) {
        const next = sendQueueRef.current.find((it) => it.status === "queued");
        if (!next) break;

        const attempt = (next.attempts || 0) + 1;
        updateQueueItem(next.id, { status: "sending", attempts: attempt, nextRetryAt: undefined, error: undefined });

        try {
          // Use mutateAsync to serialize sends
          // @ts-ignore - mutateAsync exists in react-query mutation
          await sendMessage.mutateAsync(next.payload);
          updateQueueItem(next.id, { status: "sent" });

          // Keep UI fresh without spamming full list refresh too hard
          await utils.chat.getMessages.invalidate({ conversationId, limit: 50 });
          if (isAtBottom) scrollToBottom("auto");
        } catch (e: any) {
          const message = e?.message || "Error";
          // Exponential backoff: 2s, 4s, 8s (capped)
          if (attempt < MAX_AUTO_RETRIES) {
            const delay = Math.min(30000, BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1)));
            updateQueueItem(next.id, {
              status: "failed",
              error: message,
              nextRetryAt: Date.now() + delay,
            });
          } else {
            updateQueueItem(next.id, { status: "failed", error: message });
          }
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      // One final refresh for sidebar badges
      await utils.chat.listConversations.invalidate();
      await utils.helpdesk.listInbox.invalidate();
    }
  };

  // Start processing whenever queue changes
  useEffect(() => {
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendQueue.length]);

  const enqueueMessages = (items: SendQueueItem[]) => {
    setSendQueue((prev) => [...prev, ...items]);
  };

  const handleSendMessage = () => {
    const hasText = Boolean(message.trim());
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    const items: SendQueueItem[] = [];

    if (hasText) {
      items.push({
        id: uid(),
        kind: "text",
        label: `Texto: ${message.trim().slice(0, 60)}${message.trim().length > 60 ? "…" : ""}`,
        status: "queued",
        attempts: 0,
        payload: {
          conversationId,
          content: message,
          messageType: "text",
        },
      });
    }

    if (hasAttachments) {
      pendingAttachments.forEach((a) => {
        const type = String(a.type || "");
        let messageType: any = "document";
        if (type.startsWith("image/")) messageType = "image";
        else if (type.startsWith("video/")) messageType = "video";
        else if (type.startsWith("audio/")) messageType = "audio";

        items.push({
          id: uid(),
          kind: "attachment",
          label: `Adjunto: ${a.name}`,
          status: "queued",
          attempts: 0,
          payload: {
            conversationId,
            content: a.name,
            messageType,
            mediaUrl: a.url,
            mediaName: a.name,
            mediaMimeType: a.type,
          },
        });
      });
    }

    enqueueMessages(items);
    setMessage("");
    setPendingAttachments([]);

    // If user is at bottom, keep the feeling of "sent"
    setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const updateUploading = (id: string, patch: Partial<UploadingAttachment>) => {
    setUploadingAttachments((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeUploading = (id: string) => {
    setUploadingAttachments((prev) => prev.filter((it) => it.id !== id));
    const xhr = uploadXhrByIdRef.current[id];
    if (xhr) {
      try {
        xhr.abort();
      } catch { }
    }
    delete uploadXhrByIdRef.current[id];
    delete uploadFileByIdRef.current[id];
  };

  const uploadSingleFile = (id: string, file: File) => {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadXhrByIdRef.current[id] = xhr;

      xhr.open("POST", "/api/upload", true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        updateUploading(id, { progress: pct });
      };

      xhr.onerror = () => reject(new Error("Error de red"));
      xhr.onabort = () => reject(new Error("Upload cancelado"));

      xhr.onload = () => {
        try {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
            return;
          }

          const data = JSON.parse(xhr.responseText || "{}");
          const files = Array.isArray(data?.files) ? data.files : [];
          if (files.length === 0) {
            reject(new Error("Upload response missing files"));
            return;
          }
          resolve(files[0]);
        } catch (e: any) {
          reject(new Error(e?.message || "Respuesta inválida"));
        }
      };

      const formData = new FormData();
      formData.append("files", file);
      formData.append("conversationId", conversationId.toString());

      xhr.send(formData);
    });
  };

  const startUploadAttachment = async (id: string) => {
    const file = uploadFileByIdRef.current[id];
    if (!file) return;

    try {
      updateUploading(id, { status: "uploading", error: undefined, progress: 0 });
      const u = await uploadSingleFile(id, file);

      const mime = u?.mimetype || file.type || "application/octet-stream";
      const attachment: PendingAttachment = {
        url: u.url,
        name: u.originalname || file.name || "archivo",
        type: mime,
      };

      setPendingAttachments((prev) => [...prev, attachment]);
      removeUploading(id);
      toast.success("Archivo listo para enviar");
    } catch (error: any) {
      updateUploading(id, { status: "failed", error: error?.message || "Error" });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Reset input early so selecting the same file again works
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsUploading(true);
    try {
      // Create upload items first so UI shows progress immediately
      const items: UploadingAttachment[] = files.map((f) => {
        const id = uid();
        uploadFileByIdRef.current[id] = f;
        return { id, name: f.name, type: f.type || "application/octet-stream", progress: 0, status: "uploading" };
      });

      setUploadingAttachments((prev) => [...prev, ...items]);

      // Upload sequentially: gives per-file progress and avoids saturating bandwidth
      for (const it of items) {
        // eslint-disable-next-line no-await-in-loop
        await startUploadAttachment(it.id);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessageBody = (msg: any) => {
    if (msg.messageType === "image") {
      if (!msg.mediaUrl || isProbablyMediaId(msg.mediaUrl)) {
        return <div className="text-xs text-muted-foreground">Imagen recibida (pendiente de descarga)</div>;
      }
      return (
        <img
          src={msg.mediaUrl}
          alt={msg.content}
          className="max-w-full max-h-64 rounded-md"
          loading="lazy"
        />
      );
    }

    if (msg.messageType === "video") {
      if (!msg.mediaUrl || isProbablyMediaId(msg.mediaUrl)) {
        return <div className="text-xs text-muted-foreground">Video recibido (pendiente de descarga)</div>;
      }
      return <video controls className="max-w-full max-h-72 rounded-md" src={msg.mediaUrl} />;
    }

    if (msg.messageType === "audio") {
      if (!msg.mediaUrl || isProbablyMediaId(msg.mediaUrl)) {
        return <div className="text-xs text-muted-foreground">Audio recibido (pendiente de descarga)</div>;
      }
      return <audio controls src={msg.mediaUrl} />;
    }

    if (msg.messageType === "sticker") {
      if (!msg.mediaUrl || isProbablyMediaId(msg.mediaUrl)) {
        return <div className="text-xs text-muted-foreground">Sticker recibido (pendiente de descarga)</div>;
      }
      return (
        <img
          src={msg.mediaUrl}
          alt={msg.content}
          className="max-w-full max-h-48 rounded-md"
          loading="lazy"
        />
      );
    }

    if (msg.messageType === "location") {
      const lat = msg.latitude;
      const lng = msg.longitude;
      const url = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : undefined;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            <span>{msg.locationName || "Ubicación"}</span>
          </div>
          {url ? (
            <a className="text-xs underline" href={url} target="_blank" rel="noreferrer">
              Abrir en Maps
            </a>
          ) : (
            <div className="text-xs text-muted-foreground">Sin coordenadas</div>
          )}
        </div>
      );
    }

    if (msg.messageType === "document") {
      if (msg.mediaUrl) {
        return (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:underline"
          >
            <FileText className="h-4 w-4" />
            <span>{msg.mediaName || msg.content}</span>
          </a>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>{msg.content}</span>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap">{msg.content}</div>;
  };

  const renderQueueStatusIcon = (status: SendQueueItem["status"]) => {
    if (status === "sending") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    if (status === "sent") return <span className="text-xs">✓</span>;
    if (status === "failed") return <span className="text-xs">⚠</span>;
    return <span className="text-xs">•</span>;
  };

  return (
    <div className="flex flex-col h-full">
      {showHelpdeskControls && isPrivileged && conversation && (
        <div className="border-b p-3 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Ticket</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Estado</div>
              <Select
                value={(conversation as any).ticketStatus || "pending"}
                onValueChange={(v) => setTicketStatus.mutate({ conversationId, ticketStatus: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cola</div>
              <Select
                value={(conversation as any).queueId ? String((conversation as any).queueId) : "none"}
                onValueChange={(v) => {
                  const queueId = v === "none" ? null : Number(v);
                  setConversationQueue.mutate({ conversationId, queueId });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cola</SelectItem>
                  {(queues ?? []).map((q: any) => (
                    <SelectItem key={q.id} value={String(q.id)}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Agente</div>
              <Select
                value={(conversation as any).assignedToId ? String((conversation as any).assignedToId) : "none"}
                onValueChange={(v) => {
                  const userId = v === "none" ? null : Number(v);
                  // Fix: Correct input property name 'assignedToId'
                  assignConversation.mutate({ conversationId, assignedToId: userId });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {(users ?? []).filter((u: any) => u.isActive).map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1">
        <div ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messagesQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center text-muted-foreground">No hay mensajes</div>
          ) : (
            <>
              {messagesQuery.hasPreviousPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messagesQuery.isFetchingPreviousPage}
                    onClick={() => messagesQuery.fetchPreviousPage()}
                  >
                    {messagesQuery.isFetchingPreviousPage ? "Cargando..." : "Cargar mensajes anteriores"}
                  </Button>
                </div>
              )}

              {sortedMessages.map((msg: any) => {
                const isOutgoing = msg.direction === "outbound";

                // Render proper status icon based on read/delivered/sent
                const getStatusIcon = () => {
                  if (msg.status === "failed") {
                    return <span className="text-red-400">⚠</span>;
                  }
                  if (msg.readAt) {
                    return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
                  }
                  if (msg.deliveredAt) {
                    return <CheckCheck className="w-3.5 h-3.5 opacity-60" />;
                  }
                  if (msg.sentAt || msg.status === "sent") {
                    return <Check className="w-3.5 h-3.5 opacity-60" />;
                  }
                  return <Clock className="w-3.5 h-3.5 opacity-40" />;
                };

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${isOutgoing ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                    >
                      <div className="text-sm">{renderMessageBody(msg)}</div>
                      <div
                        className={`text-xs mt-1 ${isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                          } flex items-center gap-1 justify-end`}
                      >
                        {format(new Date(msg.createdAt), "HH:mm")}
                        {isOutgoing && <span className="ml-1">{getStatusIcon()}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isContactTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">escribiendo...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isAtBottom && (unseenCount > 0 || sortedMessages.length > 0) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                scrollToBottom("smooth");
                setUnseenCount(0);
              }}
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              {unseenCount > 0 ? `Nuevos mensajes (${unseenCount})` : "Bajar"}
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 space-y-2">
        {/* Send queue */}
        {sendQueue.some((q) => q.status !== "sent") && (
          <div className="rounded-md border bg-muted/40 p-2 space-y-1">
            <div className="text-[11px] text-muted-foreground">Cola de envío</div>
            <div className="space-y-1">
              {sendQueue
                .filter((q) => q.status !== "sent")
                .slice(0, 5)
                .map((q) => (
                  <div key={q.id} className="flex items-center gap-2 text-xs">
                    <span className="w-4 flex justify-center">{renderQueueStatusIcon(q.status)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{q.label}</div>
                      {q.status === "failed" && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {typeof q.nextRetryAt === "number" && q.attempts < MAX_AUTO_RETRIES
                            ? `Reintento automático en ${Math.max(0, Math.ceil((q.nextRetryAt - nowTick) / 1000))}s`
                            : "Falló. Puedes reintentar."}
                        </div>
                      )}
                    </div>
                    {q.status === "failed" && (
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Reintentar"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                updateQueueItem(q.id, { status: "queued", nextRetryAt: undefined, error: undefined });
                                processQueue();
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>Reintentar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Quitar"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSendQueue((prev) => prev.filter((x) => x.id !== q.id))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>Quitar</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                ))}
              {sendQueue.filter((q) => q.status !== "sent").length > 5 && (
                <div className="text-[11px] text-muted-foreground">
                  +{sendQueue.filter((q) => q.status !== "sent").length - 5} más…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Uploads in progress */}
        {uploadingAttachments.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2 space-y-2">
            <div className="text-[11px] text-muted-foreground">Subiendo archivos</div>
            <div className="space-y-2">
              {uploadingAttachments.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground shrink-0">
                        {u.status === "failed" ? "Error" : `${u.progress}%`}
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary" style={{ width: `${u.status === "failed" ? 100 : u.progress}%`, opacity: u.status === "failed" ? 0.35 : 1 }} />
                    </div>
                    {u.status === "failed" && (
                      <div className="text-[11px] text-muted-foreground mt-1 truncate">
                        {u.error || "No se pudo subir"}
                      </div>
                    )}
                  </div>

                  {u.status === "failed" ? (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label="Reintentar upload"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startUploadAttachment(u.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>Reintentar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label="Quitar upload"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeUploading(u.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>Quitar</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          aria-label="Cancelar upload"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeUploading(u.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>Cancelar</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments ready */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md border text-xs">
                <span className="truncate max-w-[240px]">{a.name}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Quitar adjunto"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>Quitar</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            data-testid="file-input"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Adjuntar archivos"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="attach-button"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{isUploading ? "Subiendo…" : "Adjuntar"}</TooltipContent>
          </Tooltip>

          <ChatQuickReplies
            onSelect={(content, attachments) => {
              setMessage((prev) => (prev ? `${prev}\n${content}` : content));
              if (Array.isArray(attachments) && attachments.length > 0) {
                setPendingAttachments((prev) => [...prev, ...attachments]);
                toast.message("Plantilla cargada", { description: "Se agregaron adjuntos listos para enviar" });
              }
            }}
          />

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full transition-colors"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-0 border-none shadow-none bg-transparent">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                emojiStyle={"native" as any}
                lazyLoadEmojis={true}
                width="100%"
                height={350}
              />
            </PopoverContent>
          </Popover>

          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje…"
              className="min-h-[40px] max-h-32 resize-none"
              data-testid="chat-input"
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Enviar"
                onClick={handleSendMessage}
                disabled={(!message.trim() && pendingAttachments.length === 0) || sendMessage.isPending}
                data-testid="send-button"
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>Enviar</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default ChatThread;
