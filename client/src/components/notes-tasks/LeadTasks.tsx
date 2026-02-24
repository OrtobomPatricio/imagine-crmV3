import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
    CheckCircle2,
    Circle,
    Plus,
    Calendar,
    Trash2,
    Clock,
    Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTasksProps {
    leadId: number;
}

const priorityConfig = {
    low: { label: "Baja", color: "text-muted-foreground", icon: Flag },
    medium: { label: "Media", color: "text-yellow-500", icon: Flag },
    high: { label: "Alta", color: "text-red-500", icon: Flag },
};

export function LeadTasks({ leadId }: LeadTasksProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium" as const,
    });

    const { data: tasks = [], refetch } = trpc.notesTasks.listTasks.useQuery({ leadId });
    const createMutation = trpc.notesTasks.createTask.useMutation();
    const updateMutation = trpc.notesTasks.updateTask.useMutation();
    const deleteMutation = trpc.notesTasks.deleteTask.useMutation();

    const pendingTasks = tasks.filter((t: any) => t.status === "pending");
    const completedTasks = tasks.filter((t: any) => t.status === "completed");

    const handleCreate = async () => {
        if (!newTask.title.trim()) return;

        await createMutation.mutateAsync({
            leadId,
            title: newTask.title.trim(),
            description: newTask.description || undefined,
            dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
            priority: newTask.priority,
        });

        setNewTask({ title: "", description: "", dueDate: "", priority: "medium" });
        setIsOpen(false);
        refetch();
    };

    const toggleTask = async (task: any) => {
        const newStatus = task.status === "completed" ? "pending" : "completed";
        await updateMutation.mutateAsync({
            id: task.id,
            status: newStatus,
        });
        refetch();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta tarea?")) return;
        await deleteMutation.mutateAsync({ id });
        refetch();
    };

    const TaskItem = ({ task }: { task: any }) => {
        const isOverdue = task.dueDate && task.status === "pending" && isPast(new Date(task.dueDate));
        const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
        const PriorityIcon = priority.icon;

        return (
            <div
                className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    task.status === "completed" && "bg-muted/50 opacity-70"
                )}
            >
                <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => toggleTask(task)}
                    className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <span
                            className={cn(
                                "font-medium text-sm",
                                task.status === "completed" && "line-through text-muted-foreground"
                            )}
                        >
                            {task.title}
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDelete(task.id)}
                        >
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                    
                    {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={cn("flex items-center gap-1", priority.color)}>
                            <PriorityIcon className="h-3 w-3" />
                            {priority.label}
                        </span>
                        
                        {task.dueDate && (
                            <span
                                className={cn(
                                    "flex items-center gap-1",
                                    isOverdue ? "text-red-500" : "text-muted-foreground"
                                )}
                            >
                                <Calendar className="h-3 w-3" />
                                {isOverdue
                                    ? `Venció ${formatDistanceToNow(new Date(task.dueDate), {
                                          addSuffix: true,
                                          locale: es,
                                      })}`
                                    : format(new Date(task.dueDate), "dd MMM", { locale: es })}
                            </span>
                        )}
                        
                        {task.assignedTo && (
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.assignedTo.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Tareas ({pendingTasks.length})</span>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4 mr-1" />
                            Nueva
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Tarea</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Título</label>
                                <Input
                                    value={newTask.title}
                                    onChange={(e) =>
                                        setNewTask({ ...newTask, title: e.target.value })
                                    }
                                    placeholder="Título de la tarea"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Descripción</label>
                                <Textarea
                                    value={newTask.description}
                                    onChange={(e) =>
                                        setNewTask({ ...newTask, description: e.target.value })
                                    }
                                    placeholder="Descripción opcional"
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Fecha límite</label>
                                    <Input
                                        type="datetime-local"
                                        value={newTask.dueDate}
                                        onChange={(e) =>
                                            setNewTask({ ...newTask, dueDate: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Prioridad</label>
                                    <Select
                                        value={newTask.priority}
                                        onValueChange={(v: any) =>
                                            setNewTask({ ...newTask, priority: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Baja</SelectItem>
                                            <SelectItem value="medium">Media</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleCreate}
                                disabled={!newTask.title.trim() || createMutation.isPending}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Tarea
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                    {tasks.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No hay tareas
                        </div>
                    ) : (
                        <>
                            {pendingTasks.map((task: any) => (
                                <div key={task.id} className="group">
                                    <TaskItem task={task} />
                                </div>
                            ))}
                            {completedTasks.length > 0 && (
                                <>
                                    <div className="pt-2 border-t">
                                        <span className="text-xs text-muted-foreground">
                                            Completadas ({completedTasks.length})
                                        </span>
                                    </div>
                                    {completedTasks.map((task: any) => (
                                        <TaskItem key={task.id} task={task} />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
