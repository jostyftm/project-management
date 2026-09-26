import React from "react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = (status: string) => {
  switch (status) {
    case "pending":
      return { style: "bg-yellow-100 text-yellow-800", name: "Pendiente" };
    case "in_progress":
      return { style: "bg-blue-100 text-blue-800", name: "En progreso" };
    case "completed":
      return { style: "bg-green-100 text-green-800", name: "Completado" };

    case "failed":
      return { style: "bg-red-100 text-red-800", name: "Fallido" };

    default:
      return { style: "bg-gray-100 text-gray-800", name: "Desconocido" };
  }
};

interface Props {
  status: string;
}

const StatusBadge = ({ status }: Props) => {
  return (
    <Badge className={cn("capitalize", statusStyles(status).style)}>
      {statusStyles(status).name}
    </Badge>
  );
};

export default StatusBadge;
