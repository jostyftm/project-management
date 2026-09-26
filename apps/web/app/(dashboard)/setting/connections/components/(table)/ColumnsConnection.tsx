import { ColumnDef } from "@tanstack/react-table";
import { DatabaseConnection } from "@/types/connection-type";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { Badge } from "@/components/ui/badge";
import ActionsConnection from "./ActionsConnection";

const DriverCell = ({ connection }: { connection: DatabaseConnection }) => {
  const driver = connection.relationships.driver;
  const color = useCatalogStore((state) =>
    state.getDriverById(driver?.id ?? -1)
  )?.attributes.color;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium"
      style={{
        color: color ?? "#64748b",
        borderColor: color ? `${color}55` : undefined,
        backgroundColor: color ? `${color}14` : undefined,
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color ?? "#94a3b8" }}
      />
      {driver?.name ?? "—"}
    </Badge>
  );
};

export const ColumnsConnection = (): ColumnDef<DatabaseConnection>[] => [
  {
    accessorKey: "attributes.name",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.attributes.name}</span>
    ),
  },
  {
    accessorKey: "relationships.driver",
    header: "Driver",
    cell: ({ row }) => <DriverCell connection={row.original} />,
  },
  {
    accessorKey: "attributes.host",
    header: "Host",
    cell: ({ row }) => row.original.attributes.host ?? "—",
  },
  {
    accessorKey: "attributes.port",
    header: "Puerto",
    cell: ({ row }) => row.original.attributes.port ?? "—",
  },
  {
    accessorKey: "attributes.db_name",
    header: "Base de datos",
    cell: ({ row }) => row.original.attributes.db_name ?? "—",
  },
  {
    accessorKey: "attributes.username",
    header: "Usuario",
    cell: ({ row }) => row.original.attributes.username ?? "—",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsConnection connection={row.original} />,
  },
];
