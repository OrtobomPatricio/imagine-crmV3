/**
 * SkipToContent - Accessibility Skip Link
 *
 * Allows keyboard users to bypass navigation and jump directly
 * to the main content area. Invisible until focused.
 * WCAG 2.1 AA compliance requirement.
 */
export default function SkipToContent() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[99999] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            tabIndex={0}
        >
            Saltar al contenido principal
        </a>
    );
}
