import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingProvider } from "@/hooks/useOnboarding";

/**
 * OnboardingPage
 * Full-screen host for the wizard.
 */

export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <OnboardingProvider>
                    <OnboardingWizard />
                </OnboardingProvider>
            </div>
        </div>
    );
}
