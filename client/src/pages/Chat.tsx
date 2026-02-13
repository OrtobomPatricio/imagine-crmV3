import { ChatList } from "@/components/chat/ChatList";
import { ChatThread } from "@/components/chat/ChatThread";

import { ChatLeadDetails } from "@/components/chat/ChatLeadDetails";
import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Filter,
  ArrowUpDown,
  AlertCircle,
  Flag,
  Users,
  Layers,
  Briefcase,
  Hash,
  MessageSquare,
  Tag,
  Globe,
  Calendar,
  Clock,
  Phone
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [location, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  // List controls
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedWhatsappNumberId, setSelectedWhatsappNumberId] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<"recent" | "oldest" | "unread">("recent");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);

  const getOrCreateMutation = trpc.chat.getOrCreateByLeadId.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      window.history.replaceState({}, "", "/chat");
    },
    onError: (e) => {
      console.error("Failed to open chat for lead", e);
    }
  });

  const { data: selectedConversation } = trpc.chat.getById.useQuery(
    { id: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadIdParam = params.get("leadId");
    if (leadIdParam) {
      const leadId = parseInt(leadIdParam);
      if (!isNaN(leadId)) {
        getOrCreateMutation.mutate({ leadId });
      }
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] gap-4 relative overflow-hidden">
      {/* Left: Conversation List */}
      <Card className={cn(
        "w-full md:w-80 lg:w-96 flex flex-col h-full overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm transition-all duration-300",
        selectedConversationId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 border-b border-border/50 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight">Mensajes</h2>
            <ChannelSelector value={selectedWhatsappNumberId} onChange={setSelectedWhatsappNumberId} />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar chats..."
                className="pl-8 bg-background/50 h-8 text-xs focus-visible:ring-offset-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <SortMenu value={sort} onChange={setSort} />
            <FilterMenu
              unreadOnly={unreadOnly}
              assignedToMe={assignedToMe}
              onChange={(next) => {
                setUnreadOnly(next.unreadOnly);
                setAssignedToMe(next.assignedToMe);
              }}
              onClear={() => {
                setUnreadOnly(false);
                setAssignedToMe(false);
              }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatList
            onSelect={setSelectedConversationId}
            selectedId={selectedConversationId}
            query={{
              whatsappNumberId: selectedWhatsappNumberId,
              search: debouncedSearch || undefined,
              sort,
              unreadOnly,
              assignedToMe,
            }}
          />
        </div>
      </Card>

      {/* Center: Chat Area */}
      <Card className={cn(
        "flex-1 flex flex-col h-full overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm transition-all duration-300",
        !selectedConversationId ? "hidden md:flex" : "flex"
      )}>
        {selectedConversationId ? (
          <>
            <div className="h-14 border-b border-border/50 bg-muted/30 flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2 h-8 w-8"
                  onClick={() => setSelectedConversationId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="font-medium text-sm">Conversación Activa</span>
                </div>

                {selectedConversation && (
                  <ChatActionsMenu
                    conversationId={selectedConversation.id}
                    currentAssignedId={selectedConversation.assignedToId}
                  />
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <ChatThread conversationId={selectedConversationId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/5">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Tu Bandeja de Entrada</h3>
            <p className="text-sm max-w-md text-center text-muted-foreground/80">
              Selecciona una conversación de la izquierda para ver el historial, responder a tus leads y gestionar tus ventas.
            </p>
          </div>
        )}
      </Card>

      {/* Right: Lead Details (Collapsible) */}
      {selectedConversationId && (
        <div className="hidden xl:block animate-in fade-in slide-in-from-right-4 duration-500 h-[calc(100vh-4rem)]">
          {selectedConversation && selectedConversation.leadId ? (
            <ChatLeadDetails leadId={selectedConversation.leadId} />
          ) : (
            <div className="w-80 h-full border-l p-4 flex flex-col items-center justify-center text-muted-foreground bg-background">
              <Users className="h-8 w-8 mb-2 opacity-20" />
              <p>Este chat no tiene un lead asociado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelSelector({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const { data: channels } = trpc.whatsappNumbers.list.useQuery();

  return (
    <Select
      value={value ? String(value) : "all"}
      onValueChange={(v) => (v === "all" ? onChange(undefined) : onChange(Number(v)))}
    >
      <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/50 border-transparent hover:bg-muted/80 focus:ring-0 gap-1 rounded-full px-3">
        <Phone className="h-3 w-3 opacity-70" />
        <SelectValue placeholder="Todos los canales" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los canales</SelectItem>
        {channels?.map((channel) => (
          <SelectItem key={channel.id} value={String(channel.id)} className="text-xs">
            {channel.displayName || channel.phoneNumber}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: "recent" | "oldest" | "unread";
  onChange: (v: "recent" | "oldest" | "unread") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Ordenar" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/50 rounded-full">
          <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange("recent")}>
          {value === "recent" ? "✓ " : ""}Más recientes
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("oldest")}>
          {value === "oldest" ? "✓ " : ""}Más antiguos
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("unread")}>
          {value === "unread" ? "✓ " : ""}No leídos primero
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterMenu({
  unreadOnly,
  assignedToMe,
  onChange,
  onClear,
}: {
  unreadOnly: boolean;
  assignedToMe: boolean;
  onChange: (next: { unreadOnly: boolean; assignedToMe: boolean }) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label="Filtros" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/50 rounded-full">
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-3 border-b bg-muted/20">
          <h4 className="font-medium text-sm">Filtrar vista</h4>
          <p className="text-xs text-muted-foreground">Aplica filtros reales a la bandeja</p>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md transition-colors">
            <Checkbox
              id="unreadOnly"
              checked={unreadOnly}
              onCheckedChange={(v) => onChange({ unreadOnly: Boolean(v), assignedToMe })}
            />
            <Label htmlFor="unreadOnly" className="flex items-center gap-2 text-xs font-normal cursor-pointer flex-1">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Solo no leídos
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md transition-colors">
            <Checkbox
              id="assignedToMe"
              checked={assignedToMe}
              onCheckedChange={(v) => onChange({ unreadOnly, assignedToMe: Boolean(v) })}
            />
            <Label htmlFor="assignedToMe" className="flex items-center gap-2 text-xs font-normal cursor-pointer flex-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Asignados a mí
            </Label>
          </div>
        </div>
        <div className="p-2 border-t bg-muted/20 flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClear}>Limpiar</Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => undefined}>Cerrar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
