/**
 * DEV BYPASS - Autenticación automática para desarrollo
 * Este módulo permite entrar sin login en modo desarrollo
 */

import type { Express, Request, Response, NextFunction } from "express";
import { COOKIE_NAME } from "@shared/const";

const DEV_USER = {
  id: 1,
  tenantId: 1,
  openId: "dev@localhost",
  name: "Developer",
  email: "dev@localhost",
  role: "owner",
  loginMethod: "dev",
  isActive: true,
  hasSeenTour: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export function registerDevBypass(app: Express) {
  const isDev = process.env.NODE_ENV !== "production";
  
  if (!isDev) return;

  console.log("[DEV] Auto-authentication enabled for development");

  // Middleware que automáticamente "autentica" todas las peticiones
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Solo para rutas API que requieren autenticación
    if (req.path.startsWith("/api/trpc")) {
      // Simular que hay una cookie de sesión válida
      (req as any).cookies = {
        ...(req as any).cookies,
        [COOKIE_NAME]: "dev-bypass-token"
      };
      
      // Agregar el usuario al contexto para tRPC
      (req as any).devBypassUser = DEV_USER;
    }
    next();
  });

  // Endpoint que retorna el usuario actual (simulado)
  app.get("/api/dev/user", (req: Request, res: Response) => {
    res.json({
      id: DEV_USER.id,
      openId: DEV_USER.openId,
      name: DEV_USER.name,
      email: DEV_USER.email,
      role: DEV_USER.role,
      loginMethod: DEV_USER.loginMethod,
      isActive: DEV_USER.isActive,
      hasSeenTour: DEV_USER.hasSeenTour,
    });
  });

  // Login que simplemente redirige (la auth ya está hecha por middleware)
  app.get("/api/dev/auto-login", (req: Request, res: Response) => {
    res.cookie(COOKIE_NAME, "dev-bypass-token", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
    });
    res.redirect("/");
  });
}

export function getDevBypassUser() {
  return DEV_USER;
}
