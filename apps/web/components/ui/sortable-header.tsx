import BaseIcon from "./base-icon";

const SortIcon = ({ isAsc, isDesc }: { isAsc: boolean; isDesc: boolean }) => {
  if (isAsc) return "ArrowUp";
  if (isDesc) return "ArrowDown";
  return "ArrowUpDown";
};

const toggleSort = (column: string, sortColumn: string) => {
  if (sortColumn === column) return `-${column}`;
  if (sortColumn === `-${column}`) return "";
  return column;
};

const SortableHeader = ({
  label,
  column,
  sortColumn,
  setSortColumn,
}: {
  label: string;
  column: string;
  sortColumn: string;
  setSortColumn: (value: string) => void;
}) => {
  const isAsc = sortColumn === column;
  const isDesc = sortColumn === `-${column}`;

  return (
    <button onClick={() => setSortColumn(toggleSort(column, sortColumn))} className="hover:text-blue-500 transition-colors flex items-center"> 
      {label}
      <BaseIcon
        name={SortIcon({ isAsc, isDesc })}
        className="h-4 w-4 inline-block ml-1 cursor-pointer"
      />
    </button>
  );
};

export default SortableHeader;
