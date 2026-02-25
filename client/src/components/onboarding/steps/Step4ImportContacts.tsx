import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/hooks/useOnboarding";
import { UploadCloud, FileSpreadsheet, Check, AlertCircle, Trash2, Database } from "lucide-react";

/**
 * Step 4: Import Contacts (CSV)
 */

export default function Step4ImportContacts() {
    const { nextStep, skipStep } = useOnboarding();
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState({ valid: 0, invalid: 0 });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            // Simular análisis de CSV
            setStats({ valid: 45, invalid: 2 });
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Importa tus Prospectos</h2>
                <p className="text-slate-500 text-sm">No empieces de cero. Carga un archivo CSV o Excel con tus contactos.</p>
            </div>

            {!file ? (
                <div
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer group"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                >
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full inline-block mb-4 group-hover:bg-blue-100 transition-colors">
                        <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Click para subir CSV</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Asegúrate de que el archivo tenga columnas de nombre y teléfono.
                    </p>
                    <input
                        id="csv-upload"
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={handleFile}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                            <Trash2 className="w-4 h-4 text-slate-400" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                                <Check className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Válidos</span>
                            </div>
                            <span className="text-2xl font-bold">{stats.valid}</span>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Errores</span>
                            </div>
                            <span className="text-2xl font-bold">{stats.invalid}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between gap-6">
                <div className="space-y-1">
                    <h4 className="font-bold flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        ¿Sin archivos?
                    </h4>
                    <p className="text-xs text-slate-400">Podemos cargar 5 contactos de ejemplo para que explores el CRM.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => nextStep({ demo: true })}>
                    Usar Demo
                </Button>
            </div>

            <div className="flex flex-col gap-3 pt-6">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    disabled={!file}
                    onClick={() => nextStep({ fileName: file?.name })}
                >
                    {file ? `Importar ${stats.valid} Contactos` : "Seleccionar Archivo"}
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-slate-500"
                    onClick={() => skipStep('import')}
                >
                    Agregar manualmente después
                </Button>
            </div>
        </div>
    );
}
