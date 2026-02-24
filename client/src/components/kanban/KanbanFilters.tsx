import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Tag, User, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export interface KanbanFilters {
    search: string;
    tagIds: number[];
    assignedToId: number | null;
    country: string | null;
    source: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    hasTasks: boolean | null;
    showArchived: boolean;
}

interface KanbanFiltersProps {
    filters: KanbanFilters;
    onChange: (filters: KanbanFilters) => void;
    pipelineId: number | null;
}

export function KanbanFiltersBar({ filters, onChange, pipelineId }: KanbanFiltersProps) {
    const { data: tags = [] } = trpc.tags.list.useQuery();
    const { data: users = [] } = trpc.team.listUsers.useQuery();
    
    const [localSearch, setLocalSearch] = useState(filters.search);
    
    const activeFiltersCount = [
        filters.tagIds.length > 0,
        filters.assignedToId !== null,
        filters.country !== null,
        filters.source !== null,
        filters.dateFrom !== null,
        filters.dateTo !== null,
        filters.hasTasks !== null,
        filters.showArchived,
    ].filter(Boolean).length;

    const handleSearch = () => {
        onChange({ ...filters, search: localSearch });
    };

    const clearFilters = () => {
        setLocalSearch("");
        onChange({
            search: "",
            tagIds: [],
            assignedToId: null,
            country: null,
            source: null,
            dateFrom: null,
            dateTo: null,
            hasTasks: null,
            showArchived: false,
        });
    };

    const removeTag = (tagId: number) => {
        onChange({
            ...filters,
            tagIds: filters.tagIds.filter(id => id !== tagId),
        });
    };

    return (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar leads..."
                    className="pl-9"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
            </div>

            {/* Filter Popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="space-y-4">
                        <div className="font-medium">Filtros avanzados</div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium flex items-center gap-1">
                                <Tag className="h-3 w-3" /> Etiquetas
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {tags.map((tag: any) => (
                                    <Badge
                                        key={tag.id}
                                        variant={filters.tagIds.includes(tag.id) ? "default" : "outline"}
                                        className="cursor-pointer text-xs"
                                        style={filters.tagIds.includes(tag.id) ? {} : {
                                            borderColor: tag.color + "40",
                                            color: tag.color,
                                        }}
                                        onClick={() => {
                                            const newTagIds = filters.tagIds.includes(tag.id)
                                                ? filters.tagIds.filter(id => id !== tag.id)
                                                : [...filters.tagIds, tag.id];
                                            onChange({ ...filters, tagIds: newTagIds });
                                        }}
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Assigned To */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium flex items-center gap-1">
                                <User className="h-3 w-3" /> Asignado a
                            </label>
                            <Select
                                value={filters.assignedToId?.toString() || "any"}
                                onValueChange={(v) => onChange({ ...filters, assignedToId: v === "any" ? null : parseInt(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Cualquier usuario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Cualquier usuario</SelectItem>
                                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                                    {users.filter((u: any) => u.isActive).map((user: any) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Fecha de creación
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    placeholder="Desde"
                                    value={filters.dateFrom || ""}
                                    onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
                                />
                                <Input
                                    type="date"
                                    placeholder="Hasta"
                                    value={filters.dateTo || ""}
                                    onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
                                />
                            </div>
                        </div>

                        {/* Clear */}
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={clearFilters}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Active Filter Tags */}
            {filters.tagIds.length > 0 && (
                <div className="flex items-center gap-1">
                    {tags
                        .filter((t: any) => filters.tagIds.includes(t.id))
                        .map((tag: any) => (
                            <Badge
                                key={tag.id}
                                style={{
                                    backgroundColor: tag.color + "20",
                                    color: tag.color,
                                    borderColor: tag.color + "40",
                                }}
                                variant="outline"
                                className="gap-1"
                            >
                                {tag.name}
                                <button onClick={() => removeTag(tag.id)}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                </div>
            )}

            {filters.assignedToId && (
                <Badge variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />
                    {users.find((u: any) => u.id === filters.assignedToId)?.name || "Usuario"}
                    <button onClick={() => onChange({ ...filters, assignedToId: null })}>
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            )}
        </div>
    );
}
