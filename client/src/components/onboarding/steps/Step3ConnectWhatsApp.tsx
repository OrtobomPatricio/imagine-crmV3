import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
    QrCode,
    Cloud,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Step 3: Connect WhatsApp
 */

export default function Step3ConnectWhatsApp() {
    const { nextStep, skipStep } = useOnboarding();
    const { toast } = useToast();
    const [connected, setConnected] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // Mock connection testing for onboarding flow demo
    const testConnection = () => {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            setConnected(true);
            toast({ title: "¡Conectado!", description: "WhatsApp se ha vinculado correctamente." });
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Conecta WhatsApp</h2>
                <p className="text-slate-500 text-sm">Vital para recibir mensajes y leads automáticamente.</p>
            </div>

            <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 mb-8 bg-slate-100 dark:bg-slate-800 p-1">
                    <TabsTrigger value="qr" className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Escaneo QR
                    </TabsTrigger>
                    <TabsTrigger value="cloud" className="flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        Cloud API (Oficial)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 bg-white dark:bg-slate-900">
                        {connected ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full inline-block">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Sesión Activa</h3>
                                    <p className="text-slate-500 text-sm">Tu número está listo para operar.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800 border flex items-center justify-center relative overflow-hidden group">
                                    <QrCode className="w-32 h-32 text-slate-300" />
                                    {isTesting && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                        <Button variant="secondary" size="sm" onClick={testConnection}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Generar QR
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Badge variant="outline" className="text-amber-600 border-amber-200">Esperando conexión</Badge>
                                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                        Escanea este código desde la sección "Dispositivos vinculados" en tu app de WhatsApp.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={testConnection}>
                                    Simular Conexión (Demo)
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="cloud" className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                        <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Requiere Cuenta de Meta Business
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                            La Cloud API es la opción recomendada para empresas con alto tráfico. Ofrece mayor estabilidad pero requiere configuración técnica.
                        </p>
                        <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20" asChild>
                            <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer">
                                Guía de Configuración
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-3 pt-6">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    disabled={!connected}
                    onClick={() => nextStep()}
                >
                    {connected ? "Continuar" : "Vincular para continuar"}
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-slate-500"
                    onClick={() => skipStep('whatsapp')}
                >
                    Configurar más tarde (No recomendado)
                </Button>
            </div>
        </div>
    );
}
