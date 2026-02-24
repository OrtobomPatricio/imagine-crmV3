# Responsive Breakpoints — CRM PRO

Guía de responsive design para mantener consistencia en todos los dispositivos.

## Breakpoints (Tailwind CSS)

| Breakpoint | Min Width | Target Devices |
|-----------|----------|----------------|
| `sm` | `640px` | Móviles grandes (landscape) |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Laptops |
| `xl` | `1280px` | Desktops |
| `2xl` | `1536px` | Pantallas grandes |

## Layout por Breakpoint

### Mobile (`< 640px`)
- **Sidebar:** Colapsada, accesible via hamburger menu
- **Navigation:** Bottom nav bar (MobileBottomNav.tsx)
- **Grid:** 1 columna
- **Chat:** Full-screen conversation view
- **Kanban:** Scroll horizontal, 1 columna visible
- **Tables:** Cards en lugar de filas
- **Modales:** Full screen

### Tablet (`768px – 1023px`)
- **Sidebar:** Colapsable con toggle
- **Navigation:** Sidebar icons only
- **Grid:** 2 columnas
- **Chat:** Split view (lista + conversación)
- **Kanban:** 2–3 columnas visibles
- **Tables:** Scroll horizontal con columnas fijas
- **Modales:** Centered, 80% width

### Desktop (`1024px – 1279px`)
- **Sidebar:** Expandida con labels
- **Grid:** 3 columnas
- **Chat:** Sidebar + conversación + info panel
- **Kanban:** 4 columnas completas
- **Tables:** Full width, todas las columnas
- **Modales:** Centered, max-width 640px

### Large Desktop (`≥ 1280px`)
- **Sidebar:** Expandida + pinned
- **Grid:** 4 columnas
- **Chat:** 3-panel layout
- **Dashboard:** Stats + charts side by side
- **Modales:** Centered, max-width 720px

## Patrones Responsive

### Grid System
```css
/* 1-col mobile, 2-col tablet, 3-col desktop, 4-col large */
.responsive-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}
```

### Sidebar
```css
/* Hidden on mobile, icons on tablet, full on desktop */
.sidebar {
  @apply hidden md:flex md:w-16 lg:w-64 transition-all;
}
```

### Typography Scale
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| H1 | 24px | 30px | 36px |
| H2 | 20px | 24px | 30px |
| Body | 14px | 14px | 14px |
| Small | 12px | 12px | 12px |

### Touch Targets
- **Mínimo:** 44x44px en móvil (WCAG 2.5.5)
- **Recomendado:** 48x48px para botones principales
- **Spacing entre targets:** Mínimo 8px

## Container Widths
| Container | Max Width | Padding |
|-----------|----------|---------|
| `page` | `1280px` | `16px` mobile, `24px` desktop |
| `content` | `960px` | `16px` |
| `narrow` | `640px` | `16px` |
| `dialog` | `480px` | `24px` |

## Media Queries Especiales
```css
/* High DPI screens */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  /* Use 2x assets */
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  /* Auto dark mode for system preference */
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  /* Disable animations */
}

/* Print */
@media print {
  .sidebar, .bottom-nav, .toast { display: none; }
  .main-content { width: 100%; margin: 0; }
}
```
