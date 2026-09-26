import React, { useMemo } from "react";
import CodeMirror, { EditorView, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  sql,
  SQLConfig,
  SQLNamespace,
  PostgreSQL,
  MySQL,
  MSSQL,
  SQLite,
  MariaSQL,
  SQLDialect,
} from "@codemirror/lang-sql";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { SchemaTable } from "@/types/schema-type";

export interface SqlMacroOption {
  label: string;
  desc?: string;
  apply?: string;
}

export const DEFAULT_SQL_MACROS: SqlMacroOption[] = [
  { label: "{{TODAY}}", desc: "Fecha actual (YYYY-MM-DD)" },
  { label: "{{YESTERDAY}}", desc: "Día anterior (YYYY-MM-DD)" },
  { label: "{{START_OF_MONTH}}", desc: "Primer día del mes (YYYY-MM-01)" },
  { label: "{{END_OF_MONTH}}", desc: "Último día del mes (YYYY-MM-DD)" },
  { label: "{{NOW}}", desc: "Fecha y hora actual (YYYY-MM-DD HH:mm:ss)" },
];

export const resolveSqlDialect = (dialect?: string): SQLDialect => {
  const d = dialect?.toLowerCase().trim();
  switch (d) {
    case "pgsql":
    case "postgres":
    case "postgresql":
      return PostgreSQL;
    case "mysql":
      return MySQL;
    case "mariadb":
      return MariaSQL;
    case "sqlsrv":
    case "mssql":
    case "sqlserver":
      return MSSQL;
    case "sqlite":
      return SQLite;
    default:
      return PostgreSQL;
  }
};

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  dialect?: string;
  tables?: SchemaTable[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  supportMacros?: boolean;
  macros?: SqlMacroOption[];
}

const buildSchema = (tables: SchemaTable[]): SQLNamespace =>
  Object.fromEntries(
    tables.map((table) => [table.name, table.columns.map((col) => col.name)])
  );

const AUTOCOMPLETE_THEME = EditorView.theme({
  ".cm-tooltip-autocomplete": {
    background: "#252526",
    border: "1px solid #3c3c3c",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    fontFamily:
      "var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  ".cm-tooltip-autocomplete > ul": {
    padding: "6px",
    maxHeight: "300px",
    scrollbarWidth: "thin",
    scrollbarColor: "#3c3c3c transparent",
  },
  ".cm-tooltip-autocomplete > ul > li": {
    padding: "6px 10px",
    marginBottom: "1px",
    borderRadius: "6px",
    lineHeight: "1.6",
  },
  ".cm-completionLabel": {
    fontFamily:
      "var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    letterSpacing: "0.01em",
    color: "#d4d4d4",
  },
  ".cm-completionDetail": {
    fontStyle: "normal",
    marginLeft: "8px",
    padding: "1px 8px",
    borderRadius: "6px",
    background: "rgba(255,255,255,0.06)",
    color: "#9cdcfe",
    fontSize: "11px",
    lineHeight: "1.4",
    whiteSpace: "nowrap",
  },
  ".cm-completionIcon": {
    paddingRight: "6px",
    opacity: "0.85",
  },
  ".cm-completionMatchedText": {
    color: "#4ec9b0",
    fontWeight: 600,
    textDecoration: "none",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected='true']": {
    background: "#37373d",
    color: "#ffffff",
  },
});

const createMacroCompletionSource = (macros: SqlMacroOption[]) => {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\{\{[a-zA-Z0-9_]*/);
    if (!word) return null;
    return {
      from: word.from,
      options: macros.map((m) => ({
        label: m.label,
        type: "variable",
        detail: m.desc,
        apply: m.apply || m.label,
        boost: 99,
      })),
    };
  };
};

export const SqlEditor = React.forwardRef<ReactCodeMirrorRef, SqlEditorProps>(
  function SqlEditor(
    {
      value,
      onChange,
      dialect = "pgsql",
      tables = [],
      placeholder,
      disabled,
      invalid,
      className,
      height,
      minHeight = "120px",
      maxHeight,
      supportMacros = true,
      macros = DEFAULT_SQL_MACROS,
    },
    ref
  ) {
    const resolvedDialect = useMemo(() => resolveSqlDialect(dialect), [dialect]);

    const sqlConfig = useMemo<SQLConfig>(
      () => ({
        upperCaseKeywords: true,
        schema: buildSchema(tables),
        dialect: resolvedDialect,
      }),
      [resolvedDialect, tables]
    );

    const macroSource = useMemo(
      () => (supportMacros ? createMacroCompletionSource(macros) : null),
      [supportMacros, macros]
    );

    const extensions = useMemo(() => {
      const exts = [sql(sqlConfig), AUTOCOMPLETE_THEME];
      if (macroSource) {
        exts.push(
          resolvedDialect.language.data.of({
            autocomplete: macroSource,
          })
        );
      }
      return exts;
    }, [sqlConfig, resolvedDialect, macroSource]);

    return (
      <CodeMirror
        ref={ref}
        value={value}
        onChange={onChange}
        extensions={extensions}
        placeholder={placeholder}
        editable={!disabled}
        theme={vscodeDark}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        style={
          invalid
            ? { border: "1px solid hsl(var(--destructive))", borderRadius: 8 }
            : { border: "1px solid hsl(var(--border))", borderRadius: 8 }
        }
        className={className}
      />
    );
  }
);

SqlEditor.displayName = "SqlEditor";