import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Mail, MapPin, Tag, Briefcase, Save, Loader2, DollarSign, StickyNote, CheckSquare, Bell } from "lucide-react";
import { toast } from "sonner";
import { LeadNotes } from "@/components/notes-tasks/LeadNotes";
import { LeadTasks } from "@/components/notes-tasks/LeadTasks";
import { LeadReminders } from "@/components/notes-tasks/LeadReminders";
import { TagSelector } from "@/components/tags/TagSelector";

interface ChatLeadDetailsProps {
    leadId: number;
    className?: string;
}

export function ChatLeadDetails({ leadId, className }: ChatLeadDetailsProps) {
    const utils = trpc.useContext();

    // Fetch Data
    const { data: lead, isLoading: isLoadingLead } = trpc.leads.getById.useQuery({ id: leadId });
    const { data: pipelines } = trpc.pipelines.list.useQuery();
    const { data: leadTags = [], refetch: refetchTags } = trpc.tags.getLeadTags.useQuery({ leadId });

    // Mutations
    const updateLead = trpc.leads.update.useMutation({
        onSuccess: () => {
            toast.success("Lead actualizado", { description: "Los cambios se han guardado correctamente." });
            utils.leads.getById.invalidate({ id: leadId });
            utils.chat.listConversations.invalidate();
        },
        onError: (err) => {
            toast.error("Error", { description: err.message });
        }
    });

    const setLeadTags = trpc.tags.setLeadTags.useMutation({
        onSuccess: () => {
            refetchTags();
            toast.success("Etiquetas actualizadas");
        },
        onError: (err) => {
            toast.error("Error", { description: err.message });
        }
    });

    // Local State for Form
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        country: "",
        source: "",
        notes: "",
        pipelineStageId: undefined as number | undefined,
        value: "0"
    });

    // Sync state with fetched data
    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name,
                phone: lead.phone,
                email: lead.email || "",
                country: lead.country || "",
                source: lead.source || "",
                notes: lead.notes || "",
                pipelineStageId: lead.pipelineStageId || undefined,
                value: lead.value || "0"
            });
        }
    }, [lead]);

    // Handle Save
    const handleSave = () => {
        if (!lead) return;

        updateLead.mutate({
            id: lead.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            country: formData.country,
            source: formData.source,
            notes: formData.notes,
            pipelineStageId: formData.pipelineStageId,
            value: Number(formData.value) || 0
        });
    };

    // Handle tags change
    const handleTagsChange = (tags: { id: number; name: string; color: string }[]) => {
        setLeadTags.mutate({
            leadId,
            tagIds: tags.map(t => t.id),
        });
    };

    // Helper to get all stages flattened
    const allStages = pipelines?.flatMap(p => p.stages) || [];
    const currentStage = allStages.find(s => s.id === formData.pipelineStageId);

    if (isLoadingLead) {
        return (
            <div className={`flex flex-col h-full bg-transparent w-full overflow-hidden ${className}`}>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className={`flex flex-col h-full bg-transparent w-full overflow-hidden ${className}`}>
                <div className="text-center text-muted-foreground p-4">Lead no encontrado</div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-transparent w-full overflow-hidden ${className}`}>
            <div className="px-3 py-2.5 border-b flex items-center justify-between bg-muted/20">
                <h3 className="font-medium text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Detalles
                </h3>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateLead.isPending}
                    className="h-7 px-2.5 text-xs gap-1"
                >
                    {updateLead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="w-full grid grid-cols-4 rounded-none border-b h-10">
                        <TabsTrigger value="info" className="text-xs px-2 gap-1.5">
                            <span>Info</span>
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="text-xs px-2 gap-1.5">
                            <StickyNote className="h-3.5 w-3.5" />
                            <span>Notas</span>
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="text-xs px-2 gap-1.5">
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>Tareas</span>
                        </TabsTrigger>
                        <TabsTrigger value="reminders" className="text-xs px-2 gap-1.5">
                            <Bell className="h-3.5 w-3.5" />
                            <span>Rec.</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="p-3 space-y-3 mt-0">
                        {/* TAGS */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
                                <Tag className="h-3 w-3" /> Etiquetas
                            </Label>
                            <TagSelector
                                selectedTags={leadTags.map(t => ({ id: t.tagId, name: t.name, color: t.color }))}
                                onChange={handleTagsChange}
                            />
                        </div>

                        {/* STATUS / STAGE */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Etapa</Label>
                            <Select
                                value={formData.pipelineStageId?.toString()}
                                onValueChange={(val) => setFormData({ ...formData, pipelineStageId: parseInt(val) })}
                            >
                                <SelectTrigger className="w-full h-8 text-xs bg-secondary/20 border-secondary/20">
                                    <SelectValue placeholder="Seleccionar etapa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pipelines?.map(pipeline => (
                                        <div key={pipeline.id}>
                                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50">
                                                {pipeline.name}
                                            </div>
                                            {pipeline.stages.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id.toString()} className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color || undefined }} />
                                                        {stage.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* BASIC INFO - 2 column grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5 col-span-2">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <User className="h-3 w-3" /> Nombre
                                </Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <Phone className="h-3 w-3" /> Teléfono
                                </Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <Mail className="h-3 w-3" /> Email
                                </Label>
                                <Input
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 col-span-2">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <MapPin className="h-3 w-3" /> País
                                </Label>
                                <Input
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    placeholder="País"
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* DEAL INFO - 2 column grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <DollarSign className="h-3 w-3" /> Valor
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <Briefcase className="h-3 w-3" /> Fuente
                                </Label>
                                <Input
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    placeholder="Origen"
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* GENERAL NOTES */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Notas Generales</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="min-h-[80px] resize-none text-xs"
                                placeholder="Notas importantes..."
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="notes" className="p-3 mt-0">
                        <LeadNotes leadId={leadId} />
                    </TabsContent>

                    <TabsContent value="tasks" className="p-3 mt-0">
                        <LeadTasks leadId={leadId} />
                    </TabsContent>

                    <TabsContent value="reminders" className="p-3 mt-0">
                        <LeadReminders leadId={leadId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
