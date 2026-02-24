import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Check } from "lucide-react";

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface TagSelectorProps {
    selectedTags: Tag[];
    onChange: (tags: Tag[]) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function TagSelector({
    selectedTags,
    onChange,
    disabled = false,
    placeholder = "Agregar etiqueta...",
}: TagSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const { data: allTags = [] } = trpc.tags.list.useQuery();
    const createMutation = trpc.tags.create.useMutation();

    const availableTags = allTags.filter(
        (tag) => !selectedTags.some((t) => t.id === tag.id)
    );

    const addTag = (tag: Tag) => {
        onChange([...selectedTags, tag]);
        setOpen(false);
        setSearch("");
    };

    const removeTag = (tagId: number) => {
        onChange(selectedTags.filter((t) => t.id !== tagId));
    };

    const createNewTag = async () => {
        if (!search.trim()) return;

        const colors = [
            "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
            "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
            "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        try {
            const result = await createMutation.mutateAsync({
                name: search.trim(),
                color: randomColor,
            });

            addTag({
                id: result.id,
                name: search.trim(),
                color: randomColor,
            });
        } catch (error) {
            console.error("Failed to create tag:", error);
        }
    };

    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            {selectedTags.map((tag) => (
                <Badge
                    key={tag.id}
                    style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                        borderColor: tag.color + "40",
                    }}
                    variant="outline"
                    className="gap-1 px-2 py-0.5"
                >
                    {tag.name}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => removeTag(tag.id)}
                            className="ml-1 hover:opacity-70"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </Badge>
            ))}

            {!disabled && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            {placeholder}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[200px]" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Buscar etiqueta..."
                                value={search}
                                onValueChange={setSearch}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {search.trim() ? (
                                        <button
                                            onClick={createNewTag}
                                            className="flex items-center gap-2 px-2 py-1.5 text-sm w-full hover:bg-accent"
                                            disabled={createMutation.isPending}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Crear "{search}"
                                        </button>
                                    ) : (
                                        "No hay etiquetas"
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {availableTags.map((tag) => (
                                        <CommandItem
                                            key={tag.id}
                                            onSelect={() => addTag(tag as Tag)}
                                            className="flex items-center gap-2"
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="flex-1">{tag.name}</span>
                                            <Check className="h-4 w-4 opacity-0" />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

// Compact version for lists
export function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
    return (
        <Badge
            style={{
                backgroundColor: tag.color + "15",
                color: tag.color,
                borderColor: tag.color + "30",
            }}
            variant="outline"
            className="text-xs px-1.5 py-0 h-5"
        >
            {tag.name}
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-1 hover:opacity-70"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </Badge>
    );
}
