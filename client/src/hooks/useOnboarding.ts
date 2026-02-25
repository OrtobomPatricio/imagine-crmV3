import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

/**
 * useOnboarding Hook
 * Manages the multi-step state and syncs with the TRPC backend.
 */

export type OnboardingStep =
    | 'company'
    | 'team'
    | 'whatsapp'
    | 'import'
    | 'first-message'
    | 'completed';

const STEPS: OnboardingStep[] = ['company', 'team', 'whatsapp', 'import', 'first-message'];

export function useOnboarding() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
    const saveStepMutation = trpc.onboarding.saveStep.useMutation();
    const completeMutation = trpc.onboarding.complete.useMutation();

    useEffect(() => {
        if (progress) {
            if (progress.completedAt) {
                setCurrentStep('completed');
            } else {
                setCurrentStep(progress.lastStep as OnboardingStep);
            }
        }
    }, [progress]);

    const nextStep = async (data?: any) => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex < STEPS.length - 1) {
            const next = STEPS[currentIndex + 1];

            // Save current step as completed
            await saveStepMutation.mutateAsync({
                step: currentStep as any,
                data,
                completed: true
            });

            setCurrentStep(next);
            utils.onboarding.getProgress.invalidate();
        } else {
            // Finalize
            await completeMutation.mutateAsync();
            setCurrentStep('completed');
            toast({ title: "¡Bienvenido!", description: "Onboarding completado con éxito." });
        }
    };

    const prevStep = () => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1]);
        }
    };

    const skipStep = async (step: OnboardingStep) => {
        const currentIndex = STEPS.indexOf(step);
        if (currentIndex < STEPS.length - 1) {
            await saveStepMutation.mutateAsync({
                step: step as any,
                data: null,
                completed: true
            });
            setCurrentStep(STEPS[currentIndex + 1]);
            utils.onboarding.getProgress.invalidate();
        }
    };

    return {
        currentStep,
        progress: (STEPS.indexOf(currentStep) / STEPS.length) * 100,
        isLoading,
        nextStep,
        prevStep,
        skipStep,
        isFirst: currentStep === 'company',
        isLast: currentStep === 'first-message'
    };
}
