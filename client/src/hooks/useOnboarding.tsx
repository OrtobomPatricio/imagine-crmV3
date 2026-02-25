import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

/**
 * useOnboarding Hook
 * Manages the multi-step state locally via React Context.
 * Backend sync is best-effort only.
 */

export type OnboardingStep =
    | 'company'
    | 'team'
    | 'whatsapp'
    | 'import'
    | 'first-message'
    | 'completed';

const STEPS: OnboardingStep[] = ['company', 'team', 'whatsapp', 'import', 'first-message'];

interface OnboardingContextValue {
    currentStep: OnboardingStep;
    progress: number;
    isLoading: boolean;
    nextStep: (data?: any) => void;
    prevStep: () => void;
    skipStep: (step: OnboardingStep) => void;
    isFirst: boolean;
    isLast: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Provider: place this ONCE at the top of the onboarding page tree.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
    const { toast } = useToast();
    const _utils = trpc.useUtils(); // Keep hook for consistent hook ordering

    const [hasInitialized, setHasInitialized] = useState(false);

    const { data: progressData, isLoading } = trpc.onboarding.getProgress.useQuery(undefined, {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
    });
    const saveStepMutation = trpc.onboarding.saveStep.useMutation();
    const completeMutation = trpc.onboarding.complete.useMutation();

    // Initialize from server ONCE on first load only
    useEffect(() => {
        if (progressData && !hasInitialized) {
            setHasInitialized(true);
            if (progressData.completedAt) {
                setCurrentStep('completed');
            } else {
                const serverStep = progressData.lastStep as OnboardingStep;
                if (STEPS.includes(serverStep)) {
                    setCurrentStep(serverStep);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progressData]);

    const nextStep = (data?: any) => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex < STEPS.length - 1) {
            const next = STEPS[currentIndex + 1];

            // Advance UI immediately
            setCurrentStep(next);

            // Best-effort backend sync (fire and forget)
            saveStepMutation.mutate(
                { step: currentStep as any, data, completed: true },
                { onError: (err) => console.warn("[Onboarding] Backend sync failed:", err.message) }
            );
        } else {
            // Finalize — advance UI immediately
            setCurrentStep('completed');
            toast({ title: "¡Bienvenido!", description: "Onboarding completado con éxito." });

            // Best-effort backend sync
            completeMutation.mutate(undefined, {
                onError: (err) => console.warn("[Onboarding] Finalize sync failed:", err.message)
            });
        }
    };

    const prevStep = () => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1]);
        }
    };

    const skipStep = (step: OnboardingStep) => {
        const currentIndex = STEPS.indexOf(step);
        if (currentIndex < STEPS.length - 1) {
            setCurrentStep(STEPS[currentIndex + 1]);

            // Best-effort backend sync
            saveStepMutation.mutate(
                { step: step as any, data: null, completed: true },
                { onError: (err) => console.warn("[Onboarding] Skip sync failed:", err.message) }
            );
        }
    };

    const value: OnboardingContextValue = {
        currentStep,
        progress: (STEPS.indexOf(currentStep) / STEPS.length) * 100,
        isLoading: isLoading && !hasInitialized,
        nextStep,
        prevStep,
        skipStep,
        isFirst: currentStep === 'company',
        isLast: currentStep === 'first-message'
    };

    return (
        <OnboardingContext.Provider value= { value } >
        { children }
        </OnboardingContext.Provider>
    );
}

/**
 * Consumer hook — reads from the shared context.
 */
export function useOnboarding(): OnboardingContextValue {
    const ctx = useContext(OnboardingContext);
    if (!ctx) {
        throw new Error("useOnboarding must be used within <OnboardingProvider>");
    }
    return ctx;
}
