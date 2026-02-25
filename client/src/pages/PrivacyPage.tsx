import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Shield,
    Lock,
    Eye,
    Globe,
    Scale,
    Download,
    Trash2,
    Cookie,
    FileJson,
    RefreshCw
} from "lucide-react";
import CookieSettings from "@/components/CookieSettings";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

/**
 * PrivacyPage — GDPR compliant privacy policy page
 *
 * Features:
 * - Clear sections on data collection, usage, and rights
 * - Action buttons for Art. 15-21 rights
 * - Cookie settings integration
 */

export default function PrivacyPage() {
    const [cookieOpen, setCookieOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState("");
    const { toast } = useToast();

    const exportMutation = trpc.gdpr.exportMyData.useQuery(undefined, { enabled: false });
    const deleteMutation = trpc.gdpr.requestDeletion.useMutation({
        onSuccess: (data) => {
            toast({ title: "Solicitud procesada", description: data.message });
            setDeleteOpen(false);
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleExport = async () => {
        toast({ title: "Generando exportación", description: "Sus datos se están recolectando..." });
        const result = await exportMutation.refetch();
        if (result.data?.success) {
            const blob = new Blob([JSON.stringify(result.data.data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `crmproc-data-export-${new Date().getTime()}.json`;
            a.click();
            toast({ title: "Exportación completa", description: "Archivo descargado correctamente." });
        }
    };

    const handleDelete = () => {
        deleteMutation.mutate({ confirmEmail });
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900">
            {/* Hero */}
            <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-12 print:bg-white print:text-black print:py-4">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-8 h-8 text-blue-400 print:hidden" />
                            <h1 className="text-3xl font-bold">Política de Privacidad</h1>
                        </div>
                        <div className="flex items-center gap-3 text-blue-200 text-sm">
                            <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 print:bg-gray-200 print:text-gray-700">
                                RGPD Compliant
                            </Badge>
                            <span>Última actualización: 24 de Febrero, 2026</span>
                        </div>
                    </div>

                    <div className="flex gap-2 print:hidden">
                        <Button
                            variant="secondary"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                            onClick={() => setCookieOpen(true)}
                        >
                            <Cookie className="w-4 h-4 mr-2" />
                            Cookies
                        </Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600"
                            onClick={handleExport}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar Datos
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <main className="prose prose-slate dark:prose-invert max-w-none">
                    {/* GDPR Tools Alert */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
                        <div>
                            <h3 className="text-amber-800 dark:text-amber-400 mt-0 flex items-center gap-2">
                                <Scale className="w-5 h-5" />
                                Sus Derechos de Datos
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-0">
                                De acuerdo con el RGPD, usted tiene el control total sobre su información.
                                Utilice las herramientas a la derecha para acceder o eliminar su cuenta.
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-3">
                            <Button variant="outline" className="border-amber-300 text-amber-800" onClick={handleExport}>
                                <FileJson className="w-4 h-4 mr-2" />
                                Exportar JSON
                            </Button>
                            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Solicitar Borrado
                            </Button>
                        </div>
                    </div>

                    <section>
                        <h2>1. Introducción y Controlador</h2>
                        <p>
                            En <strong>CRM PRO V4</strong> (operado por Imagine Lab), nos tomamos muy en serio la privacidad de sus datos.
                            Actuamos como "Controlador de Datos" para su información de cuenta y como "Encargado del Tratamiento"
                            para los datos de sus clientes.
                        </p>
                    </section>

                    <section>
                        <h2>2. Datos que Recopilamos</h2>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left py-2">Categoría</th>
                                    <th className="text-left py-2">Ejempos</th>
                                    <th className="text-left py-2">Base Legal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-100 dark:border-slate-900">
                                    <td className="py-2 font-semibold">Identidad</td>
                                    <td className="py-2">Nombre, email, avatar</td>
                                    <td className="py-2">Contrato</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-900">
                                    <td className="py-2 font-semibold">Técnicos</td>
                                    <td className="py-2">IP, Navegador, Logs</td>
                                    <td className="py-2">Interés Legítimo</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-900">
                                    <td className="py-2 font-semibold">Mensajería</td>
                                    <td className="py-2">Contenido de chats, números</td>
                                    <td className="py-2">Contrato</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section>
                        <h2>3. Transferencias Internacionales</h2>
                        <p>
                            Sus datos se almacenan principalmente en servidores dentro de la Unión Europea.
                            Sin embargo, al utilizar integraciones como Meta (WhatsApp) o Stripe, algunos datos
                            pueden procesarse en los EE.UU. bajo Cláusulas Contractuales Estándar (SCC).
                        </p>
                    </section>

                    <section>
                        <h2>4. Sus Derechos (RGPD Art. 15-21)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-8">
                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <Download className="w-4 h-4 text-blue-500" />
                                    Derecho de Acceso
                                </h4>
                                <p className="text-xs text-slate-500">Solicite una copia completa de su información personal en formato estructurado.</p>
                            </div>
                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-green-500" />
                                    Rectificación
                                </h4>
                                <p className="text-xs text-slate-500">Corrija cualquier dacto inexacto o incompleto a través de su panel de configuración.</p>
                            </div>
                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                    Supresión (Olvido)
                                </h4>
                                <p className="text-xs text-slate-500">Solicite la eliminación definitiva de su cuenta y todos los datos asociados.</p>
                            </div>
                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <h4 className="font-bold mb-2 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-purple-500" />
                                    Restricción
                                </h4>
                                <p className="text-xs text-slate-500">Limite el procesamiento de sus datos en casos de impugnación o uso ilícito.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2>5. Seguridad de Datos</h2>
                        <div className="bg-slate-900 text-white p-6 rounded-xl my-8">
                            <h4 className="text-blue-400 mt-0 flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Estándar Bancario de Seguridad
                            </h4>
                            <p className="text-sm mb-0">
                                Utilizamos encriptación de extremo a extremo, hash de contraseñas con Argon2/Bcrypt,
                                aislamiento de tenants a nivel de base de datos y auditorías de seguridad semanales
                                para garantizar que su información esté a salvo.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2>6. Cambios en esta Política</h2>
                        <p>
                            Podemos actualizar esta política ocasionalmente. Si los cambios son significativos,
                            le notificaremos dentro de la plataforma o por correo electrónico.
                        </p>
                    </section>

                    <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                        <h3>Contacto y Delegado de Protección (DPO)</h3>
                        <p>
                            Para cualquier solicitud relacionada con la privacidad, puede contactar a nuestro DPO en
                            <strong> privacy@crmpro.com</strong>.
                        </p>
                    </section>
                </main>
            </div>

            {/* Components */}
            <CookieSettings open={cookieOpen} onClose={() => setCookieOpen(false)} />

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            ¿Solicitar Eliminacion de Cuenta?
                        </DialogTitle>
                        <DialogDescription>
                            Esta acción marcará su cuenta para eliminación permanente en 30 días.
                            Durante este periodo, su acceso será desactivado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Confirme su correo electrónico</Label>
                            <Input
                                id="email"
                                placeholder="tu@email.com"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            disabled={confirmEmail.length === 0 || deleteMutation.isPending}
                            onClick={handleDelete}
                        >
                            {deleteMutation.isPending ? "Procesando..." : "Confirmar Eliminación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

