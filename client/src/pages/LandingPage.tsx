import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, BarChart3, Zap, ArrowRight, Star, Shield, Globe } from "lucide-react";

/**
 * Landing Page Component
 * Hero section + Features + Social proof + CTA
 */

const FEATURES = [
    {
        icon: MessageSquare,
        title: "WhatsApp & Messenger Unificados",
        description: "Gestiona todas tus conversaciones desde una sola plataforma. WhatsApp Cloud API y Facebook Messenger integrados.",
    },
    {
        icon: Users,
        title: "CRM Completo",
        description: "Leads, pipelines, campos personalizados y automatizaciones. Todo lo que necesitas para cerrar más ventas.",
    },
    {
        icon: BarChart3,
        title: "Reportes en Tiempo Real",
        description: "Dashboard con métricas clave, rendimiento de agentes y análisis de conversiones automatizado.",
    },
    {
        icon: Shield,
        title: "Seguridad Empresarial",
        description: "Encriptación PII, 2FA, auditoría completa, GDPR compliance y aislamiento multi-tenant.",
    },
    {
        icon: Zap,
        title: "Automatizaciones Inteligentes",
        description: "Campañas masivas, distribución de leads, flujos automatizados y respuestas programadas.",
    },
    {
        icon: Globe,
        title: "Multi-Tenant SaaS",
        description: "Cada equipo tiene su espacio aislado. Feature flags, facturación y onboarding por tenant.",
    },
];

const STATS = [
    { value: "10K+", label: "Mensajes/día" },
    { value: "99.9%", label: "Uptime" },
    { value: "50+", label: "Integraciones" },
    { value: "< 200ms", label: "Respuesta API" },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Hero */}
            <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
                <Badge className="mb-6 bg-blue-600/20 text-blue-400 border-blue-500/30 text-sm px-4 py-1">
                    🚀 Plataforma CRM #1 para WhatsApp Business
                </Badge>

                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                    Tu equipo de ventas,{" "}
                    <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        potenciado con IA
                    </span>
                </h1>

                <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
                    CRM PRO unifica WhatsApp, Facebook Messenger, helpdesk y automatizaciones en una plataforma
                    segura y escalable. Cierra más ventas con menos esfuerzo.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 h-auto">
                        Comenzar Gratis <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-slate-600 text-lg px-8 py-6 h-auto text-white hover:bg-slate-800">
                        Ver Demo
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-16">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-3xl font-bold text-blue-400">{stat.value}</div>
                            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="max-w-7xl mx-auto px-4 py-20">
                <h2 className="text-3xl font-bold text-center mb-4">Todo lo que necesitas</h2>
                <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                    Una plataforma completa para gestionar clientes, comunicaciones y ventas.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.title}
                                className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/30 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                                    <Icon className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-4xl mx-auto px-4 py-20 text-center">
                <div className="p-12 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20">
                    <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ))}
                    </div>
                    <h2 className="text-3xl font-bold mb-4">
                        Empieza tu prueba gratuita de 14 días
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                        Sin tarjeta de crédito. Acceso completo a todas las funciones Pro.
                        Cancela cuando quieras.
                    </p>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-10 py-6 h-auto">
                        Comenzar Ahora <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </section>
        </div>
    );
}
