import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle, Smartphone } from "lucide-react";

interface ChatListProps {
    onSelect: (conversationId: number) => void;
    selectedId: number | null;
    query?: {
        whatsappNumberId?: number;
        search?: string;
        unreadOnly?: boolean;
        assignedToMe?: boolean;
        sort?: "recent" | "oldest" | "unread";
    };
}

export function ChatList({ onSelect, selectedId, query }: ChatListProps) {
    const { data: conversations, isLoading } = trpc.chat.listConversations.useQuery(query ?? {}, {
        refetchInterval: 10000, // Refresh every 10s to keep list updated
    });

    // Simple virtualization (fixed row height) to keep the UI snappy with thousands of chats
    const ITEM_HEIGHT = 76;
    const OVERSCAN = 8;
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportH, setViewportH] = useState(600);

    // Calculate virtualization ranges (must be before conditional returns)
    const total = conversations?.length || 0;
    const totalHeight = total * ITEM_HEIGHT;

    const range = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
        const end = Math.min(total, Math.ceil((scrollTop + viewportH) / ITEM_HEIGHT) + OVERSCAN);
        return { start, end };
    }, [scrollTop, viewportH, total]);

    const visible = useMemo(() => {
        return (conversations || []).slice(range.start, range.end);
    }, [conversations, range]);

    const topPad = range.start * ITEM_HEIGHT;
    const bottomPad = Math.max(0, totalHeight - topPad - visible.length * ITEM_HEIGHT);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const onScroll = () => setScrollTop(el.scrollTop);
        const onResize = () => setViewportH(el.clientHeight || 600);
        el.addEventListener("scroll", onScroll, { passive: true } as any);
        onResize();

        const ro = new ResizeObserver(() => onResize());
        ro.observe(el);

        return () => {
            el.removeEventListener("scroll", onScroll as any);
            ro.disconnect();
        };
    }, []);

    if (isLoading) {
        return (
            <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground">No hay conversaciones</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
                    Los mensajes de nuevos leads aparecerán aquí.
                </p>
            </div>
        );
    }

    const topPad = range.start * ITEM_HEIGHT;
    const bottomPad = Math.max(0, totalHeight - topPad - visible.length * ITEM_HEIGHT);

    return (
        <div ref={scrollerRef} className="h-full overflow-y-auto">
            <div style={{ height: topPad }} />
            <div className="flex flex-col gap-1 p-2">
                {visible.map((conv) => {
                    const isSelected = selectedId === conv.id;
                    const initial = (conv.contactName?.[0] || conv.contactPhone?.[0] || "?").toUpperCase();

                    const prefix = conv.lastMessageDirection === "outbound" ? "Tú: " : "";
                    const preview = buildPreview(conv);

                    return (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv.id)}
                            className={cn(
                                "relative flex items-center gap-3 p-3 rounded-lg transition-all text-left group w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isSelected
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "hover:bg-muted/60 text-foreground"
                            )}
                            style={{ minHeight: ITEM_HEIGHT }}
                        >
                            {/* Selection Indicator on Left */}
                            {isSelected && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                            )}

                            <div className="relative shrink-0">
                                <Avatar className={cn("h-11 w-11 border transition-colors", isSelected ? "border-primary/20" : "border-border")}>
                                    <AvatarFallback className={cn(
                                        "font-medium",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {initial}
                                    </AvatarFallback>
                                </Avatar>
                                {conv.channel === 'whatsapp' && (
                                    <div className="absolute -bottom-0.5 -right-0.5 bg-[#25D366] text-white rounded-full p-0.5 border-2 border-background shadow-sm">
                                        <Smartphone className="h-2.5 w-2.5" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <span className={cn(
                                            "font-semibold text-sm truncate",
                                            isSelected ? "text-primary" : "text-foreground"
                                        )}>
                                            {conv.contactName || conv.contactPhone}
                                        </span>

                                        {conv.channel === 'whatsapp' && (
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] shrink-0">
                                                {(conv.whatsappConnectionType || 'api') === 'qr' ? 'QR' : 'API'}
                                            </Badge>
                                        )}
                                    </div>

                                    {conv.lastMessageAt && (
                                        <span className="text-[10px] text-muted-foreground/80 shrink-0">
                                            {formatTimeAgo(new Date(conv.lastMessageAt))}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn(
                                        "text-xs truncate leading-relaxed max-w-[85%]",
                                        isSelected ? "text-primary/80" : "text-muted-foreground"
                                    )}>
                                        {prefix}{preview}
                                    </p>

                                    {conv.unreadCount > 0 && (
                                        <Badge
                                            className="shrink-0 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm"
                                        >
                                            {conv.unreadCount}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            <div style={{ height: bottomPad }} />
        </div>
    );
}

function buildPreview(conv: any): string {
    const t = String(conv.lastMessageType || "");
    const text = String(conv.lastMessagePreview || "").trim();
    const mediaName = String(conv.lastMessageMediaName || "").trim();

    if (!t) return conv.contactPhone || "Sin mensajes";

    if (t === "image") return "Foto";
    if (t === "video") return "Video";
    if (t === "audio") return "Audio";
    if (t === "sticker") return "Sticker";
    if (t === "location") return "Ubicación";
    if (t === "document") return mediaName ? `Documento: ${mediaName}` : "Documento";
    if (t === "template") return text ? text : "Plantilla";

    return text || conv.contactPhone || "Sin mensajes";
}

function formatTimeAgo(date: Date) {
    const diff = formatDistanceToNow(date, { addSuffix: false, locale: es });
    return diff
        .replace('alrededor de ', '')
        .replace('menos de un minuto', 'ahora')
        .replace('minutos', 'm')
        .replace('minuto', 'm')
        .replace('horas', 'h')
        .replace('hora', 'h')
        .replace('días', 'd')
        .replace('día', 'd');
}
