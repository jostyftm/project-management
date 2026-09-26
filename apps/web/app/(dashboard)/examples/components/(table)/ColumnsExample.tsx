import { ColumnDef } from "@tanstack/react-table";
import SortableHeader from "@/components/ui/sortable-header";
import { ExampleType } from "@/types/example-type";
import ActionsExample from "./ActionsExample";
interface Props {
  isOnlyTrashed?: boolean;
  setSortColumn?: (value: string) => void;
  sortColumn?: string;
}
export const ColumnsExample = ({
  setSortColumn,
  sortColumn,
}: Props): ColumnDef<ExampleType>[] => [
  {
    accessorKey: "attributes.source_name",
    header: () => {
      return (
        <SortableHeader
          label="Nombre"
          column="source_name"
          sortColumn={sortColumn ?? ""}
          setSortColumn={setSortColumn ?? (() => {})}
        />
      );
    },
    cell: ({ row }) => {
      return row.original.attributes.source_name;
    },
  },
  {
    accessorKey: "attributes.format_date",
    header: "Formato de fecha",
    cell: ({ row }) => {
      return row.original.attributes.format_date;
    },
  },
  {
    accessorKey: "attributes.webhook_url",
    header: "URL",
    cell: ({ row }) => {
      return row.original.attributes.webhook_url;
    },
  },

  {
    accessorKey: "attributes.created_at",
    header: "Creación",
    cell: ({ row }) => {
      return (
        <div className="first-letter:capitalize">
          {row.original.attributes.created_at}
        </div>
      );
    },
  },
  {
    accessorKey: "attributes.updated_at",
    header: "Actualización",
    cell: ({ row }) => {
      return (
        <div className="first-letter:capitalize">
          {row.original.attributes.updated_at}
        </div>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => {
      return <ActionsExample example={row.original} />;
    },
  },
];
