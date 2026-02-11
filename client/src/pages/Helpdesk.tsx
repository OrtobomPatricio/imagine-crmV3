import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
          <div className="p-3 border-b border-border/50 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Helpdesk</h2>
              <Button size="sm" variant="outline" onClick={() => setSelectedConversationId(null)}>Lista</Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={queueId ? String(queueId) : "all"}
                onValueChange={(v) => setQueueId(v === "all" ? null : Number(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Cola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {queueOptions.map((q) => (
                    <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ticketStatus} onValueChange={(v) => setTicketStatus(v as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-background/50 h-8 text-xs focus-visible:ring-offset-0"
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
          {selectedConversation ? (
            <ChatLeadDetails conversation={selectedConversation} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
              Selecciona un ticket para ver detalles
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