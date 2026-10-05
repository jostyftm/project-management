"use client";

import React from "react";
import Link from "next/link";
import { FolderX, ArrowLeft, ShieldAlert, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
}

export function ProjectNotFoundView({
  title = "Proyecto no encontrado",
  description = "El proyecto que intentas visualizar no existe o no tienes permisos para acceder a él. Es posible que el enlace sea incorrecto o que hayas sido removido del equipo de colaboradores.",
  actionText = "Volver a Mis Proyectos",
  actionHref = "/projects",
}: Props) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-300">
      <div className="relative mb-6">
        <div className="size-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs">
          <FolderX className="size-12 text-indigo-600 stroke-[1.5]" />
        </div>
        <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-red-600 shadow-xs">
          <ShieldAlert className="size-4" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 mb-3">
        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        404 • Recurso no disponible
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl max-w-md">
        {title}
      </h1>

      <p className="mt-3 text-sm text-slate-500 max-w-md leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href={actionHref}>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10 px-5 shadow-xs">
            <ArrowLeft className="size-4" />
            <span>{actionText}</span>
          </Button>
        </Link>
        <Link href="/inbox">
          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-10 px-5">
            <Home className="size-4" />
            <span>Ir a Bandeja de Entrada</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
