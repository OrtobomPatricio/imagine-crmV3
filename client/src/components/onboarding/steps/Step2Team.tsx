import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useOnboarding } from "@/hooks/useOnboarding";
import { X, Plus, UserPlus, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

/**
 * Step 2: Team Invitation
 */

interface Invite {
    email: string;
    role: string;
}

export default function Step2Team() {
    const { nextStep, skipStep } = useOnboarding();
    const { toast } = useToast();
    const [invites, setInvites] = useState<Invite[]>([
        { email: "", role: "agent" }
    ]);

    const addInvite = () => setInvites([...invites, { email: "", role: "agent" }]);
    const removeInvite = (index: number) => {
        if (invites.length > 1) {
            setInvites(invites.filter((_, i) => i !== index));
        }
    };

    const updateInvite = (index: number, field: keyof Invite, value: string) => {
        const newInvites = [...invites];
        newInvites[index][field] = value;
        setInvites(newInvites);
    };

    const handleContinue = async () => {
        const validInvites = invites.filter(i => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email));

        if (validInvites.length > 0) {
            // Note: Use teamRouter.invite to send actual emails
            toast({ title: "Invitaciones enviadas", description: `${validInvites.length} miembros invitados.` });
        }

        await nextStep(validInvites);
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Arma tu Equipo</h2>
                <p className="text-slate-500 text-sm">Invita a tus colaboradores para empezar a gestionar leads juntos.</p>
            </div>

            <div className="space-y-4">
                {invites.map((invite, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
                        <div className="flex-1 w-full space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="colaborador@email.com"
                                    className="pl-10 h-10"
                                    value={invite.email}
                                    onChange={(e) => updateInvite(index, 'email', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-32 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Rol</Label>
                            <Select
                                value={invite.role}
                                onValueChange={(v) => updateInvite(index, 'role', v)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="agent">Agente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-red-500"
                            onClick={() => removeInvite(index)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ))}

                <Button
                    variant="outline"
                    className="w-full border-dashed border-2 py-6 hover:border-blue-500 group"
                    onClick={addInvite}
                >
                    <Plus className="w-4 h-4 mr-2 group-hover:text-blue-500" />
                    Agregar otro colaborador
                </Button>
            </div>

            <div className="flex flex-col gap-3 pt-6">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    onClick={handleContinue}
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Enviar e Invitar
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-slate-500"
                    onClick={() => skipStep('team')}
                >
                    Omitir por ahora
                </Button>
            </div>
        </div>
    );
}
