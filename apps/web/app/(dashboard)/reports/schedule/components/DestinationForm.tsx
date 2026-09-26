"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BaseIcon from "@/components/ui/base-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportDestination } from "@/types/schedule-type";
import { DestinationType } from "@/types/catalog-type";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";

interface Props {
  destinations: DestinationType[];
  value: ReportDestination[];
  onChange: (dests: ReportDestination[]) => void;
}

export const DestinationForm = ({
  destinations,
  value,
  onChange,
}: Props) => {
  const getDestinationById = useCatalogStore((s) => s.getDestinationById);

  const addDestination = (typeId: number) => {
    const exists = value.some((d) => d.destination_type_id === typeId);
    if (exists) return;
    const type = getDestinationById(typeId);
    const defaultConfig =
      type?.attributes.code === "email" ? { to: [] } : {};
    onChange([
      ...value,
      {
        id: Date.now(),
        destination_type_id: typeId,
        type: type?.attributes.code ?? null,
        config: defaultConfig,
      },
    ]);
  };

  const removeDestination = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateConfig = (index: number, config: Record<string, unknown>) => {
    onChange(
      value.map((d, i) => (i === index ? { ...d, config } : d))
    );
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5 max-w-xs">
        <label className="text-sm font-medium">Agregar destino</label>
        <Select onValueChange={(v) => addDestination(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un destino..." />
          </SelectTrigger>
          <SelectContent>
            {destinations.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.attributes.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {value.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay destinos configurados. Agrega FTP o Email.
          </p>
        )}
        {value.map((dest, index) => {
          const type = getDestinationById(dest.destination_type_id);
          const code = type?.attributes.code ?? dest.type;
          const color = type?.attributes.color ?? undefined;

          return (
            <div
              key={dest.id}
              className="rounded-md border p-4 space-y-3"
              style={{
                borderColor: color ? `${color}55` : undefined,
                backgroundColor: color ? `${color}08` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="gap-1.5"
                  style={{ color, borderColor: color ? `${color}55` : undefined }}
                >
                  <BaseIcon
                    name={(type?.attributes.icon as never) ?? "Circle"}
                    size={13}
                  />
                  {type?.attributes.name ?? "Destino"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => removeDestination(index)}
                >
                  <BaseIcon name="X" size={15} />
                </Button>
              </div>

              {code === "ftp" && (
                <FtpFields
                  config={(dest.config ?? {}) as Record<string, unknown>}
                  onChange={(config) => updateConfig(index, config)}
                />
              )}
              {code === "email" && (
                <EmailFields
                  config={(dest.config ?? {}) as Record<string, unknown>}
                  onChange={(config) => updateConfig(index, config)}
                />
              )}
              {code === "local" && (
                <p className="text-sm text-muted-foreground">
                  El archivo se guardará en el disco local del servidor.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FtpFields = ({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) => {
  const fields = [
    { key: "host", label: "IP / Host *", placeholder: "Ej: ftp.example.com" },
    { key: "port", label: "Puerto", placeholder: "21" },
    { key: "username", label: "Usuario *", placeholder: "Ej: ftp_user" },
    { key: "password", label: "Password *", placeholder: "••••••••" },
    { key: "path", label: "Ruta *", placeholder: "Ej: /reports/conciliaciones" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className="grid gap-1.5">
          <label className="text-sm font-medium">{f.label}</label>
          <Input
            type={f.key === "password" ? "password" : "text"}
            value={(config[f.key] as string) ?? ""}
            onChange={(e) => onChange({ ...config, [f.key]: e.target.value })}
            placeholder={f.placeholder}
          />
        </div>
      ))}
    </div>
  );
};

const EmailFields = ({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) => {
  const [draft, setDraft] = useState<string>("");
  const emails = Array.isArray(config.to) ? (config.to as string[]) : [];

  const addEmails = (raw: string) => {
    const parsed = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));
    if (parsed.length === 0) return;
    onChange({ ...config, to: [...new Set([...emails, ...parsed])] });
    setDraft("");
  };

  const removeEmail = (email: string) => {
    onChange({
      ...config,
      to: emails.filter((e) => e !== email),
    });
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Destinatarios *</label>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addEmails(draft);
              }
            }}
            onBlur={() => draft && addEmails(draft)}
            placeholder="Escribe un email y presiona Enter o coma"
            className="font-mono text-sm"
          />
          <Button type="button" variant="outline" onClick={() => addEmails(draft)}>
            Agregar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Separa múltiples emails con Enter o coma.
        </p>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1.5 px-2 py-1">
              <BaseIcon name="Mail" size={12} />
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="hover:text-red-500"
              >
                <BaseIcon name="X" size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Asunto (opcional)</label>
        <Input
          value={(config.subject as string) ?? ""}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="Ej: Conciliación diaria"
        />
      </div>
    </div>
  );
};
