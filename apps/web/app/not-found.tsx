import React from "react";
import { NotFoundView } from "@/components/common/NotFoundView";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <NotFoundView
        title="404 - Página no encontrada"
        description="La dirección web a la que intentas acceder no existe, ha cambiado de lugar o fue eliminada."
        actionText="Volver al Home"
        actionHref="/overview"
      />
    </div>
  );
}
