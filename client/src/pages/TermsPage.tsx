import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, ChevronRight, Printer } from "lucide-react";

/**
 * TermsPage — Navigable Terms of Service page
 *
 * Features:
 * - Sticky Table of Contents sidebar
 * - 11 navigable sections
 * - Print-friendly via media query
 * - Accept button when accessed from signup
 */

const SECTIONS = [
    { id: "aceptacion", title: "1. Aceptación de Términos" },
    { id: "descripcion", title: "2. Descripción del Servicio" },
    { id: "cuentas", title: "3. Cuentas y Registro" },
    { id: "pagos", title: "4. Planes y Pagos" },
    { id: "uso", title: "5. Uso Aceptable" },
    { id: "propiedad", title: "6. Propiedad Intelectual" },
    { id: "responsabilidad", title: "7. Limitación de Responsabilidad" },
    { id: "terminacion", title: "8. Terminación" },
    { id: "ley", title: "9. Ley Aplicable" },
    { id: "cambios", title: "10. Cambios a los Términos" },
    { id: "contacto", title: "11. Contacto" },
];

export default function TermsPage({ onAccept }: { onAccept?: () => void }) {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                }
            },
            { rootMargin: "-20% 0px -70% 0px" }
        );

        SECTIONS.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            {/* Hero */}
            <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 print:bg-white print:text-black print:py-4">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex items-center gap-3 mb-4">
                        <ScrollText className="w-8 h-8 text-blue-400 print:hidden" />
                        <h1 className="text-3xl font-bold">Términos de Servicio</h1>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 print:bg-gray-200 print:text-gray-700">
                            Versión 1.0.0
                        </Badge>
                        <span>Última actualización: 24 de Febrero, 2026</span>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
                {/* Sticky TOC */}
                <nav className="hidden lg:block w-64 shrink-0 print:hidden" aria-label="Tabla de contenidos">
                    <div className="sticky top-8 space-y-1">
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contenido</h2>
                        {SECTIONS.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeSection === s.id
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {activeSection === s.id && <ChevronRight className="w-3 h-3" />}
                                <span>{s.title}</span>
                            </a>
                        ))}

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <Printer className="w-4 h-4" /> Imprimir
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Content */}
                <main className="flex-1 prose prose-slate dark:prose-invert max-w-none" id="main-content">
                    <section id="aceptacion">
                        <h2>1. Aceptación de Términos</h2>
                        <p>
                            Al acceder o utilizar CRM PRO V4 ("el Servicio"), usted acepta estar sujeto a estos
                            Términos de Servicio ("Términos"). Si no está de acuerdo con alguna parte de estos
                            términos, no podrá acceder al Servicio.
                        </p>
                        <p>
                            Estos Términos aplican a todos los visitantes, usuarios y personas que accedan o utilicen
                            el Servicio, incluyendo miembros del equipo invitados por el titular de la cuenta.
                        </p>
                    </section>

                    <section id="descripcion">
                        <h2>2. Descripción del Servicio</h2>
                        <p>
                            CRM PRO V4 es una plataforma SaaS (Software como Servicio) de gestión de relaciones
                            con clientes que incluye:
                        </p>
                        <ul>
                            <li>Gestión de leads y pipeline de ventas</li>
                            <li>Comunicación multicanal (WhatsApp Business API, Facebook Messenger)</li>
                            <li>Mesa de ayuda (helpdesk) con tickets y SLA</li>
                            <li>Campañas de marketing y automatizaciones</li>
                            <li>Reportes y analíticas en tiempo real</li>
                            <li>Gestión de equipos y permisos granulares</li>
                        </ul>
                    </section>

                    <section id="cuentas">
                        <h2>3. Cuentas y Registro</h2>
                        <ul>
                            <li>Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
                            <li>Debe notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta.</li>
                            <li>Es responsable de todas las actividades que ocurran bajo su cuenta.</li>
                            <li>Debe tener al menos 18 años para utilizar el Servicio.</li>
                            <li>No puede crear cuentas con información falsa o suplantando a otra persona.</li>
                        </ul>
                    </section>

                    <section id="pagos">
                        <h2>4. Planes y Pagos</h2>
                        <ul>
                            <li>Los precios están sujetos a cambios con aviso previo de 30 días.</li>
                            <li>Las suscripciones se renuevan automáticamente al final de cada período de facturación.</li>
                            <li>Los pagos son procesados por Stripe y están sujetos a sus términos de servicio.</li>
                            <li>Las pruebas gratuitas de 14 días otorgan acceso completo al plan Pro sin requerir tarjeta de crédito.</li>
                            <li>El prorrateo se aplica automáticamente al cambiar de plan a mitad de ciclo.</li>
                            <li>No se ofrecen reembolsos por períodos parciales, excepto en casos excepcionales a discreción del proveedor.</li>
                            <li>La falta de pago resultará en la suspensión de la cuenta después de 7 días de gracia.</li>
                        </ul>
                    </section>

                    <section id="uso">
                        <h2>5. Uso Aceptable</h2>
                        <p>No está permitido:</p>
                        <ul>
                            <li>Enviar spam, mensajes masivos no solicitados o contenido promocional sin consentimiento.</li>
                            <li>Utilizar el Servicio para actividades ilegales o fraudulentas.</li>
                            <li>Intentar acceder a datos de otros tenants (organizaciones).</li>
                            <li>Realizar ingeniería inversa, descompilar o desensamblar el software.</li>
                            <li>Exceder los límites de mensajes, usuarios o conexiones de su plan.</li>
                            <li>Compartir credenciales de acceso con terceros no autorizados.</li>
                            <li>Cargar archivos que contengan malware, virus o código malicioso.</li>
                            <li>Interferir con la infraestructura o el rendimiento del Servicio.</li>
                        </ul>
                    </section>

                    <section id="propiedad">
                        <h2>6. Propiedad Intelectual</h2>
                        <ul>
                            <li>CRM PRO V4, su código fuente, diseño, marcas y documentación son propiedad exclusiva del proveedor.</li>
                            <li>Usted retiene todos los derechos sobre los datos y contenidos que ingrese al Servicio.</li>
                            <li>Nos otorga una licencia limitada, no exclusiva y revocable para procesar sus datos únicamente con el fin de proveer el Servicio.</li>
                            <li>No adquiere ningún derecho de propiedad sobre el software por el uso del Servicio.</li>
                        </ul>
                    </section>

                    <section id="responsabilidad">
                        <h2>7. Limitación de Responsabilidad</h2>
                        <ul>
                            <li>El Servicio se proporciona "como está" y "según disponibilidad", sin garantías implícitas de ningún tipo.</li>
                            <li>No seremos responsables por daños indirectos, incidentales, especiales o consecuentes.</li>
                            <li>Nuestra responsabilidad máxima total está limitada al monto pagado por usted en los últimos 12 meses.</li>
                            <li>No garantizamos disponibilidad del 100%, aunque nos comprometemos a un uptime del 99.5% para planes Pro y Enterprise.</li>
                        </ul>
                    </section>

                    <section id="terminacion">
                        <h2>8. Terminación</h2>
                        <ul>
                            <li>Puede cancelar su suscripción en cualquier momento desde el panel de facturación.</li>
                            <li>Nos reservamos el derecho de suspender o terminar cuentas que violen estos Términos.</li>
                            <li>Tras la cancelación, tendrá 30 días para exportar sus datos.</li>
                            <li>Después de 90 días de cancelación, los datos serán eliminados permanentemente.</li>
                            <li>Le solicitaremos completar una breve encuesta al cancelar para mejorar nuestro servicio.</li>
                        </ul>
                    </section>

                    <section id="ley">
                        <h2>9. Ley Aplicable</h2>
                        <p>
                            Estos Términos se regirán e interpretarán de acuerdo con las leyes vigentes en la
                            jurisdicción donde opera el proveedor del Servicio. Cualquier disputa será sometida
                            a la jurisdicción exclusiva de los tribunales competentes de dicha jurisdicción.
                        </p>
                    </section>

                    <section id="cambios">
                        <h2>10. Cambios a los Términos</h2>
                        <p>
                            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios
                            significativos serán notificados por correo electrónico con al menos 30 días de
                            anticipación. El uso continuado del Servicio después de la fecha efectiva de los
                            cambios constituye la aceptación de los nuevos Términos.
                        </p>
                    </section>

                    <section id="contacto">
                        <h2>11. Contacto</h2>
                        <p>
                            Para consultas sobre estos Términos de Servicio, puede contactarnos en:
                        </p>
                        <ul>
                            <li><strong>Email:</strong> legal@crmpro.com</li>
                            <li><strong>Soporte:</strong> soporte@crmpro.com</li>
                        </ul>
                    </section>

                    {/* Accept button (visible when coming from signup) */}
                    {onAccept && (
                        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center print:hidden">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Al hacer clic en "Aceptar", confirmas que has leído y aceptas estos Términos de Servicio.
                            </p>
                            <Button onClick={onAccept} className="bg-blue-600 hover:bg-blue-700 px-8" size="lg">
                                Aceptar Términos de Servicio
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
