import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Search, Image as ImageIcon, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";

type Attachment = { url: string; name: string; type: string };

interface ChatQuickRepliesProps {
  onSelect: (content: string, attachments?: Attachment[]) => void;
}

export function ChatQuickReplies({ onSelect }: ChatQuickRepliesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const templateQueryInput = searchTerm.trim() ? { search: searchTerm.trim() } : undefined;

  const { data: templates = [] } = trpc.templates.quickList.useQuery(templateQueryInput);
  const { data: quickAnswers = [] } = trpc.helpdesk.listQuickAnswers.useQuery(templateQueryInput);

  const hasAnything = (quickAnswers?.length ?? 0) + (templates?.length ?? 0) > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Respuestas rápidas y plantillas"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full transition-colors"
        >
          <Zap className="h-5 w-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className="w-80 p-0 overflow-hidden shadow-xl border-border/60">
        <div className="p-3 bg-muted/30 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar respuestas..."
              className="h-8 pl-8 text-xs bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-3">
            {!hasAnything ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No hay respuestas disponibles.
                <br />
                Crea quick answers en Helpdesk o plantillas en Campaigns.
              </div>
            ) : (
              <>
                {/* Quick Answers */}
                {quickAnswers?.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-1 text-[11px] font-medium text-muted-foreground">Respuestas rápidas</div>
                    <div className="space-y-1">
                      {quickAnswers.map((qa: any) => (
                        <div
                          key={qa.id}
                          className="flex flex-col gap-1 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                          onClick={() => {
                            onSelect(qa.message, (qa.attachments || []) as Attachment[]);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-sm text-foreground/90">{qa.shortcut}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{qa.message}</p>

                          {Array.isArray(qa.attachments) && qa.attachments.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {qa.attachments.map((a: any, i: number) => (
                                <div
                                  key={i}
                                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded border flex items-center gap-1"
                                >
                                  {String(a.type || "").startsWith("image") ? (
                                    <ImageIcon className="h-3 w-3" />
                                  ) : (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  <span className="truncate max-w-[110px]">{a.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {templates?.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-1 text-[11px] font-medium text-muted-foreground">Plantillas</div>
                    <div className="space-y-1">
                      {templates.map((t: any) => (
                        <div
                          key={t.id}
                          className="flex flex-col gap-1 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                          onClick={() => {
                            onSelect(t.content, (t.attachments || []) as Attachment[]);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-sm text-foreground/90">{t.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{t.content}</p>

                          {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {t.attachments.map((a: any, i: number) => (
                                <div
                                  key={i}
                                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded border flex items-center gap-1"
                                >
                                  {String(a.type || "").startsWith("image") ? (
                                    <ImageIcon className="h-3 w-3" />
                                  ) : (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  <span className="truncate max-w-[110px]">{a.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
