import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useOnboarding } from "@/hooks/useOnboarding";
import { trpc } from "@/lib/trpc";
import { Building2, Globe, Clock, Banknote } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "El nombre de la empresa es muy corto"),
    timezone: z.string(),
    language: z.string(),
    currency: z.string(),
});

export default function Step1Company() {
    const { nextStep } = useOnboarding();
    const updateCompanyMutation = trpc.onboarding.updateCompany.useMutation();

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            timezone: "America/Asuncion",
            language: "es",
            currency: "PYG",
        }
    });

    const onSubmit = (values: z.infer<typeof schema>) => {
        // Fire backend save as best-effort, don't block UI
        updateCompanyMutation.mutate(values, {
            onError: (err) => console.warn("[Onboarding] Company save failed:", err.message)
        });
        nextStep(values);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Datos de tu Empresa</h2>
                <p className="text-slate-500 text-sm">Comencemos con la información básica para personalizar tu CRM.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <Label>Nombre de la Empresa</Label>
                                <FormControl>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <Input {...field} placeholder="Ej: Mi Negocio S.A." className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Zona Horaria</Label>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <SelectValue placeholder="Seleccionar" />
                                                </div>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="America/Asuncion">Paraguay (UTC-4)</SelectItem>
                                            <SelectItem value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</SelectItem>
                                            <SelectItem value="America/Sao_Paulo">Brasil (UTC-3)</SelectItem>
                                            <SelectItem value="UTC">Universal (UTC)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Idioma</Label>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-slate-400" />
                                                    <SelectValue placeholder="Seleccionar" />
                                                </div>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="pt">Português</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                                <Label>Moneda Principal</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <div className="flex items-center gap-2">
                                                <Banknote className="w-4 h-4 text-slate-400" />
                                                <SelectValue placeholder="Seleccionar" />
                                            </div>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="PYG">Guaraní (PYG)</SelectItem>
                                        <SelectItem value="USD">Dólar (USD)</SelectItem>
                                        <SelectItem value="ARS">Peso (ARS)</SelectItem>
                                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="pt-6">
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                            disabled={updateCompanyMutation.isPending}
                        >
                            {updateCompanyMutation.isPending ? "Guardando..." : "Continuar"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
