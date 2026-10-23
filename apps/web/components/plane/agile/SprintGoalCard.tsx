"use client";

import React, { useState } from "react";
import { Target, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SprintGoalCardProps {
  sprintGoal?: string | null;
  cycleId: string | number;
  canEdit?: boolean;
  onUpdateGoal?: (newGoal: string) => Promise<void>;
  className?: string;
}

export function SprintGoalCard({
  sprintGoal,
  cycleId,
  canEdit = false,
  onUpdateGoal,
  className,
}: SprintGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState(sprintGoal || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setGoal(sprintGoal || "");
  }, [sprintGoal]);

  const handleSave = async () => {
    if (!onUpdateGoal) return;
    try {
      setIsSaving(true);
      await onUpdateGoal(goal.trim());
      setIsEditing(false);
      toast.success("Objetivo del Sprint actualizado");
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar el objetivo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 border border-indigo-100 rounded-xl p-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
            <Target className="size-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Sprint Goal (Objetivo del Sprint)
              </span>
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 cursor-pointer"
                  title="Editar objetivo del sprint"
                >
                  <Edit2 className="size-3" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Define qué valor entregará el equipo al completar este sprint..."
                  className="text-xs h-8 bg-white"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Check className="size-3.5 mr-1" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    setGoal(sprintGoal || "");
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs md:text-sm font-medium text-slate-800 leading-relaxed">
                {sprintGoal ? (
                  sprintGoal
                ) : (
                  <span className="text-slate-400 italic">
                    Sin objetivo establecido. Define una meta clara para enfocar el trabajo del equipo.
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
