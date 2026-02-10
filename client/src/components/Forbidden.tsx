import { AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

interface ForbiddenProps {
    title?: string;
    description?: string;
    onBack?: () => void;
}

export function Forbidden({
    title = "Acceso Denegado",
    description = "No tenés permisos suficientes para acceder a esta sección. Si creés que es un error, contactá a tu administrador.",
    onBack
}: ForbiddenProps) {
    const [, setLocation] = useLocation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            setLocation("/");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[50vh] p-4">
            <Card className="w-full max-w-md border-destructive/20 shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <CardTitle className="text-xl text-destructive">{title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground mt-2">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center pb-6">
                    <Button variant="outline" onClick={handleBack} className="min-w-[120px]">
                        Volver
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
