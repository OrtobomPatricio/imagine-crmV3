import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Upload, X } from "lucide-react";

interface CSVPreviewProps {
    csvContent: string;
    onConfirm: (content: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const MAX_PREVIEW_ROWS = 20;

function parseCSVLines(csv: string): string[][] {
    const lines = csv.trim().split("\n");
    return lines.map((line) =>
        line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim())
    );
}

/**
 * CSV Import Preview Component
 * Shows a table preview of the parsed CSV before confirming the import.
 * Validates required columns and highlights potential issues.
 */
export function CSVPreview({ csvContent, onConfirm, onCancel, isLoading }: CSVPreviewProps) {
    const parsed = useMemo(() => parseCSVLines(csvContent), [csvContent]);

    const headers = parsed[0] ?? [];
    const rows = parsed.slice(1);
    const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
    const remainingRows = rows.length - previewRows.length;

    // Validate required columns
    const REQUIRED_COLUMNS = ["fullName", "phoneNumber"];
    const missingColumns = REQUIRED_COLUMNS.filter(
        (col) => !headers.some((h) => h.toLowerCase() === col.toLowerCase())
    );

    const hasErrors = missingColumns.length > 0;

    return (
        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Vista Previa de Importación CSV
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                    <span>{rows.length} registros encontrados</span>
                    <span>·</span>
                    <span>{headers.length} columnas</span>
                    {hasErrors ? (
                        <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Errores detectados
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="ml-2">
                            <CheckCircle className="h-3 w-3 mr-1" /> Válido
                        </Badge>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasErrors && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                        <strong>Columnas requeridas faltantes:</strong> {missingColumns.join(", ")}
                    </div>
                )}

                <div className="max-h-[400px] overflow-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                {headers.map((h, i) => (
                                    <TableHead key={i} className="min-w-[120px]">
                                        {h}
                                        {REQUIRED_COLUMNS.some((r) => r.toLowerCase() === h.toLowerCase()) && (
                                            <span className="text-destructive ml-1">*</span>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewRows.map((row, ri) => (
                                <TableRow key={ri}>
                                    <TableCell className="text-muted-foreground">{ri + 1}</TableCell>
                                    {row.map((cell, ci) => (
                                        <TableCell key={ci} className="max-w-[200px] truncate">
                                            {cell || <span className="text-muted-foreground italic">vacío</span>}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {remainingRows > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                        ... y {remainingRows} registros más
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                        <X className="h-4 w-4 mr-2" /> Cancelar
                    </Button>
                    <Button onClick={() => onConfirm(csvContent)} disabled={hasErrors || isLoading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {isLoading ? "Importando..." : `Importar ${rows.length} registros`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
