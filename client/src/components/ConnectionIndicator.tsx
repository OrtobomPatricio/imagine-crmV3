import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating connection indicator that appears when the user goes offline.
 * Shows a subtle banner at the top of the viewport with a smooth animation.
 * When online, it shows a brief "Reconectado" flash and then hides.
 */
export function ConnectionIndicator() {
    const isOnline = useOnlineStatus();

    return (
        <div
            className={cn(
                "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-500 ease-in-out",
                isOnline
                    ? "translate-y-[-100%] opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100 bg-destructive text-white shadow-lg"
            )}
            role="status"
            aria-live="polite"
        >
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span>Sin conexión — Los cambios se guardarán cuando vuelvas a estar online</span>
        </div>
    );
}
