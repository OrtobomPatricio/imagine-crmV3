import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Send, Trash2, Edit2, X, Check } from "lucide-react";

interface LeadNotesProps {
    leadId: number;
}

export function LeadNotes({ leadId }: LeadNotesProps) {
    const [newNote, setNewNote] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");

    const { data: notes = [], refetch } = trpc.notesTasks.listNotes.useQuery({ leadId });
    const createMutation = trpc.notesTasks.createNote.useMutation();
    const updateMutation = trpc.notesTasks.updateNote.useMutation();
    const deleteMutation = trpc.notesTasks.deleteNote.useMutation();

    const handleSubmit = async () => {
        if (!newNote.trim()) return;
        
        await createMutation.mutateAsync({ leadId, content: newNote.trim() });
        setNewNote("");
        refetch();
    };

    const startEdit = (note: any) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent("");
    };

    const saveEdit = async () => {
        if (!editContent.trim() || !editingId) return;
        
        await updateMutation.mutateAsync({ id: editingId, content: editContent.trim() });
        setEditingId(null);
        setEditContent("");
        refetch();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta nota?")) return;
        await deleteMutation.mutateAsync({ id });
        refetch();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Notas ({notes.length})</span>
            </div>

            {/* New Note Input */}
            <div className="space-y-2">
                <Textarea
                    placeholder="Agregar una nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px] resize-none"
                />
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!newNote.trim() || createMutation.isPending}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Guardar
                    </Button>
                </div>
            </div>

            {/* Notes List */}
            <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                    {notes.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No hay notas aún
                        </div>
                    ) : (
                        notes.map((note: any) => (
                            <div
                                key={note.id}
                                className="bg-muted/50 rounded-lg p-3 space-y-2"
                            >
                                <div className="flex items-start gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">
                                            {note.createdBy?.name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium truncate">
                                                {note.createdBy?.name || "Usuario"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(note.createdAt), {
                                                    addSuffix: true,
                                                    locale: es,
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {editingId === note.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="min-h-[60px] resize-none"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" onClick={saveEdit}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                        <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={() => startEdit(note)}
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-destructive"
                                                onClick={() => handleDelete(note.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
