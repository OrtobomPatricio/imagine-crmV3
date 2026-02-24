# Design Tokens — CRM PRO

Sistema de diseño formal documentado para mantener consistencia visual.

## Colores

### Primarios
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--primary` | `#3b82f6` (Blue 500) | `#60a5fa` (Blue 400) | Acciones principales, CTAs |
| `--primary-hover` | `#2563eb` (Blue 600) | `#3b82f6` (Blue 500) | Hover en botones primarios |
| `--primary-soft` | `#eff6ff` (Blue 50) | `#1e3a5f` | Backgrounds suaves |

### Semánticos
| Token | Color | Uso |
|-------|-------|-----|
| `--success` | `#22c55e` (Green 500) | Éxito, conectado, activo |
| `--warning` | `#f59e0b` (Amber 500) | Advertencias, pendiente |
| `--danger` | `#ef4444` (Red 500) | Errores, eliminar, desconectado |
| `--info` | `#06b6d4` (Cyan 500) | Información, tips |

### Neutrales
| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#ffffff` | `#0f172a` (Slate 900) |
| `--bg-muted` | `#f8fafc` (Slate 50) | `#1e293b` (Slate 800) |
| `--border` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) |
| `--text` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) |

## Tipografía

| Elemento | Size | Weight | Line Height |
|----------|------|--------|-------------|
| H1 | `2.25rem` (36px) | 700 (Bold) | 1.2 |
| H2 | `1.875rem` (30px) | 700 | 1.3 |
| H3 | `1.5rem` (24px) | 600 (Semibold) | 1.35 |
| H4 | `1.25rem` (20px) | 600 | 1.4 |
| Body | `0.875rem` (14px) | 400 (Regular) | 1.5 |
| Small | `0.75rem` (12px) | 400 | 1.5 |
| Mono | `0.8125rem` (13px) | 400 | 1.6 |

**Font Stack:** `Inter, system-ui, -apple-system, sans-serif`

## Espaciado
| Token | Value | Uso |
|-------|-------|-----|
| `--space-1` | `0.25rem` (4px) | Micro gaps |
| `--space-2` | `0.5rem` (8px) | Inline spacing |
| `--space-3` | `0.75rem` (12px) | Component padding |
| `--space-4` | `1rem` (16px) | Card padding |
| `--space-5` | `1.5rem` (24px) | Section gaps |
| `--space-6` | `2rem` (32px) | Page sections |
| `--space-8` | `3rem` (48px) | Major sections |

## Border Radius
| Token | Value | Uso |
|-------|-------|-----|
| `--radius-sm` | `0.25rem` (4px) | Badges, pills inline |
| `--radius-md` | `0.375rem` (6px) | Buttons, inputs |
| `--radius-lg` | `0.5rem` (8px) | Cards, dropdowns |
| `--radius-xl` | `0.75rem` (12px) | Modals, panels |
| `--radius-2xl` | `1rem` (16px) | Feature cards |
| `--radius-full` | `9999px` | Avatars, badges circulares |

## Sombras
| Token | Value | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Botones, chips |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modales, popovers |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Overlays |

## Z-Index Scale
| Token | Value | Uso |
|-------|-------|-----|
| `z-dropdown` | `50` | Dropdowns, popovers |
| `z-sticky` | `100` | Headers sticky |
| `z-modal` | `200` | Modales, dialogs |
| `z-toast` | `300` | Notificaciones toast |
| `z-tooltip` | `400` | Tooltips |
| `z-command` | `500` | Command palette |
| `z-max` | `9999` | Skip links, overlays |

## Transiciones
| Propiedad | Duration | Easing |
|-----------|----------|--------|
| Color/opacity | `150ms` | `ease-in-out` |
| Transform | `200ms` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Width/height | `300ms` | `ease-out` |
| Modal entrada | `200ms` | `cubic-bezier(0, 0, 0.2, 1)` |
| Modal salida | `150ms` | `cubic-bezier(0.4, 0, 1, 1)` |

> **prefers-reduced-motion:** Todas las transiciones se reducen a `0.01ms` automáticamente.

## Contraste WCAG
| Combinación | Ratio | Status |
|------------|-------|--------|
| `--text` sobre `--bg` | **15.4:1** | ✅ AAA |
| `--text-muted` sobre `--bg` | **4.6:1** | ✅ AA |
| `--primary` sobre `--bg` | **4.5:1** | ✅ AA |
| `--danger` sobre `--bg` | **4.6:1** | ✅ AA |
| White sobre `--primary` | **4.5:1** | ✅ AA |
