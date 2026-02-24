import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

/**
 * Cookie Consent Banner
 * GDPR-compliant cookie consent with preferences.
 * Stores consent in localStorage.
 */

type CookiePreferences = {
    essential: boolean;    // Always true
    analytics: boolean;
    marketing: boolean;
};

const STORAGE_KEY = "cookie_consent";

function getStoredConsent(): CookiePreferences | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function storeConsent(prefs: CookiePreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [prefs, setPrefs] = useState<CookiePreferences>({
        essential: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const existing = getStoredConsent();
        if (!existing) {
            setVisible(true);
        }
    }, []);

    const acceptAll = () => {
        const all: CookiePreferences = { essential: true, analytics: true, marketing: true };
        storeConsent(all);
        setVisible(false);
    };

    const acceptSelected = () => {
        storeConsent(prefs);
        setVisible(false);
    };

    const rejectAll = () => {
        const minimal: CookiePreferences = { essential: true, analytics: false, marketing: false };
        storeConsent(minimal);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 shadow-2xl">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-start gap-4">
                    <Cookie className="w-6 h-6 text-amber-400 mt-1 shrink-0" />
                    <div className="flex-1">
                        <p className="text-white text-sm mb-2">
                            Usamos cookies para mejorar tu experiencia. Las cookies esenciales son necesarias
                            para el funcionamiento del sitio. Puedes personalizar tus preferencias.
                        </p>

                        {showDetails && (
                            <div className="space-y-2 mb-3 p-3 bg-slate-800 rounded-lg">
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input type="checkbox" checked disabled className="accent-blue-500" />
                                    <span><strong>Esenciales</strong> — Necesarias para el funcionamiento (siempre activas)</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={prefs.analytics}
                                        onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                                        className="accent-blue-500"
                                    />
                                    <span><strong>Analíticas</strong> — Nos ayudan a entender cómo usas el sitio</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={prefs.marketing}
                                        onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                                        className="accent-blue-500"
                                    />
                                    <span><strong>Marketing</strong> — Cookies de terceros para publicidad</span>
                                </label>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={acceptAll}>
                                Aceptar Todas
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-600 text-white hover:bg-slate-800" onClick={rejectAll}>
                                Solo Esenciales
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-400 hover:text-white"
                                onClick={() => showDetails ? acceptSelected() : setShowDetails(true)}
                            >
                                {showDetails ? "Guardar Preferencias" : "Personalizar"}
                            </Button>
                        </div>
                    </div>
                    <button onClick={rejectAll} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
