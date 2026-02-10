import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Save, Plus, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function QuickAnswers() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const { data } = trpc.helpdesk.listQuickAnswers.useQuery({ search });

  const list = useMemo(() => data ?? [], [data]);

  const upsert = trpc.helpdesk.upsertQuickAnswer.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQuickAnswers.invalidate();
    }
  });

  const del = trpc.helpdesk.deleteQuickAnswer.useMutation({
    onSuccess: async () => {
      await utils.helpdesk.listQuickAnswers.invalidate();
    }
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");

  function startNew() {
    setEditingId(null);
    setShortcut("");
    setMessage("");
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setShortcut(item.shortcut ?? "");
    setMessage(item.message ?? "");
  }

  async function save() {
    await upsert.mutateAsync({ id: editingId ?? undefined, shortcut, message });
    startNew();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Respuestas rápidas</h2>
          <Button onClick={startNew} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por atajo o contenido..."
              className="pl-9"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          {list.map((item: any) => (
            <button
              key={item.id}
              onClick={() => startEdit(item)}
              className="w-full text-left p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition"
            >
              <div className="text-sm font-semibold">{item.shortcut}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.message}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold">{editingId ? "Editar" : "Crear"} respuesta</h3>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Atajo</div>
            <Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="/precio /horarios /promo" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Mensaje</div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Escribe la respuesta..." />
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={upsert.isPending || !shortcut.trim() || !message.trim()} className="flex-1">
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
            {editingId && (
              <Button
                variant="destructive"
                onClick={() => del.mutate({ id: editingId })}
                disabled={del.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
