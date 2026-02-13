import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { HelpdeskList } from "@/components/helpdesk/HelpdeskList";
import HelpdeskChatView from "@/components/helpdesk/HelpdeskChatView";
import { ChatLeadDetails } from "@/components/chat/ChatLeadDetails";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HelpdeskQueues from "./HelpdeskQueues";
import QuickAnswers from "./QuickAnswers";

export default function Helpdesk() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [queueId, setQueueId] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState<"pending" | "open" | "closed">("pending");
  const [search, setSearch] = useState("");

  const { data: queues } = trpc.helpdesk.listQueues.useQuery();

  const { data: selectedConversation } = trpc.chat.getById.useQuery(
    { id: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  const queueOptions = useMemo(() => queues ?? [], [queues]);

  return (
    <Tabs defaultValue="inbox" className="h-[calc(100vh-80px)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="inbox">Bandeja de Entrada</TabsTrigger>
          <TabsTrigger value="queues">Colas</TabsTrigger>
          <TabsTrigger value="answers">Respuestas Rápidas</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="inbox" className="flex-1 flex gap-4 overflow-hidden mt-0 relative">
        <Card className={cn(
          "w-full md:w-80 lg:w-96 flex flex-col overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm transition-all duration-300",
          selectedConversationId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-2 border-b border-border/50 bg-muted/30 flex items-center gap-2">
            <h2 className="font-semibold tracking-tight text-sm shrink-0 hidden xl:block">Helpdesk</h2>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setSelectedConversationId(null)} title="Ver lista">
              <span className="sr-only">Lista</span>
              <Layers className="h-4 w-4" />
            </Button>

            <Select value={ticketStatus} onValueChange={(v) => setTicketStatus(v as any)}>
              <SelectTrigger className="h-7 w-[100px] text-xs px-2 bg-background/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={queueId ? String(queueId) : "all"}
              onValueChange={(v) => setQueueId(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="h-7 w-[100px] text-xs px-2 bg-background/50">
                <SelectValue placeholder="Cola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {queueOptions.map((q) => (
                  <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[80px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 bg-background/50 h-7 text-xs focus-visible:ring-offset-0 w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <HelpdeskList
              onSelect={setSelectedConversationId}
              selectedId={selectedConversationId}
              queueId={queueId}
              ticketStatus={ticketStatus}
              search={search}
            />
          </div>
        </Card>

        <Card className={cn(
          "flex-1 flex flex-col overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm transition-all duration-300",
          selectedConversationId ? "flex" : "hidden md:flex"
        )}>
          {selectedConversationId ? (
            <HelpdeskChatView conversationId={selectedConversationId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Selecciona un ticket
            </div>
          )}
        </Card>

        <div className={cn(
          "w-full lg:w-80 flex-col overflow-hidden border-border/50 shadow-sm bg-background/50 backdrop-blur-sm transition-all duration-300 hidden lg:flex"
        )}>
          {selectedConversation?.leadId ? (
            <ChatLeadDetails leadId={selectedConversation.leadId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              {selectedConversation ? "El ticket no tiene un lead asignado" : "Selecciona un ticket para ver detalles"}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="queues" className="mt-0 h-full overflow-auto">
        <HelpdeskQueues />
      </TabsContent>

      <TabsContent value="answers" className="mt-0 h-full overflow-auto">
        <QuickAnswers />
      </TabsContent>
    </Tabs>
  );
}