import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Building2, Crown, Rocket } from "lucide-react";
import { useState } from "react";

/**
 * Interactive Pricing Page Component
 * Shows 4 plans with feature comparison and toggle between monthly/annual.
 */

const PLANS = [
    {
        id: "free",
        name: "Gratis",
        icon: Zap,
        priceMonthly: 0,
        priceAnnual: 0,
        description: "Para empezar",
        features: [
            "5 usuarios",
            "1 número WhatsApp",
            "1,000 mensajes/mes",
            "Pipeline básico",
            "Soporte por email",
        ],
        cta: "Comenzar Gratis",
        popular: false,
    },
    {
        id: "starter",
        name: "Starter",
        icon: Rocket,
        priceMonthly: 29,
        priceAnnual: 24,
        description: "Para equipos pequeños",
        features: [
            "10 usuarios",
            "3 números WhatsApp",
            "10,000 mensajes/mes",
            "Pipelines ilimitados",
            "Automatizaciones",
            "Reportes básicos",
            "Soporte prioritario",
        ],
        cta: "Elegir Starter",
        popular: false,
    },
    {
        id: "pro",
        name: "Pro",
        icon: Crown,
        priceMonthly: 99,
        priceAnnual: 79,
        description: "Para empresas en crecimiento",
        features: [
            "50 usuarios",
            "10 números WhatsApp",
            "100,000 mensajes/mes",
            "Todo de Starter +",
            "Campañas masivas",
            "SLA y helpdesk",
            "Campos personalizados",
            "API access",
            "Reportes avanzados",
        ],
        cta: "Prueba Gratis 14 días",
        popular: true,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        icon: Building2,
        priceMonthly: 299,
        priceAnnual: 249,
        description: "Para grandes organizaciones",
        features: [
            "Usuarios ilimitados",
            "50 números WhatsApp",
            "1M mensajes/mes",
            "Todo de Pro +",
            "SSO / SAML",
            "SLA garantizado",
            "Onboarding dedicado",
            "Soporte 24/7",
            "Integración personalizada",
        ],
        cta: "Contactar Ventas",
        popular: false,
    },
];

export default function PricingPage() {
    const [annual, setAnnual] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-7xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Planes y Precios
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Elige el plan perfecto para tu equipo. Todos incluyen 14 días de prueba gratuita.
                    </p>

                    {/* Billing toggle */}
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <span className={!annual ? "text-white font-medium" : "text-slate-400"}>Mensual</span>
                        <button
                            onClick={() => setAnnual(!annual)}
                            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-blue-600" : "bg-slate-600"
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${annual ? "translate-x-7" : ""
                                    }`}
                            />
                        </button>
                        <span className={annual ? "text-white font-medium" : "text-slate-400"}>
                            Anual <Badge className="ml-1 bg-green-500/20 text-green-400 border-green-500/30">-20%</Badge>
                        </span>
                    </div>
                </div>

                {/* Plan Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PLANS.map((plan) => {
                        const price = annual ? plan.priceAnnual : plan.priceMonthly;
                        const Icon = plan.icon;

                        return (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col bg-slate-800/50 border-slate-700 text-white ${plan.popular ? "border-blue-500 ring-2 ring-blue-500/20" : ""
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-blue-600 text-white border-0">
                                            Más Popular
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className="w-5 h-5 text-blue-400" />
                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-400">
                                        {plan.description}
                                    </CardDescription>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">${price}</span>
                                        {price > 0 && (
                                            <span className="text-slate-400 ml-1">/mes</span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <ul className="space-y-2.5 mb-6 flex-1">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                <span className="text-slate-300">{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className={`w-full ${plan.popular
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-slate-700 hover:bg-slate-600"
                                            }`}
                                        size="lg"
                                    >
                                        {plan.cta}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
