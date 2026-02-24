import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, Users, FileText, BarChart3, Ticket, Bot } from "lucide-react";

/**
 * Empty State Components
 *
 * Illustrated empty states for each major section.
 * Each includes an icon, title, description, and optional CTA button.
 */

interface EmptyStateProps {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center" role="status">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Icon className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

// ── Pre-built Empty States ──

export function EmptyLeads({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon={Users}
            title="Sin leads todavía"
            description="Agrega tu primer lead manualmente o importa un archivo CSV para comenzar a gestionar tus contactos."
            actionLabel="Agregar Lead"
            onAction={onAdd}
        />
    );
}

export function EmptyConversations() {
    return (
        <EmptyState
            icon={MessageSquare}
            title="Sin conversaciones"
            description="Las conversaciones aparecerán aquí cuando tus leads te escriban por WhatsApp o Facebook Messenger."
        />
    );
}

export function EmptyInbox() {
    return (
        <EmptyState
            icon={Inbox}
            title="Bandeja vacía"
            description="¡Todo al día! No hay mensajes pendientes por responder."
        />
    );
}

export function EmptyTickets({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon={Ticket}
            title="Sin tickets abiertos"
            description="Los tickets de soporte aparecerán aquí. Puedes crear uno manualmente o esperar a que los clientes abran solicitudes."
            actionLabel="Crear Ticket"
            onAction={onCreate}
        />
    );
}

export function EmptyReports() {
    return (
        <EmptyState
            icon={BarChart3}
            title="Sin datos para reportes"
            description="Los reportes se generarán automáticamente cuando tengas suficientes datos de conversaciones y leads."
        />
    );
}

export function EmptyTemplates({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon={FileText}
            title="Sin plantillas"
            description="Crea plantillas de mensajes para responder más rápido. Puedes usar variables dinámicas como {{nombre}}."
            actionLabel="Crear Plantilla"
            onAction={onCreate}
        />
    );
}

export function EmptyAutomations({ onCreate }: { onCreate?: () => void }) {
    return (
        <EmptyState
            icon={Bot}
            title="Sin automatizaciones"
            description="Configura flujos automáticos para respuestas, asignación de leads y seguimiento de clientes."
            actionLabel="Crear Automatización"
            onAction={onCreate}
        />
    );
}

export default EmptyState;
