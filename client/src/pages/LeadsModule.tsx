import { useState } from "react";
import { LayoutList, Kanban as KanbanIcon } from "lucide-react";
import Leads from "./Leads";
import Kanban from "./Kanban";

export default function LeadsModule() {
    const [view, setView] = useState<"list" | "board">("list");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setView("list")}
                        className={`p-2 rounded-md transition-all ${view === "list"
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="Vista de Lista"
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView("board")}
                        className={`p-2 rounded-md transition-all ${view === "board"
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="Vista de Tablero"
                    >
                        <KanbanIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="min-h-[calc(100vh-140px)]">
                {view === "list" ? <Leads /> : <Kanban />}
            </div>
        </div>
    );
}
