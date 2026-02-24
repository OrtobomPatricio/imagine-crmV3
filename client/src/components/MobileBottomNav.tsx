import { Link, useLocation } from "wouter";
import {
    LayoutDashboard,
    Users,
    MessageCircle,
    Calendar,
    Menu,
    X,
    BarChart3,
    Activity,
    Send,
    Inbox,
    Workflow,
    Database,
    Settings,
    LayoutGrid,
    LogOut,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/_core/hooks/usePermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type MenuItem = {
    icon: any;
    label: string;
    path: string;
    roles?: string[];
    requiredPerm?: string;
};

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", requiredPerm: "dashboard.view" },
    { icon: Users, label: "Leads", path: "/leads", requiredPerm: "leads.view" },
    { icon: MessageCircle, label: "Chat", path: "/chat", requiredPerm: "chat.view" },
    { icon: Inbox, label: "Helpdesk", path: "/helpdesk", requiredPerm: "helpdesk.view" },
    { icon: Calendar, label: "Agendamiento", path: "/scheduling", requiredPerm: "scheduling.view" },
    { icon: Send, label: "Marketing", path: "/campaigns", requiredPerm: "campaigns.view" },
    { icon: Activity, label: "Monitoreo", path: "/monitoring", requiredPerm: "monitoring.view" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", requiredPerm: "analytics.view" },
    { icon: Workflow, label: "Integraciones", path: "/integrations", requiredPerm: "integrations.view" },
    { icon: LayoutGrid, label: "Pipelines", path: "/settings/pipelines", requiredPerm: "kanban.manage" },
    { icon: Database, label: "Backups", path: "/backup", requiredPerm: "backups.view", roles: ["owner", "admin"] },
    { icon: Settings, label: "Configuración", path: "/settings", requiredPerm: "settings.view" },
];

const quickItems = [
    { path: '/', label: 'Inicio', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/chat', label: 'Chat', icon: MessageCircle },
    { path: '/scheduling', label: 'Agenda', icon: Calendar },
];

export function MobileBottomNav() {
    const [location, setLocation] = useLocation();
    const [open, setOpen] = useState(false);
    const { user, logout } = useAuth();
    const { can } = usePermissions();
    const { theme, toggleTheme } = useTheme();

    const role = (user as any)?.role as string | undefined;

    // Filter menu items based on permissions (same logic as DashboardLayout)
    const visibleMenuItems = menuItems.filter((item) => {
        if (item.roles && item.roles.length > 0) {
            if (!role) return false;
            if (!item.roles.includes(role)) return false;
        }
        if (item.requiredPerm) {
            if (role === 'owner' || role === 'admin') return true;
            return can(item.requiredPerm);
        }
        return true;
    });

    const handleNavigate = (path: string) => {
        setLocation(path);
        setOpen(false);
    };

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-50 flex items-center justify-around px-2 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
                {quickItems.map((item) => {
                    const isActive = location === item.path;
                    return (
                        <Link key={item.path} href={item.path}>
                            <div className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors w-16",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}>
                                <item.icon className={cn("h-5 w-5", isActive && "fill-current/10")} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg w-16",
                                open ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Menu className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Menú</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                                    <MessageCircle className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Imagine Lab</span>
                                    <span className="text-[10px] text-muted-foreground">Pro CRM</span>
                                </div>
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex flex-col h-[calc(100vh-180px)] overflow-y-auto py-2">
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Principal
                            </div>
                            <nav className="px-2 space-y-1">
                                {visibleMenuItems.map((item) => {
                                    const isActive = location === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => handleNavigate(item.path)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                                                isActive
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-foreground hover:bg-accent"
                                            )}
                                        >
                                            <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                            <span>{item.label}</span>
                                            {isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
                                        </button>
                                    );
                                })}
                            </nav>

                            <Separator className="my-4" />

                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Preferencias
                            </div>
                            <div className="px-2 space-y-1">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-foreground hover:bg-accent"
                                >
                                    {theme === 'dark' ? (
                                        <>
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                            <span>Modo Claro</span>
                                        </>
                                    ) : (
                                        <>
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                            <span>Modo Oscuro</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* User section at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/30">
                            <div className="flex items-center gap-3 mb-3">
                                <Avatar className="h-9 w-9 rounded-lg border">
                                    <AvatarFallback className="rounded-lg text-xs font-medium bg-primary/10">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || "-"}</p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    logout();
                                    setOpen(false);
                                }}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Cerrar sesión
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
