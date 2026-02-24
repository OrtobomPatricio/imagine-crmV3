import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Phone, User, ArrowRight, MessageCircle, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface NewConversationDialogProps {
    onConversationCreated?: (conversationId: number) => void;
}

export function NewConversationDialog({ onConversationCreated }: NewConversationDialogProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [whatsappNumberId, setWhatsappNumberId] = useState<string>("");
    const [activeTab, setActiveTab] = useState("contacts");
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

    const { data: channels, isLoading: loadingChannels } = trpc.whatsappNumbers.list.useQuery();
    const { data: leads, isLoading: loadingLeads } = trpc.leads.list.useQuery({});
    const createConversation = trpc.chat.createConversation.useMutation();

    // Set default channel when channels load
    useMemo(() => {
        if (channels && channels.length > 0 && !whatsappNumberId) {
            setWhatsappNumberId(String(channels[0].id));
        }
    }, [channels, whatsappNumberId]);

    const filteredLeads = useMemo(() => {
        if (!leads) return [];
        const leadsArray = Array.isArray(leads) ? leads : (leads as any).items || [];
        if (!searchQuery.trim()) return leadsArray;
        
        const query = searchQuery.toLowerCase();
        return leadsArray.filter(
            (lead) =>
                lead.name?.toLowerCase().includes(query) ||
                lead.phone?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query)
        );
    }, [leads, searchQuery]);

    const selectedLead = useMemo(() => {
        if (!selectedLeadId || !leads) return null;
        const leadsArray = Array.isArray(leads) ? leads : (leads as any).items || [];
        return leadsArray.find((l) => l.id === selectedLeadId);
    }, [selectedLeadId, leads]);

    const handleCreateConversation = async () => {
        if (!whatsappNumberId) {
            toast.error("Selecciona un número de WhatsApp");
            return;
        }

        let contactPhone: string;
        let contactName: string | null = null;
        let leadId: number | null = null;

        if (activeTab === "contacts") {
            if (!selectedLead) {
                toast.error("Selecciona un contacto");
                return;
            }
            contactPhone = selectedLead.phone;
            contactName = selectedLead.name;
            leadId = selectedLead.id;
        } else {
            if (!phoneNumber.trim()) {
                toast.error("Ingresa un número de teléfono");
                return;
            }
            // Basic phone validation
            const cleanedPhone = phoneNumber.replace(/\s+/g, "").replace(/[^\d+]/g, "");
            if (cleanedPhone.length < 8) {
                toast.error("Número de teléfono inválido");
                return;
            }
            contactPhone = cleanedPhone;
        }

        try {
            console.log("Creating conversation:", { whatsappNumberId, contactPhone, contactName, leadId });
            const result = await createConversation.mutateAsync({
                whatsappNumberId: Number(whatsappNumberId),
                contactPhone,
                contactName,
                leadId,
            });

            if (result.success && result.id) {
                toast.success("Conversación creada");
                setOpen(false);
                onConversationCreated?.(result.id);
                // Reset state
                setSearchQuery("");
                setPhoneNumber("");
                setSelectedLeadId(null);
                setActiveTab("contacts");
            } else {
                toast.error("Error al crear conversación");
            }
        } catch (error: any) {
            const message = error?.message || error?.data?.message || "Error al crear conversación";
            toast.error(message);
            console.error("Create conversation error:", error);
        }
    };

    const isLoading = createConversation.isPending;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    size="sm" 
                    className="gap-1.5 rounded-full h-9 px-4 shadow-sm hover:shadow-md transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span>Nuevo chat</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md md:max-w-lg p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-primary" />
                        </div>
                        Nueva conversación
                    </DialogTitle>
                    <DialogDescription>
                        Inicia una conversación con un contacto existente o ingresa un número nuevo.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Channel Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                            Desde qué número
                        </Label>
                        <Select
                            value={whatsappNumberId}
                            onValueChange={setWhatsappNumberId}
                            disabled={loadingChannels}
                        >
                            <SelectTrigger className="h-11 bg-background">
                                <SelectValue placeholder="Selecciona número de WhatsApp" />
                            </SelectTrigger>
                            <SelectContent>
                                {channels?.map((channel) => (
                                    <SelectItem key={channel.id} value={String(channel.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className={channel.isConnected ? "text-green-500" : "text-gray-400"}>
                                                ●
                                            </span>
                                            {channel.displayName || channel.phoneNumber}
                                            <Badge variant="secondary" className="text-[10px] ml-1">
                                                {(channel as any).connectionType === 'qr' ? 'QR' : 'API'}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tabs for Contact vs Phone */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50 p-1">
                            <TabsTrigger 
                                value="contacts" 
                                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <User className="h-4 w-4" />
                                Mis contactos
                            </TabsTrigger>
                            <TabsTrigger 
                                value="phone"
                                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <Phone className="h-4 w-4" />
                                Número nuevo
                            </TabsTrigger>
                        </TabsList>

                        {/* Contacts Tab */}
                        <TabsContent value="contacts" className="mt-4 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, teléfono o email..."
                                    className="pl-10 h-11 bg-background"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="border rounded-lg bg-background">
                                <ScrollArea className="h-[240px]">
                                    {loadingLeads ? (
                                        <div className="p-4 space-y-3">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                                    <div className="h-10 w-10 rounded-full bg-muted" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-4 w-3/4 bg-muted rounded" />
                                                        <div className="h-3 w-1/2 bg-muted rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredLeads.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">No se encontraron contactos</p>
                                        </div>
                                    ) : (
                                        <div className="p-1">
                                            {filteredLeads.map((lead) => (
                                                <button
                                                    key={lead.id}
                                                    onClick={() => setSelectedLeadId(lead.id)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-md transition-all text-left ${
                                                        selectedLeadId === lead.id
                                                            ? "bg-primary/10 ring-1 ring-primary/30"
                                                            : "hover:bg-muted/60"
                                                    }`}
                                                >
                                                    <Avatar className="h-10 w-10 shrink-0">
                                                        <AvatarFallback className={`text-sm ${
                                                            selectedLeadId === lead.id
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground"
                                                        }`}>
                                                            {(lead.name?.[0] || lead.phone?.[0] || "?").toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-medium truncate ${
                                                            selectedLeadId === lead.id ? "text-primary" : ""
                                                        }`}>
                                                            {lead.name || "Sin nombre"}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            <span>{lead.phone}</span>
                                                        </div>
                                                    </div>
                                                    {selectedLeadId === lead.id && (
                                                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                            <Plus className="h-3 w-3 text-primary-foreground rotate-45" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </TabsContent>

                        {/* Phone Tab */}
                        <TabsContent value="phone" className="mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                        Número de teléfono
                                    </Label>
                                    <Input
                                        placeholder="Ej: +54 9 11 1234 5678"
                                        className="h-11 text-lg tracking-wide bg-background"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        type="tel"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Incluye el código de país (ej: +54 para Argentina, +595 para Paraguay)
                                    </p>
                                </div>

                                <div className="bg-muted/30 rounded-lg p-4 border border-dashed">
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageCircle className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">¿Cómo funciona?</p>
                                            <p className="text-xs text-muted-foreground">
                                                Al enviar un mensaje a este número, se creará automáticamente 
                                                un nuevo lead en tu CRM si no existe.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    
                    <Button
                        onClick={handleCreateConversation}
                        disabled={
                            isLoading ||
                            !whatsappNumberId ||
                            (activeTab === "contacts" && !selectedLead) ||
                            (activeTab === "phone" && !phoneNumber.trim())
                        }
                        className="gap-2 min-w-[140px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                Iniciar chat
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
