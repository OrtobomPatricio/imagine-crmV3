/**
 * Accessibility Utilities
 *
 * Provides motion preference detection, focus management,
 * and ARIA helpers for WCAG 2.1 AA compliance.
 */

/**
 * CSS for respecting `prefers-reduced-motion`.
 * Apply these styles globally in index.css or as a utility.
 *
 * This file exports a CSS string and a hook for React components.
 */

import { useEffect, useState } from "react";

/**
 * Hook: Detect if user prefers reduced motion.
 * Returns true if the user has enabled "Reduce motion" in OS settings.
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 * const animationClass = prefersReducedMotion ? "" : "animate-fade-in";
 * ```
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return prefersReduced;
}

/**
 * Hook: Trap focus within an element (for modals/dialogs).
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
    useEffect(() => {
        if (!active || !ref.current) return;

        const el = ref.current;
        const focusable = el.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first?.focus();
                    e.preventDefault();
                }
            }
        };

        el.addEventListener("keydown", handler);
        first?.focus();
        return () => el.removeEventListener("keydown", handler);
    }, [ref, active]);
}

/**
 * Generate a unique ARIA ID for form elements.
 */
let ariaCounter = 0;
export function useAriaId(prefix = "aria"): string {
    const [id] = useState(() => `${prefix}-${++ariaCounter}`);
    return id;
}

/**
 * CSS to inject globally for prefers-reduced-motion support.
 * Add this to your index.css or global styles.
 */
export const REDUCED_MOTION_CSS = `
/* Respect prefers-reduced-motion globally */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Focus indicators for keyboard navigation (WCAG 2.1 AA) */
:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Skip link (visually hidden until focus) */
.sr-only:focus {
  position: fixed !important;
  clip: auto !important;
  clip-path: none !important;
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
}
`;
