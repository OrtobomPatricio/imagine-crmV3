/**
 * Skeleton Components Library
 *
 * Type-specific loading placeholders for WCAG compliance.
 * All skeletons include aria-label="Cargando" for screen readers.
 */

/** Base skeleton block with shimmer animation */
function Shimmer({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
            aria-hidden="true"
        />
    );
}

// ── Kanban Skeleton ──
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className="flex gap-4 overflow-x-auto p-4" role="status" aria-label="Cargando pipeline">
            {Array.from({ length: columns }).map((_, col) => (
                <div key={col} className="min-w-[280px] flex-shrink-0 space-y-3">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-4">
                        <Shimmer className="h-3 w-3 rounded-full" />
                        <Shimmer className="h-4 w-24" />
                        <Shimmer className="h-5 w-6 rounded-full ml-auto" />
                    </div>
                    {/* Cards */}
                    {Array.from({ length: 2 + col % 3 }).map((_, card) => (
                        <div key={card} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                            <Shimmer className="h-4 w-3/4" />
                            <Shimmer className="h-3 w-1/2" />
                            <div className="flex gap-2 pt-1">
                                <Shimmer className="h-5 w-16 rounded-full" />
                                <Shimmer className="h-5 w-12 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            <span className="sr-only">Cargando pipeline...</span>
        </div>
    );
}

// ── Chat List Skeleton ──
export function ChatListSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-1 p-2" role="status" aria-label="Cargando conversaciones">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    {/* Avatar */}
                    <Shimmer className="h-10 w-10 rounded-full shrink-0" />
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                            <Shimmer className="h-4 w-28" />
                            <Shimmer className="h-3 w-10" />
                        </div>
                        <Shimmer className="h-3 w-full" />
                    </div>
                </div>
            ))}
            <span className="sr-only">Cargando conversaciones...</span>
        </div>
    );
}

// ── Table Skeleton ──
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700" role="status" aria-label="Cargando tabla">
            {/* Header */}
            <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                {Array.from({ length: cols }).map((_, i) => (
                    <Shimmer key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="flex gap-4 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    {Array.from({ length: cols }).map((_, col) => (
                        <Shimmer
                            key={col}
                            className={`h-4 flex-1 ${col === 0 ? "w-1/3" : ""}`}
                        />
                    ))}
                </div>
            ))}
            <span className="sr-only">Cargando tabla...</span>
        </div>
    );
}

// ── Card Skeleton ──
export function CardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Cargando tarjetas">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-3">
                        <Shimmer className="h-10 w-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <Shimmer className="h-4 w-2/3" />
                            <Shimmer className="h-3 w-1/3" />
                        </div>
                    </div>
                    <Shimmer className="h-20 w-full rounded" />
                    <div className="flex gap-2">
                        <Shimmer className="h-8 w-20 rounded-md" />
                        <Shimmer className="h-8 w-20 rounded-md" />
                    </div>
                </div>
            ))}
            <span className="sr-only">Cargando tarjetas...</span>
        </div>
    );
}

// ── Stats Skeleton (for Dashboard) ──
export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" role="status" aria-label="Cargando estadísticas">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <Shimmer className="h-3 w-20" />
                    <Shimmer className="h-8 w-16" />
                    <Shimmer className="h-2 w-full" />
                </div>
            ))}
            <span className="sr-only">Cargando estadísticas...</span>
        </div>
    );
}
