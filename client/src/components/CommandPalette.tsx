import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import {
    Search,
    User,
    MessageSquare,
    LayoutGrid,
    Settings,
    BarChart3,
    HelpCircle,
    Phone,
    Calendar,
    Mail
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [, navigate] = useLocation();
    const [query, setQuery] = useState("");

    // Search queries
    const { data: leads = [] } = trpc.leads.search.useQuery(
        { query: query.trim(), limit: 5 },
        { enabled: query.length >= 2 }
    );

    const { data: conversations = [] } = trpc.chat.listConversations.useQuery(
        { search: query.trim() },
        { enabled: query.length >= 2 }
    );

    // Reset query when closing
    useEffect(() => {
        if (!open) {
            setTimeout(() => setQuery(""), 200);
        }
    }, [open]);

    // Keyboard shortcut: Cmd/Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                onOpenChange(true);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onOpenChange]);

    const handleSelect = useCallback((path: string) => {
        onOpenChange(false);
        navigate(path);
    }, [onOpenChange]);

    const hasResults = leads.length > 0 || (conversations as any[]).length > 0;

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Buscar leads, conversaciones, o navegar..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    {query.length < 2 ? (
                        <div className="text-muted-foreground">
                            Escribe al menos 2 caracteres para buscar
                        </div>
                    ) : (
                        <div className="text-muted-foreground">
                            No se encontraron resultados
                        </div>
                    )}
                </CommandEmpty>

                {/* Leads */}
                {leads.length > 0 && (
                    <CommandGroup heading="Leads">
                        {leads.map((lead: any) => (
                            <CommandItem
                                key={`lead-${lead.id}`}
                                onSelect={() => handleSelect(`/leads?id=${lead.id}`)}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                    <span>{lead.name}</span>
                                    <span className="text-xs text-muted-foreground">{lead.phone}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Conversations */}
                {(conversations as any[]).length > 0 && (
                    <>
                        {leads.length > 0 && <CommandSeparator />}
                        <CommandGroup heading="Conversaciones">
                            {(conversations as any[]).map((conv: any) => (
                                <CommandItem
                                    key={`conv-${conv.id}`}
                                    onSelect={() => handleSelect(`/chat?conversation=${conv.id}`)}
                                >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    <div className="flex flex-col flex-1">
                                        <span>{conv.contactName || conv.contactPhone}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {conv.lastMessage?.content || "Sin mensajes"}
                                        </span>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {/* Quick Navigation - only show when no search query */}
                {query.length === 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Navegación rápida">
                            <CommandItem onSelect={() => handleSelect("/dashboard")}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Dashboard
                                <span className="ml-auto text-xs text-muted-foreground">Alt+D</span>
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/leads")}>
                                <User className="mr-2 h-4 w-4" />
                                Leads
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/kanban")}>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Pipeline Kanban
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/chat")}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/scheduling")}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Agenda
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/whatsapp")}>
                                <Phone className="mr-2 h-4 w-4" />
                                WhatsApp
                            </CommandItem>
                            <CommandItem onSelect={() => handleSelect("/settings")}>
                                <Settings className="mr-2 h-4 w-4" />
                                Configuración
                            </CommandItem>
                        </CommandGroup>
                    </>
                )}

                {/* Footer hint */}
                <div className="py-2 px-2 text-xs text-muted-foreground border-t flex items-center justify-between">
                    <span>
                        {query.length >= 2 ? `${leads.length + (conversations as any[]).length} resultados` : "Escribe para buscar"}
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                        navegar
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] ml-1">↵</kbd>
                        seleccionar
                    </span>
                </div>
            </CommandList>
        </CommandDialog>
    );
}

// Hook to use command palette
export function useCommandPalette() {
    const [open, setOpen] = useState(false);
    return { open, setOpen, toggle: () => setOpen(o => !o) };
}
