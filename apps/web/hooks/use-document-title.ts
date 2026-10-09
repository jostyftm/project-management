"use client";

import { useEffect } from "react";

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title || !title.trim()) {
      document.title = "Plane - Plataforma de Gestión de Proyectos";
      return;
    }

    const cleanTitle = title.trim();
    if (cleanTitle.endsWith("| Plane")) {
      document.title = cleanTitle;
    } else {
      document.title = `${cleanTitle} | Plane`;
    }
  }, [title]);
}
