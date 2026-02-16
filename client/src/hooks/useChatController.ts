import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export type ChatSortOption = "recent" | "oldest" | "unread";

export function useChatController() {
    const [, setLocation] = useLocation();
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

    // UI States
    const [showDetails, setShowDetails] = useState(true);

    // List controls
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedWhatsappNumberId, setSelectedWhatsappNumberId] = useState<number | undefined>(undefined);
    const [sort, setSort] = useState<ChatSortOption>("recent");
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [assignedToMe, setAssignedToMe] = useState(false);

    // Keyboard shortcut to toggle details
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "]" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setShowDetails(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const getOrCreateMutation = trpc.chat.getOrCreateByLeadId.useMutation({
        onSuccess: (data) => {
            setSelectedConversationId(data.id);
            window.history.replaceState({}, "", "/chat");
        },
        onError: (e) => {
            console.error("Failed to open chat for lead", e);
        }
    });

    const { data: selectedConversation } = trpc.chat.getById.useQuery(
        { id: selectedConversationId! },
        { enabled: !!selectedConversationId }
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const leadIdParam = params.get("leadId");
        if (leadIdParam) {
            const leadId = parseInt(leadIdParam);
            if (!isNaN(leadId)) {
                getOrCreateMutation.mutate({ leadId });
            }
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => clearTimeout(t);
    }, [search]);

    return {
        // State
        selectedConversationId,
        setSelectedConversationId,
        showDetails,
        setShowDetails,
        search,
        setSearch,
        debouncedSearch,
        selectedWhatsappNumberId,
        setSelectedWhatsappNumberId,
        sort,
        setSort,
        unreadOnly,
        setUnreadOnly,
        assignedToMe,
        setAssignedToMe,

        // Data
        selectedConversation,
    };
}
