import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle, Smartphone, CircleDot, CheckCircle2, AlertTriangle } from "lucide-react";

interface HelpdeskListProps {
  onSelect: (conversationId: number) => void;
  selectedId: number | null;
  queueId?: number | null;
  ticketStatus?: "pending" | "open" | "closed";
  search?: string;
}

export function HelpdeskList({ onSelect, selectedId, queueId, ticketStatus, search }: HelpdeskListProps) {
  const { data: conversations, isLoading } = trpc.helpdesk.listInbox.useQuery(
    { queueId: queueId ?? undefined, ticketStatus, search, limit: 80 },
    { refetchInterval: 8000 }
  );

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
        <h3 className="font-semibold text-foreground">No hay tickets</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-[220px]">
          Los mensajes entrantes y conversaciones asignadas aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {conversations.map((conv) => {
          const isSelected = selectedId === conv.id;
          const initial = (conv.contactName?.[0] || conv.contactPhone?.[0] || "?").toUpperCase();

          return (
            <button
              key={conv.id}
              data-testid={`helpdesk-conversation-${conv.id}`}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "relative flex items-center gap-3 p-3 rounded-lg transition-all text-left group w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/60 text-foreground"
              )}
            >
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}

              <div className="relative shrink-0">
                <Avatar className={cn("h-11 w-11 border transition-colors", isSelected ? "border-primary/20" : "border-border")}>
                  <AvatarFallback className={cn("font-medium", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {initial}
                  </AvatarFallback>
                </Avatar>
                {conv.channel === "whatsapp" && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#25D366] text-white rounded-full p-0.5 border-2 border-background shadow-sm">
                    <Smartphone className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn("font-semibold text-sm truncate pr-2", isSelected ? "text-primary" : "text-foreground")}>
                    {conv.contactName || conv.contactPhone}
                  </span>
                  {conv.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground/80 shrink-0">
                      {formatTimeAgo(new Date(conv.lastMessageAt))}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TicketStatusBadge status={(conv as any).ticketStatus as any} />
                    <p className={cn("text-xs truncate leading-relaxed max-w-[85%]", isSelected ? "text-primary/80" : "text-muted-foreground")}>
                      {conv.contactPhone}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <Badge className="shrink-0 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function TicketStatusBadge({ status }: { status?: "pending" | "open" | "closed" }) {
  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        <CheckCircle2 className="h-3 w-3" /> Cerrado
      </span>
    );
  }
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        <CircleDot className="h-3 w-3" /> Abierto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
      <AlertTriangle className="h-3 w-3" /> Pendiente
    </span>
  );
}

function formatTimeAgo(date: Date) {
  const diff = formatDistanceToNow(date, { addSuffix: false, locale: es });
  return diff
    .replace("alrededor de ", "")
    .replace("menos de un minuto", "ahora")
    .replace("minutos", "m")
    .replace("minuto", "m")
    .replace("horas", "h")
    .replace("hora", "h")
    .replace("días", "d")
    .replace("día", "d");
}
