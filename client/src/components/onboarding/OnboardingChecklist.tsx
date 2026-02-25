import { useOnboarding } from "@/hooks/useOnboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

/**
 * OnboardingChecklist
 * Persistent widget shown on dashboard until onboarding is 100% complete.
 */

export function OnboardingChecklist() {
    const { data: progress } = trpc.onboarding.getProgress.useQuery();

    if (!progress || progress.completedAt) return null;

    const steps = [
        { id: 'company', label: 'Configurar Empresa', done: progress.companyCompleted },
        { id: 'whatsapp', label: 'Conectar WhatsApp', done: progress.whatsappCompleted },
        { id: 'team', label: 'Invitar Equipo', done: progress.teamCompleted },
        { id: 'import', label: 'Importar Leads', done: progress.importCompleted },
        { id: 'first-message', label: 'Enviar Primer Mensaje', done: progress.firstMessageCompleted },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const percentage = Math.round((completedCount / steps.length) * 100);

    return (
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Sparkles className="w-24 h-24" />
            </div>

            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Completa tu Configuración
                    </CardTitle>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                        {percentage}%
                    </span>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-2 text-sm">
                            {step.done ? (
                                <CheckCircle2 className="w-4 h-4 text-green-300 shrink-0" />
                            ) : (
                                <Circle className="w-4 h-4 text-white/30 shrink-0" />
                            )}
                            <span className={step.done ? "text-white/60 line-through" : "text-white font-medium"}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>

                <Button
                    asChild
                    className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold border-none"
                >
                    <Link href="/onboarding">
                        Continuar Onboarding
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
