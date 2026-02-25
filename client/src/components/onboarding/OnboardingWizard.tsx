import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOnboarding } from "@/hooks/useOnboarding";
import Step1Company from "./steps/Step1Company";
import Step2Team from "./steps/Step2Team";
import Step3ConnectWhatsApp from "./steps/Step3ConnectWhatsApp";
import Step4ImportContacts from "./steps/Step4ImportContacts";
import Step5FirstMessage from "./steps/Step5FirstMessage";
import { Loader2 } from "lucide-react";

/**
 * OnboardingWizard
 * Main container for the setup flow.
 */

export function OnboardingWizard() {
    const { currentStep, progress, isLoading } = useOnboarding();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (currentStep === 'completed') {
        window.location.href = "/"; // Redirect to dashboard
        return null;
    }

    const renderStep = () => {
        switch (currentStep) {
            case 'company': return <Step1Company />;
            case 'team': return <Step2Team />;
            case 'whatsapp': return <Step3ConnectWhatsApp />;
            case 'import': return <Step4ImportContacts />;
            case 'first-message': return <Step5FirstMessage />;
            default: return null;
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-4">
            <Card className="shadow-xl border-none ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <CardTitle className="text-xl font-bold text-blue-600">Configuración Inicial</CardTitle>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Paso {Math.floor(progress / 20) + 1} de 5
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardHeader>
                <CardContent className="p-8">
                    {renderStep()}
                </CardContent>
            </Card>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    ¿Necesitas ayuda? Contacta a soporte@crmpro.com
                </p>
            </div>
        </div>
    );
}
