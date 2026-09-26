import { ColumnDef } from "@tanstack/react-table";
import { Report } from "@/types/report-type";
import { formatDate } from "@/lib/utils";
import ActionsReport from "./ActionsReport";

export const ColumnsReport = (): ColumnDef<Report>[] => [
  {
    accessorKey: "attributes.name",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.attributes.name}</span>
    ),
  },
  {
    accessorKey: "relationships.connection",
    header: "Conexión",
    cell: ({ row }) =>
      row.original.relationships.connection?.attributes.name ?? "—",
  },
  {
    accessorKey: "relationships.category",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.relationships.category?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "relationships.headers",
    header: "Columnas",
    cell: ({ row }) => row.original.relationships.headers?.length ?? 0,
  },
  {
    accessorKey: "attributes.created_at",
    header: "Creado",
    cell: ({ row }) =>
      row.original.attributes.created_at
        ? formatDate(row.original.attributes.created_at, "dd/MM/yyyy HH:mm")
        : "—",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsReport report={row.original} />,
  },
];
