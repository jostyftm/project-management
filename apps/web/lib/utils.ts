import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, Locale } from "date-fns";
import { es } from "date-fns/locale";
import { StylesConfig } from "react-select";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(label: string) {
  return label
    .split(" ")
    .map((word) => word.length > 0 && word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function normalizeDayOfWeek(value: number | number[] | undefined): number[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export const formatDate = (
  date: string | Date | null | undefined,
  dateFormat: string,
  options?: {
    capitalize?: boolean;
    locale?: Locale;
  }
): string => {
  if (!date) return "-";

  const parsedDate = typeof date === "string" ? new Date(date) : date;

  if (isNaN(parsedDate.getTime())) return "-";

  const formatted = format(parsedDate, dateFormat, {
    locale: options?.locale ?? es,
  });

  return options?.capitalize
    ? formatted.charAt(0).toUpperCase() + formatted.slice(1)
    : formatted;
};

export const sentenceCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const lowerCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1).toLowerCase()
}

export const ReactSelectCustomStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "white",
    borderColor: state.isFocused ? "#2f53eb" : "#D1D5DB", // indigo-600 o gray-300
    boxShadow: state.isFocused
      ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "&:hover": {
      borderColor: "#D1D5DB",
    },
    borderRadius: "0.375rem", // rounded-md
    minHeight: "1rem", //
    padding: "0 0.25rem",
    cursor: "pointer",
    border: "2 #D1D5DB",
    fontSize: "0.875rem",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 0.5rem",
  }),
  placeholder: (base, state) => ({
    ...base,
    color: state.isDisabled ? "#9CA3AF" : "black",
  }),
  singleValue: (base, state) => ({
    ...base,
    color: state.isDisabled ? "#9CA3AF" : "black",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#E5E7EB", // bg-gray-200
    borderRadius: "0.375rem", // rounded-md
    padding: "0 0.25rem",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#111827",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#6B7280",
    "&:hover": {
      backgroundColor: "#D1D5DB",
      color: "#111827",
    },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#9CA3AF",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.375rem",
    // boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    borderColor: "black",
    border: "10px",
    padding: 5,
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#D1D5DB"
      : state.isFocused
        ? "white"
        : "white",
    "&:hover": {
      backgroundColor: "rgba(209, 213, 219, 0.5)",
    },
    gap: 0,
    borderRadius: 5,
    color: state.isSelected ? "black" : "#111827",

    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  }),
};