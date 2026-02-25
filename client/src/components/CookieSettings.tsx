import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Cookie, ShieldAlert, BarChart3, Target, Lock } from "lucide-react";

/**
 * CookieSettings — Advanced GDPR-compliant cookie preference panel
 */

interface CookieSettingsProps {
    open: boolean;
    onClose: () => void;
}

export default function CookieSettings({ open, onClose }: CookieSettingsProps) {
    const [preferences, setPreferences] = useState({
        essential: true, // Always true
        functional: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const saved = localStorage.getItem("cookie-preferences");
        if (saved) {
            setPreferences(JSON.parse(saved));
        }
    }, [open]);

    const handleSave = () => {
        localStorage.setItem("cookie-preferences", JSON.stringify(preferences));
        localStorage.setItem("cookie-consent", "true"); // Marcar consentimiento general
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Cookie className="w-5 h-5 text-blue-600" />
                        <DialogTitle>Preferencias de Cookies</DialogTitle>
                    </div>
                    <DialogDescription>
                        Administre cómo utilizamos las cookies para mejorar su experiencia y seguridad.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Essentials */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Lock className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="grid gap-1">
                                <div className="flex items-center gap-2">
                                    <Label className="font-semibold">Necesarias (Esenciales)</Label>
                                    <Badge variant="outline" className="text-[10px] uppercase">Siempre Activas</Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Requeridas para el inicio de sesión, seguridad y funciones básicas como la navegación. No se pueden desactivar.
                                </p>
                            </div>
                        </div>
                        <Switch disabled checked={true} />
                    </div>

                    {/* Functional */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <ShieldAlert className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="grid gap-1">
                                <Label className="font-semibold">Funcionales</Label>
                                <p className="text-xs text-slate-500">
                                    Permiten recordar sus preferencias (como idioma o zona horaria) y personalizar su interfaz de usuario.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.functional}
                            onCheckedChange={(v) => setPreferences(p => ({ ...p, functional: v }))}
                        />
                    </div>

                    {/* Analytics */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <BarChart3 className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="grid gap-1">
                                <Label className="font-semibold">Analíticas</Label>
                                <p className="text-xs text-slate-500">
                                    Nos ayudan a entender cómo se usa el CRM para optimizar la velocidad y corregir errores técnicos.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.analytics}
                            onCheckedChange={(v) => setPreferences(p => ({ ...p, analytics: v }))}
                        />
                    </div>

                    {/* Marketing */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <Target className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="grid gap-1">
                                <Label className="font-semibold">Marketing (Publicidad)</Label>
                                <p className="text-xs text-slate-500">
                                    Utilizadas para mostrar anuncios relevantes fuera del CRM y medir la eficacia de nuestras campañas.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.marketing}
                            onCheckedChange={(v) => setPreferences(p => ({ ...p, marketing: v }))}
                        />
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <p className="text-[10px] text-slate-400 mr-auto mb-2 sm:mb-0 italic">
                        Última actualización: 24/02/2026
                    </p>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Preferencias</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
