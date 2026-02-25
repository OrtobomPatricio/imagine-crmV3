/**
 * Toast hook - Adaptador para sonner con API tipo shadcn/ui
 */
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

// Tipo para las opciones del toast
type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  duration?: number;
};

// Función toast principal que acepta objeto o string
function toast(options: string | ToastOptions) {
  if (typeof options === "string") {
    return sonnerToast(options);
  }

  const { title, description, variant, duration } = options;
  
  // Determinar el tipo de toast basado en variant
  const toastFn = variant === "destructive" 
    ? sonnerToast.error 
    : variant === "success"
    ? sonnerToast.success
    : variant === "warning"
    ? sonnerToast.warning
    : variant === "info"
    ? sonnerToast.info
    : sonnerToast;

  // Llamar sonner con title y description
  return toastFn(title, {
    description,
    duration,
  });
}

// Hook useToast para compatibilidad
export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    success: (title: string, opts?: { description?: string }) => 
      sonnerToast.success(title, opts),
    error: (title: string, opts?: { description?: string }) => 
      sonnerToast.error(title, opts),
    info: (title: string, opts?: { description?: string }) => 
      sonnerToast.info(title, opts),
    warning: (title: string, opts?: { description?: string }) => 
      sonnerToast.warning(title, opts),
  };
}

// Exportar componente Toaster
export { SonnerToaster as Toaster };

// Exportar toast directamente
export { toast };

export default useToast;
