import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Save, Trash2, Users } from "lucide-react";

export default function HelpdeskQueues() {
  const utils = trpc.useUtils();
  const { data: queues } = trpc.helpdesk.listQueues.useQuery();
  const { data: users } = trpc.team.listUsers.useQuery();

  const createQueue = trpc.helpdesk.createQueue.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQueues.invalidate();
      toast.success("Cola creada");
      setOpenEdit(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateQueue = trpc.helpdesk.updateQueue.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQueues.invalidate();
      toast.success("Cola actualizada");
      setOpenEdit(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteQueue = trpc.helpdesk.deleteQueue.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQueues.invalidate();
      toast.success("Cola eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  const setMembers = trpc.helpdesk.setQueueMembers.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQueueMembers.invalidate();
      toast.success("Miembros actualizados");
      setOpenMembers(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const activeUsers = useMemo(() => (users ?? []).filter((u: any) => u.isActive), [users]);

  // Edit dialog state
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [greetingMessage, setGreetingMessage] = useState("");

  function startCreate() {
    setEditId(null);
    setName("");
    setColor("#4f46e5");
    setGreetingMessage("");
    setOpenEdit(true);
  }

  function startEdit(q: any) {
    setEditId(q.id);
    setName(q.name ?? "");
    setColor(q.color ?? "#4f46e5");
    setGreetingMessage(q.greetingMessage ?? "");
    setOpenEdit(true);
  }

  async function saveQueue() {
    if (!name.trim()) return;
    if (editId) {
      await updateQueue.mutateAsync({ id: editId, name, color, greetingMessage: greetingMessage || undefined });
    } else {
      await createQueue.mutateAsync({ name, color, greetingMessage: greetingMessage || undefined });
    }
  }

  // Members dialog state
  const [openMembers, setOpenMembers] = useState(false);
  const [membersQueueId, setMembersQueueId] = useState<number | null>(null);
  const { data: currentMembers } = trpc.helpdesk.listQueueMembers.useQuery(
    { queueId: membersQueueId ?? 0 },
    { enabled: openMembers && !!membersQueueId }
  );

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (!openMembers) return;
    const ids = (currentMembers ?? []).map((u: any) => u.id);
    setSelectedUserIds(ids);
  }, [openMembers, currentMembers]);

  function openMembersDialog(queueId: number) {
    setMembersQueueId(queueId);
    setOpenMembers(true);
  }

  async function saveMembers() {
    if (!membersQueueId) return;
    await setMembers.mutateAsync({ queueId: membersQueueId, userIds: selectedUserIds });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Colas de helpdesk</h2>
          <p className="text-sm text-muted-foreground">Crear, editar y asignar agentes por cola.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nueva cola
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(queues ?? []).map((q: any) => (
          <Card key={q.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: q.color ?? "#64748b" }} />
                  <span>{q.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openMembersDialog(q.id)}>
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(q)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar esta cola?")) deleteQueue.mutate({ id: q.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.greetingMessage ? (
                <div className="text-xs text-muted-foreground line-clamp-3">{q.greetingMessage}</div>
              ) : (
                <div className="text-xs text-muted-foreground italic">Sin mensaje de bienvenida</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar cola" : "Nueva cola"}</DialogTitle>
            <DialogDescription>Configura el nombre, color y mensaje de bienvenida.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ventas / Postventa / Urgencias" />
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Mensaje de bienvenida</Label>
              <Textarea
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                rows={4}
                placeholder="Hola! Soy parte de soporte. En qué puedo ayudarte?"
              />
              <div className="text-xs text-muted-foreground">Se puede usar como respuesta inicial para tickets entrantes.</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Cancelar
            </Button>
            <Button onClick={saveQueue} disabled={!name.trim() || createQueue.isPending || updateQueue.isPending}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={openMembers} onOpenChange={setOpenMembers}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar usuarios</DialogTitle>
            <DialogDescription>Selecciona qué usuarios pueden atender esta cola.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Usuarios activos</div>
            <Separator />
            <div className="max-h-72 overflow-auto space-y-2 pr-2">
              {activeUsers.map((u: any) => {
                const checked = selectedUserIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/40 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = Boolean(v);
                        setSelectedUserIds((prev) => {
                          if (next) return prev.includes(u.id) ? prev : [...prev, u.id];
                          return prev.filter((id) => id !== u.id);
                        });
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMembers(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMembers} disabled={setMembers.isPending || !membersQueueId}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
