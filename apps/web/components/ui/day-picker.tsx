"use client";

interface DiasEjecucionFieldProps {
  value?: Record<number, boolean>;
  onChange?: (value: Record<number, boolean>) => void;
  disabled?: boolean;
}

export function DayPicker({
  value = {
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  },
  onChange,
  disabled = false,
}: DiasEjecucionFieldProps) {
  const diasSemana = ["L", "M", "M", "J", "V", "S", "D"];

  const handleToggle = (index: number) => {
    if (disabled || !onChange) return;

    const newValue = { ...value };
    newValue[index] = !newValue[index];
    onChange(newValue);
  };

  return (
    <div className="flex gap-1">
      {diasSemana.map((dia, index) => {
        const isActive = value[index] || false;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleToggle(index)}
            disabled={disabled}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              isActive
                ? "bg-foreground text-background"
                : "border-2 border-foreground text-foreground"
            } ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-110 active:scale-95 cursor-pointer"
            }`}
          >
            {dia}
          </button>
        );
      })}
    </div>
  );
}
