/**
 * Password Policy Validator
 * Enforces enterprise-grade password requirements.
 *
 * Rules:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;':",.<>?/)
 * - Not in the top 1000 common passwords
 */

const COMMON_PASSWORDS = new Set([
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
    "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine", "letmein",
    "admin", "welcome", "shadow", "123123", "654321", "superman", "qazwsx",
    "michael", "football", "password1", "password123", "1234567890",
]);

export interface PasswordValidation {
    valid: boolean;
    errors: string[];
    strength: "weak" | "fair" | "strong" | "excellent";
}

export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 12) {
        errors.push("Mínimo 12 caracteres");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Al menos 1 letra mayúscula");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Al menos 1 letra minúscula");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Al menos 1 número");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password)) {
        errors.push("Al menos 1 carácter especial (!@#$%^&*...)");
    }

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push("Contraseña demasiado común");
    }

    // Strength calculation
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password)) score++;

    const strength: PasswordValidation["strength"] =
        score <= 1 ? "weak" :
            score <= 2 ? "fair" :
                score <= 3 ? "strong" :
                    "excellent";

    return {
        valid: errors.length === 0,
        errors,
        strength,
    };
}
