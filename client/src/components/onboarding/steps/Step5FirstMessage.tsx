import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
    Send,
    Sparkles,
    MessageSquare,
    CheckCircle2,
    Users,
    ChevronRight,
    Rocket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Step 5: First Message & Launch
 */

export default function Step5FirstMessage() {
    const { nextStep } = useOnboarding();
    const { toast } = useToast();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState("Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?");

    const handleSendTest = () => {
        setSending(true);
        setTimeout(() => {
            setSending(false);
            setSent(true);
            toast({ title: "¡Mensaje Enviado!", description: "Has enviado tu primer mensaje de prueba." });
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">¡Casi Listos! 🚀</h2>
                <p className="text-slate-500 text-sm">Hagamos una prueba enviando un mensaje de bienvenida a tus leads.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-white dark:bg-slate-800 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            JP
                        </div>
                        <div>
                            <p className="text-sm font-bold">Juan Pérez (Lead Demo)</p>
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">En Línea</Badge>
                        </div>
                    </div>
                    <Users className="w-5 h-5 text-slate-400" />
                </div>

                <div className="h-48 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-black/20">
                    <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none max-w-[80%] text-sm">
                        Hola, vi tus servicios en internet y me interesa una cotización.
                    </div>
                    {sent && (
                        <div className="ml-auto bg-blue-600 text-white p-3 rounded-2xl rounded-br-none max-w-[80%] text-sm animate-in slide-in-from-bottom-2">
                            {message}
                            <div className="text-[10px] text-blue-200 text-right mt-1">19:45 PM ✓✓</div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t space-y-3">
                    <div className="relative">
                        <Textarea
                            placeholder="Escribe tu mensaje..."
                            className="min-h-[80px] resize-none pr-10"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <Sparkles className="absolute right-3 top-3 w-4 h-4 text-amber-500 cursor-pointer hover:scale-110 transition-transform" />
                    </div>
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleSendTest}
                        disabled={sending || sent}
                    >
                        {sending ? "Enviando..." : sent ? "Mensaje Enviado" : "Enviar Mensaje de Prueba"}
                        {!sending && !sent && <Send className="w-4 h-4 ml-2" />}
                        {sent && <CheckCircle2 className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>

            <div className="pt-6">
                <Button
                    className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 h-14 text-lg font-bold shadow-lg group"
                    onClick={() => nextStep()}
                >
                    ¡Lanzar mi CRM!
                    <Rocket className="w-5 h-5 ml-2 group-hover:animate-bounce" />
                </Button>
            </div>
        </div>
    );
}
