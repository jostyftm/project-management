"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotFoundViewProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
}

export function NotFoundView({
  title = "Página no encontrada",
  description = "La sección a la que intentas acceder no existe o no cuentas con los permisos requeridos para visualizarla.",
  actionText = "Volver al Home",
  actionHref = "/overview",
}: NotFoundViewProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-300">
      <div className="relative mb-6">
        <div className="size-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
          <ShieldAlert className="size-12 text-slate-500 dark:text-slate-400 stroke-[1.5]" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-3">
        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        404 • Página no disponible
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl max-w-md">
        {title}
      </h1>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href={actionHref}>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10 px-5 shadow-xs cursor-pointer">
            <ArrowLeft className="size-4" />
            <span>{actionText}</span>
          </Button>
        </Link>
        <Link href="/overview">
          <Button
            variant="outline"
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 h-10 px-5 cursor-pointer"
          >
            <Home className="size-4" />
            <span>Ir al Inicio</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundView;
