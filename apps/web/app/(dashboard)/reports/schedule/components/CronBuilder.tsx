"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DayPicker } from "@/components/ui/day-picker";
import { Badge } from "@/components/ui/badge";

type Frequency =
  | "minute"
  | "minutes"
  | "hour"
  | "hours"
  | "daily"
  | "weekly"
  | "weekInterval"
  | "monthly"
  | "yearly";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "minute", label: "Cada minuto" },
  { value: "minutes", label: "Cada X minutos" },
  { value: "hour", label: "Cada hora" },
  { value: "hours", label: "Cada X horas" },
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "weekInterval", label: "Cada X semanas" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
];

const MONTHS_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

// DayPicker usa índices 0..6 (Lun..Dom) -> cron estándar (Lun=1..Dom=0).
const DAY_INDEX_TO_CRON = [1, 2, 3, 4, 5, 6, 0];
const CRON_DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const WEEKDAY_TO_INDEX: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6, 7: 6,
};

interface Props {
  value?: string;
  onChange?: (cron: string) => void;
  everyNWeeks?: number | null;
  onEveryNWeeksChange?: (n: number | null) => void;
}

const CronBuilder = ({ value, onChange, everyNWeeks, onEveryNWeeksChange }: Props) => {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [time, setTime] = useState<string>("08:00");
  const [minutesInterval, setMinutesInterval] = useState<number>(5);
  const [hoursInterval, setHoursInterval] = useState<number>(2);
  const [days, setDays] = useState<Record<number, boolean>>({});
  const [nWeeks, setNWeeks] = useState<number>(2);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [months, setMonths] = useState<Record<number, boolean>>({});

  const emittedRef = useRef<string>("");

  const toMonthsCron = (map: Record<number, boolean>): string | null => {
    const sel = Object.entries(map)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .sort((a, b) => a - b);
    if (sel.length === 0) return null;
    return sel.join(",");
  };

  const toDowCron = (map: Record<number, boolean>): string | null => {
    const sel = Object.entries(map)
      .filter(([, v]) => v)
      .map(([k]) => DAY_INDEX_TO_CRON[Number(k)]);
    if (sel.length === 0) return null;
    const sorted = [...new Set(sel)].sort((a, b) => a - b);
    return sorted.join(",");
  };

  const cronExpression = useMemo(() => {
    const [hour = 8, minute = 0] = time.split(":").map(Number);

    switch (frequency) {
      case "minute":
        return "* * * * *";
      case "minutes":
        return `*/${Math.max(1, minutesInterval)} * * * *`;
      case "hour":
        return "0 * * * *";
      case "hours":
        return `0 */${Math.max(1, hoursInterval)} * * *`;
      case "daily":
        return `${minute} ${hour} * * *`;
      case "weekly": {
        const dow = toDowCron(days);
        return dow ? `${minute} ${hour} * * ${dow}` : "";
      }
      case "weekInterval": {
        const dow = toDowCron(days);
        return dow ? `${minute} ${hour} * * ${dow}` : "";
      }
      case "monthly":
        return `${minute} ${hour} ${dayOfMonth} * *`;
      case "yearly": {
        const monthsCron = toMonthsCron(months);
        return monthsCron ? `${minute} ${hour} ${dayOfMonth} ${monthsCron} *` : "";
      }
      default:
        return "";
    }
  }, [frequency, time, minutesInterval, hoursInterval, days, dayOfMonth, months]);

  const effectiveValue = value && value.length > 0 ? value : cronExpression;

  // Parsing de una cron existente (edición) para precargar los controles.
  const parseCron = (expr: string, nWeeksValue?: number | null) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return;
    const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

    const isStep = (p: string) => p.startsWith("*/");
    const stepValue = (p: string) => Number(p.replace("*/", ""));

    if (isStep(minPart) && hourPart === "*") {
      setFrequency("minutes");
      setMinutesInterval(stepValue(minPart) || 5);
      return;
    }
    if (minPart === "*" && hourPart === "*") {
      setFrequency("minute");
      return;
    }
    if (hourPart === "*" && minPart === "0") {
      setFrequency("hour");
      return;
    }
    if (isStep(hourPart) && minPart === "0") {
      setFrequency("hours");
      setHoursInterval(stepValue(hourPart) || 2);
      return;
    }

    const hour = Number(hourPart);
    const minute = Number(minPart);
    if (!Number.isNaN(minute) && !Number.isNaN(hour)) {
      setTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }

    if (dowPart !== "*") {
      const dowIndexes = dowPart.split(",").map(Number);
      const map: Record<number, boolean> = {};
      dowIndexes.forEach((d) => {
        const idx = WEEKDAY_TO_INDEX[d];
        if (idx !== undefined) map[idx] = true;
      });
      setDays(map);
      const isInterval = Number(nWeeksValue) > 1;
      setFrequency(isInterval ? "weekInterval" : "weekly");
      if (isInterval && nWeeksValue) setNWeeks(Number(nWeeksValue));
      return;
    }

    if (domPart !== "*") {
      const dom = Number(domPart);
      if (!Number.isNaN(dom)) setDayOfMonth(dom);

      if (monthPart !== "*") {
        const monthIndexes = monthPart.split(",").map(Number);
        const map: Record<number, boolean> = {};
        monthIndexes.forEach((m) => {
          if (m >= 1 && m <= 12) map[m] = true;
        });
        setMonths(map);
        setFrequency("yearly");
      } else {
        setFrequency("monthly");
      }
      return;
    }

    setFrequency("daily");
  };

  useEffect(() => {
    if (!value) return;
    if (value === emittedRef.current) return;
    parseCron(value, everyNWeeks);
  }, [value, everyNWeeks]);

  // Emite la expresión cron automáticamente cuando cambia (sin botón manual).
  useEffect(() => {
    if (!cronExpression) return;
    if (cronExpression === emittedRef.current) return;
    emittedRef.current = cronExpression;
    onChange?.(cronExpression);
  }, [cronExpression, onChange]);

  useEffect(() => {
    onEveryNWeeksChange?.(frequency === "weekInterval" ? nWeeks : null);
  }, [frequency, nWeeks, onEveryNWeeksChange]);

  const selectedDayLabels =
    frequency === "weekly" || frequency === "weekInterval"
      ? Object.entries(days)
          .filter(([, v]) => v)
          .map(([k]) => CRON_DAY_LABELS[Number(k)])
      : [];

  const showTime = ["daily", "weekly", "weekInterval", "monthly", "yearly"].includes(frequency);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-sm font-medium">Frecuencia</span>
        <Select
          value={frequency}
          onValueChange={(v) => setFrequency(v as Frequency)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {frequency === "minutes" && (
        <div className="grid gap-1.5 max-w-[160px]">
          <label className="text-sm font-medium">Cada cuántos minutos</label>
          <Input
            type="number"
            min={1}
            max={59}
            value={String(minutesInterval)}
            onChange={(e) => setMinutesInterval(Number(e.target.value) || 1)}
          />
        </div>
      )}

      {frequency === "hours" && (
        <div className="grid gap-1.5 max-w-[160px]">
          <label className="text-sm font-medium">Cada cuántas horas</label>
          <Input
            type="number"
            min={1}
            max={23}
            value={String(hoursInterval)}
            onChange={(e) => setHoursInterval(Number(e.target.value) || 1)}
          />
        </div>
      )}

      {showTime && (
        <div className="grid gap-1.5 max-w-[160px]">
          <label className="text-sm font-medium">Hora de ejecución</label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      )}

      {(frequency === "weekly" || frequency === "weekInterval") && (
        <div className="grid gap-2">
          <label className="text-sm font-medium">Días de la semana</label>
          <DayPicker value={days} onChange={setDays} />
          {selectedDayLabels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedDayLabels.join(", ")}
            </p>
          )}
        </div>
      )}

      {frequency === "weekInterval" && (
        <div className="grid gap-1.5 max-w-[180px]">
          <label className="text-sm font-medium">Cada cuántas semanas</label>
          <Input
            type="number"
            min={1}
            max={52}
            value={String(nWeeks)}
            onChange={(e) => setNWeeks(Number(e.target.value) || 1)}
          />
        </div>
      )}

      {(frequency === "monthly" || frequency === "yearly") && (
        <div className={frequency === "yearly" ? "grid gap-4 sm:grid-cols-2" : "grid gap-1.5 max-w-[160px]"}>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Día del mes</label>
            <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === "yearly" && (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Meses</label>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_OPTIONS.map((m) => {
                  const active = !!months[m.value];
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMonths((prev) => ({ ...prev, [m.value]: !prev[m.value] }))}
                      className={`text-xs rounded-md border px-2 py-1.5 transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {m.label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border bg-slate-50 p-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Expresión:</span>
        <Badge className="font-mono text-sm">{effectiveValue || cronExpression || "—"}</Badge>
      </div>
    </div>
  );
};

export default CronBuilder;