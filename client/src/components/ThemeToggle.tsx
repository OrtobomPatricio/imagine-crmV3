import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const icons = {
        light: Sun,
        dark: Moon,
        system: Monitor,
    };

    const Icon = icons[resolvedTheme === "dark" ? "dark" : "light"];

    const labels = {
        light: "Claro",
        dark: "Oscuro",
        system: "Sistema",
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("relative", className)}
                    aria-label="Cambiar tema"
                >
                    <Icon className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Cambiar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className={cn(theme === "light" && "bg-accent")}
                >
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                    {theme === "light" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className={cn(theme === "dark" && "bg-accent")}
                >
                    <Moon className="mr-2 h-4 w-4" />
                    Oscuro
                    {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => setTheme("system")}
                    className={cn(theme === "system" && "bg-accent")}
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    Sistema
                    {theme === "system" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Simple toggle button (cycles light/dark)
export function ThemeToggleSimple({ className }: { className?: string }) {
    const { resolvedTheme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={className}
            aria-label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
            {resolvedTheme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
        </Button>
    );
}
