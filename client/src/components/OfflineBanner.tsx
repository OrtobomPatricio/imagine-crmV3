import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

/**
 * OfflineBanner
 * Displays connectivity status to the user.
 */

export function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 3000); // Simulate sync visual
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline && !isSyncing) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4">
            <Alert className={`${!isOnline ? 'bg-amber-600 border-amber-500' : 'bg-green-600 border-green-500'} text-white shadow-2xl`}>
                <div className="flex items-center gap-3">
                    {!isOnline ? (
                        <WifiOff className="w-4 h-4" />
                    ) : (
                        <Wifi className="w-4 h-4" />
                    )}
                    <AlertDescription className="font-medium">
                        {!isOnline ? (
                            "Trabajando sin conexión. Los cambios se sincronizarán al volver."
                        ) : (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Conectado. Sincronizando datos...
                            </span>
                        )}
                    </AlertDescription>
                </div>
            </Alert>
        </div>
    );
}
