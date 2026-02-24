import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "crm-theme-preference";

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
            if (stored && ["light", "dark", "system"].includes(stored)) {
                return stored;
            }
        }
        return "system";
    });

    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

    // Apply theme to document
    const applyTheme = useCallback((newTheme: Theme) => {
        const root = document.documentElement;
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const resolved = newTheme === "system" ? systemTheme : newTheme;

        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        setResolvedTheme(resolved);

        // Store preference
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }, []);

    // Set theme
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);
    }, [applyTheme]);

    // Toggle between light and dark
    const toggleTheme = useCallback(() => {
        const newTheme = resolvedTheme === "light" ? "dark" : "light";
        setTheme(newTheme);
    }, [resolvedTheme, setTheme]);

    // Initialize theme on mount
    useEffect(() => {
        applyTheme(theme);
    }, []); // Run once on mount

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            const newResolvedTheme = e.matches ? "dark" : "light";
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(newResolvedTheme);
            setResolvedTheme(newResolvedTheme);
        };

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [theme]);

    return {
        theme,
        setTheme,
        resolvedTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
    };
}
