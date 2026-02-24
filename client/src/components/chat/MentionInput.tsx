import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import React from "react";

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

interface MentionUser {
    id: number;
    name: string;
    email?: string;
}

export function MentionInput({
    value,
    onChange,
    onSubmit,
    placeholder = "Escribe un mensaje... Use @ para mencionar",
    className,
    disabled = false,
}: MentionInputProps) {
    const { data: users = [] } = trpc.team.listUsers.useQuery();
    const [mentionQuery, setMentionQuery] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredUsers = users.filter((u: any) =>
        u.isActive && u.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        onChange(newValue);
        setCursorPosition(newCursorPos);

        // Check if we're typing a mention
        const textBeforeCursor = newValue.slice(0, newCursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setShowMentions(true);
            setSelectedIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = useCallback((user: MentionUser) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const beforeMention = value.slice(0, cursorPosition).replace(/@\w*$/, "");
        const afterMention = value.slice(cursorPosition);
        const mentionText = `@${user.name} `;

        const newValue = beforeMention + mentionText + afterMention;
        onChange(newValue);
        setShowMentions(false);

        // Focus and set cursor after mention
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = beforeMention.length + mentionText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            setCursorPosition(newCursorPos);
        }, 0);
    }, [value, cursorPosition, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentions) {
            if (e.key === "Enter" && !e.shiftKey && onSubmit) {
                e.preventDefault();
                onSubmit();
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < filteredUsers.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
            case "Tab":
                e.preventDefault();
                if (filteredUsers[selectedIndex]) {
                    insertMention(filteredUsers[selectedIndex] as any as MentionUser);
                }
                break;
            case "Escape":
                e.preventDefault();
                setShowMentions(false);
                break;
        }
    };

    // Handle click outside to close mentions
    useEffect(() => {
        const handleClickOutside = () => setShowMentions(false);
        if (showMentions) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [showMentions]);

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn("min-h-[80px] resize-none", className)}
                disabled={disabled}
            />

            {/* Mention suggestions popup */}
            {showMentions && filteredUsers.length > 0 && (
                <div
                    className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-md shadow-lg py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                        Mencionar usuario
                    </div>
                    {filteredUsers.map((user: any, index: number) => (
                        <button
                            key={user.id}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent",
                                index === selectedIndex && "bg-accent"
                            )}
                            onClick={() => insertMention(user)}
                        >
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                                <div className="font-medium">{user.name}</div>
                                {user.email && (
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Parse mentions in text and render them with highlights
export function renderMentions(text: string, users: { id: number; name: string }[]): React.ReactNode[] {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const mentionName = match[1];
        const mentionedUser = users.find(u =>
            u.name.toLowerCase() === mentionName.toLowerCase()
        );

        if (mentionedUser) {
            parts.push(
                <span
                    key={match.index}
                    className="text-primary font-medium bg-primary/10 px-1 rounded"
                >
                    @{mentionName}
                </span>
            );
        } else {
            parts.push(`@${mentionName}`);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}
