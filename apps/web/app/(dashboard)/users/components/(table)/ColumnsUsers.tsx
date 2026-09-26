import { ColumnDef } from "@tanstack/react-table";
import { UserItem } from "../../types/user-types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ActionsUsers from "./ActionsUsers";

export const ColumnsUsers = (): ColumnDef<UserItem>[] => [
  {
    accessorKey: "attributes.name",
    header: "Usuario",
    cell: ({ row }) => {
      const name = row.original.attributes.name || "Sin nombre";
      const initial = name.charAt(0).toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-primary/20 shrink-0">
            {initial}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-900 truncate">{name}</span>
            <span className="text-xs text-muted-foreground truncate sm:hidden">
              {row.original.attributes.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "attributes.email",
    header: "Correo electrónico",
    cell: ({ row }) => (
      <span className="text-slate-600 text-sm">{row.original.attributes.email}</span>
    ),
  },
  {
    accessorKey: "attributes.user_auth_id",
    header: "ID Auth",
    cell: ({ row }) => {
      const authId = row.original.attributes.user_auth_id;
      return authId ? (
        <Badge variant="outline" className="font-mono text-xs font-normal text-slate-600 bg-slate-50">
          #{authId}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground italic">No vinculado</span>
      );
    },
  },
  {
    accessorKey: "attributes.reports_count",
    header: "Reportes Asignados",
    cell: ({ row }) => {
      const count = row.original.attributes.reports_count ?? 0;
      return (
        <Badge
          variant={count > 0 ? "secondary" : "outline"}
          className={`text-xs font-medium ${
            count > 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "text-slate-400 border-slate-200"
          }`}
        >
          {count} {count === 1 ? "reporte" : "reportes"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "attributes.created_at",
    header: "Fecha de registro",
    cell: ({ row }) =>
      row.original.attributes.created_at
        ? formatDate(row.original.attributes.created_at, "dd/MM/yyyy HH:mm")
        : "—",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsUsers user={row.original} />,
  },
];
