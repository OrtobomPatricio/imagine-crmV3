import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
    Bell,
    Plus,
    Calendar,
    Clock,
    Trash2,
    Repeat,
    Image as ImageIcon,
    FileText,
    CheckCircle2,
    X,
    AlertCircle,
    Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LeadRemindersProps {
    leadId: number;
}

interface ReminderButton {
    id: string;
    text: string;
}

const statusConfig = {
    scheduled: { label: "Programado", color: "bg-blue-500/10 text-blue-500", icon: Clock },
    sent: { label: "Enviado", color: "bg-green-500/10 text-green-500", icon: Send },
    failed: { label: "Fallido", color: "bg-red-500/10 text-red-500", icon: AlertCircle },
    cancelled: { label: "Cancelado", color: "bg-gray-500/10 text-gray-500", icon: X },
};

export function LeadReminders({ leadId }: LeadRemindersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("upcoming");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [newReminder, setNewReminder] = useState({
        message: "",
        scheduledDate: "",
        scheduledTime: "",
        timezone: "America/Asuncion",
        messageType: "text" as "text" | "image" | "document" | "template",
        isRecurring: false,
        recurrencePattern: "daily" as "daily" | "weekly" | "monthly",
        recurrenceEndDate: "",
        buttons: [] as ReminderButton[],
        mediaUrl: "",
        mediaName: "",
    });

    const [newButtonText, setNewButtonText] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);

    const [conversation, setConversation] = useState<any>(null);
    const getOrCreateConv = trpc.chat.getOrCreateByLeadId.useMutation();

    // Fetch conversation on mount
    useEffect(() => {
        getOrCreateConv.mutateAsync({ leadId }).then(setConversation).catch(console.error);
    }, [leadId]);

    const { data: reminders = [], refetch } = trpc.leadReminders.listByLead.useQuery({ leadId });
    const createMutation = trpc.leadReminders.create.useMutation();
    const cancelMutation = trpc.leadReminders.cancel.useMutation();
    const deleteMutation = trpc.leadReminders.delete.useMutation();

    const upcomingReminders = reminders.filter((r: any) => r.status === "scheduled");
    const sentReminders = reminders.filter((r: any) => r.status === "sent");
    const failedReminders = reminders.filter((r: any) => r.status === "failed" || r.status === "cancelled");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);

        try {
            const formData = new FormData();
            formData.append("files", file);

            const response = await fetch("/api/uploads", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            const uploadedFile = data.files[0];

            setNewReminder(prev => ({
                ...prev,
                mediaUrl: uploadedFile.url,
                mediaName: uploadedFile.originalname,
                messageType: file.type.startsWith("image/") ? "image" : "document",
            }));

            toast.success("Archivo subido correctamente");
        } catch (error) {
            toast.error("Error al subir archivo");
        } finally {
            setUploadingFile(false);
        }
    };

    const addButton = () => {
        if (!newButtonText.trim() || newReminder.buttons.length >= 3) return;

        const newButton: ReminderButton = {
            id: `btn_${Date.now()}`,
            text: newButtonText.trim(),
        };

        setNewReminder(prev => ({
            ...prev,
            buttons: [...prev.buttons, newButton],
        }));
        setNewButtonText("");
    };

    const removeButton = (id: string) => {
        setNewReminder(prev => ({
            ...prev,
            buttons: prev.buttons.filter(b => b.id !== id),
        }));
    };

    const handleCreate = async () => {
        if (!newReminder.message.trim()) {
            toast.error("El mensaje es requerido");
            return;
        }
        if (!newReminder.scheduledDate || !newReminder.scheduledTime) {
            toast.error("Fecha y hora son requeridas");
            return;
        }

        const scheduledAt = new Date(`${newReminder.scheduledDate}T${newReminder.scheduledTime}`);

        if (scheduledAt <= new Date()) {
            toast.error("La fecha debe ser en el futuro");
            return;
        }

        try {
            await createMutation.mutateAsync({
                leadId,
                conversationId: conversation?.id,
                scheduledAt: scheduledAt.toISOString(),
                timezone: newReminder.timezone,
                message: newReminder.message.trim(),
                messageType: newReminder.messageType,
                mediaUrl: newReminder.mediaUrl || undefined,
                mediaName: newReminder.mediaName || undefined,
                buttons: newReminder.buttons.length > 0 ? newReminder.buttons : undefined,
                isRecurring: newReminder.isRecurring,
                recurrencePattern: newReminder.isRecurring ? newReminder.recurrencePattern : undefined,
                recurrenceEndDate: newReminder.isRecurring && newReminder.recurrenceEndDate
                    ? new Date(newReminder.recurrenceEndDate).toISOString()
                    : undefined,
            });

            toast.success("Recordatorio programado correctamente");
            setIsOpen(false);
            resetForm();
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Error al crear recordatorio");
        }
    };

    const resetForm = () => {
        setNewReminder({
            message: "",
            scheduledDate: "",
            scheduledTime: "",
            timezone: "America/Asuncion",
            messageType: "text",
            isRecurring: false,
            recurrencePattern: "daily",
            recurrenceEndDate: "",
            buttons: [],
            mediaUrl: "",
            mediaName: "",
        });
        setNewButtonText("");
    };

    const handleCancel = async (id: number) => {
        if (!confirm("¿Cancelar este recordatorio?")) return;

        try {
            await cancelMutation.mutateAsync({ id });
            toast.success("Recordatorio cancelado");
            refetch();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar permanentemente este recordatorio?")) return;

        try {
            await deleteMutation.mutateAsync({ id });
            toast.success("Recordatorio eliminado");
            refetch();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const ReminderItem = ({ reminder }: { reminder: any }) => {
        const status = statusConfig[reminder.status as keyof typeof statusConfig];
        const StatusIcon = status.icon;
        const buttons = reminder.buttons as ReminderButton[] | null;

        return (
            <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className={cn("text-xs", status.color)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                            </Badge>
                            {reminder.isRecurring && (
                                <Badge variant="outline" className="text-xs">
                                    <Repeat className="h-3 w-3 mr-1" />
                                    Recurrente
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm font-medium line-clamp-2">{reminder.message}</p>

                        {buttons && buttons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {buttons.map((btn: ReminderButton) => (
                                    <Badge key={btn.id} variant="outline" className="text-xs bg-primary/5">
                                        {btn.text}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {reminder.mediaUrl && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {reminder.messageType === "image" ? (
                                    <ImageIcon className="h-3 w-3" />
                                ) : (
                                    <FileText className="h-3 w-3" />
                                )}
                                <span className="truncate">{reminder.mediaName || "Archivo adjunto"}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(reminder.scheduledAt), "dd MMM yyyy HH:mm", { locale: es })}
                            </span>
                        </div>

                        {reminder.response && (
                            <div className="mt-2 p-2 bg-green-500/10 rounded text-xs">
                                <span className="font-medium text-green-600">Respuesta:</span>{" "}
                                {reminder.response}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        {reminder.status === "scheduled" && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCancel(reminder.id)}
                            >
                                <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(reminder.id)}
                        >
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    <span>Recordatorios ({upcomingReminders.length})</span>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4 mr-1" />
                            Nuevo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nuevo Recordatorio Programado</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Message */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Mensaje
                                </label>
                                <Textarea
                                    value={newReminder.message}
                                    onChange={(e) =>
                                        setNewReminder({ ...newReminder, message: e.target.value })
                                    }
                                    placeholder="Escribe el mensaje que se enviará al lead..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            {/* Media Attachment */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Archivo adjunto (opcional)
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf,.doc,.docx"
                                    className="hidden"
                                />

                                {newReminder.mediaUrl ? (
                                    <div className="flex items-center gap-2 p-2 border rounded bg-muted/50">
                                        {newReminder.messageType === "image" ? (
                                            <ImageIcon className="h-4 w-4" />
                                        ) : (
                                            <FileText className="h-4 w-4" />
                                        )}
                                        <span className="text-sm flex-1 truncate">{newReminder.mediaName}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => setNewReminder(prev => ({ ...prev, mediaUrl: "", mediaName: "" }))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingFile}
                                    >
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        {uploadingFile ? "Subiendo..." : "Adjuntar imagen o documento"}
                                    </Button>
                                )}
                            </div>

                            {/* Interactive Buttons */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Botones de respuesta rápida (máx. 3)
                                </label>

                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newButtonText}
                                        onChange={(e) => setNewButtonText(e.target.value)}
                                        placeholder="Texto del botón"
                                        maxLength={20}
                                        onKeyDown={(e) => e.key === "Enter" && addButton()}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={addButton}
                                        disabled={!newButtonText.trim() || newReminder.buttons.length >= 3}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                {newReminder.buttons.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {newReminder.buttons.map((btn) => (
                                            <Badge key={btn.id} variant="secondary" className="gap-1">
                                                {btn.text}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-4 w-4 p-0 ml-1"
                                                    onClick={() => removeButton(btn.id)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Date and Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Fecha
                                    </label>
                                    <Input
                                        type="date"
                                        value={newReminder.scheduledDate}
                                        onChange={(e) =>
                                            setNewReminder({ ...newReminder, scheduledDate: e.target.value })
                                        }
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Hora
                                    </label>
                                    <Input
                                        type="time"
                                        value={newReminder.scheduledTime}
                                        onChange={(e) =>
                                            setNewReminder({ ...newReminder, scheduledTime: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Timezone */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Zona horaria
                                </label>
                                <Select
                                    value={newReminder.timezone}
                                    onValueChange={(v) =>
                                        setNewReminder({ ...newReminder, timezone: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="America/Asuncion">Paraguay (GMT-3)</SelectItem>
                                        <SelectItem value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</SelectItem>
                                        <SelectItem value="America/Sao_Paulo">Brasil (GMT-3)</SelectItem>
                                        <SelectItem value="America/Bogota">Colombia (GMT-5)</SelectItem>
                                        <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                                        <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                                        <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Recurring */}
                            <div className="flex items-center gap-2 p-3 border rounded">
                                <Checkbox
                                    checked={newReminder.isRecurring}
                                    onCheckedChange={(checked) =>
                                        setNewReminder({ ...newReminder, isRecurring: checked as boolean })
                                    }
                                />
                                <span className="text-sm">Recordatorio recurrente</span>
                            </div>

                            {newReminder.isRecurring && (
                                <div className="space-y-3 pl-5 border-l-2">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Frecuencia
                                        </label>
                                        <Select
                                            value={newReminder.recurrencePattern}
                                            onValueChange={(v: any) =>
                                                setNewReminder({ ...newReminder, recurrencePattern: v })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Diario</SelectItem>
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Fecha final (opcional)
                                        </label>
                                        <Input
                                            type="date"
                                            value={newReminder.recurrenceEndDate}
                                            onChange={(e) =>
                                                setNewReminder({ ...newReminder, recurrenceEndDate: e.target.value })
                                            }
                                            min={newReminder.scheduledDate}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full"
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !newReminder.message.trim()}
                            >
                                <Bell className="h-4 w-4 mr-2" />
                                {createMutation.isPending ? "Programando..." : "Programar Recordatorio"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="upcoming">
                        Próximos ({upcomingReminders.length})
                    </TabsTrigger>
                    <TabsTrigger value="sent">
                        Enviados ({sentReminders.length})
                    </TabsTrigger>
                    <TabsTrigger value="failed">
                        Fallidos ({failedReminders.length})
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[300px] mt-4">
                    <TabsContent value="upcoming" className="mt-0">
                        <div className="space-y-2">
                            {upcomingReminders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No hay recordatorios programados
                                </div>
                            ) : (
                                upcomingReminders.map((reminder: any) => (
                                    <ReminderItem key={reminder.id} reminder={reminder} />
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="sent" className="mt-0">
                        <div className="space-y-2">
                            {sentReminders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No hay recordatorios enviados
                                </div>
                            ) : (
                                sentReminders.map((reminder: any) => (
                                    <ReminderItem key={reminder.id} reminder={reminder} />
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="failed" className="mt-0">
                        <div className="space-y-2">
                            {failedReminders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No hay recordatorios fallidos
                                </div>
                            ) : (
                                failedReminders.map((reminder: any) => (
                                    <ReminderItem key={reminder.id} reminder={reminder} />
                                ))
                            )}
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
