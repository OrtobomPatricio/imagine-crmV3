import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * TermsAcceptance — Signup checkbox component
 *
 * Requires acceptance of both Terms of Service and Privacy Policy.
 * Exposes `isValid` and `termsVersion` for the parent form.
 *
 * Usage:
 * ```tsx
 * <TermsAcceptance
 *   termsVersion="1.0.0"
 *   onValidChange={(valid) => setCanSubmit(valid)}
 * />
 * ```
 */

interface TermsAcceptanceProps {
    termsVersion: string;
    onValidChange: (valid: boolean) => void;
    className?: string;
}

export default function TermsAcceptance({ termsVersion, onValidChange, className = "" }: TermsAcceptanceProps) {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    const handleTermsChange = (checked: boolean) => {
        setTermsAccepted(checked);
        onValidChange(checked && privacyAccepted);
    };

    const handlePrivacyChange = (checked: boolean) => {
        setPrivacyAccepted(checked);
        onValidChange(termsAccepted && checked);
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-start gap-3">
                <Checkbox
                    id="accept-terms"
                    checked={termsAccepted}
                    onCheckedChange={(c) => handleTermsChange(c === true)}
                    aria-required="true"
                />
                <Label htmlFor="accept-terms" className="text-sm text-slate-600 dark:text-slate-400 leading-snug cursor-pointer">
                    Acepto los{" "}
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Términos de Servicio
                    </a>{" "}
                    <span className="text-slate-400">(v{termsVersion})</span>
                </Label>
            </div>

            <div className="flex items-start gap-3">
                <Checkbox
                    id="accept-privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(c) => handlePrivacyChange(c === true)}
                    aria-required="true"
                />
                <Label htmlFor="accept-privacy" className="text-sm text-slate-600 dark:text-slate-400 leading-snug cursor-pointer">
                    Acepto la{" "}
                    <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Política de Privacidad
                    </a>
                </Label>
            </div>

            {(!termsAccepted || !privacyAccepted) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1" role="alert">
                    Debes aceptar ambos documentos para continuar.
                </p>
            )}
        </div>
    );
}
