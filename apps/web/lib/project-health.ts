import { Project, WorkItem } from "@/types/plane-types";

export type HealthStatus = "on_track" | "at_risk" | "off_track" | "paused";

export interface HealthBadgeInfo {
  status: HealthStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const HEALTH_CONFIG: Record<HealthStatus, HealthBadgeInfo> = {
  on_track: {
    status: "on_track",
    label: "On track",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  at_risk: {
    status: "at_risk",
    label: "At risk",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  off_track: {
    status: "off_track",
    label: "Off track",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    dotClass: "bg-red-500",
  },
  paused: {
    status: "paused",
    label: "Pausado",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

export function calculateProjectHealth(
  project: Project | null | undefined,
  workItems: WorkItem[]
): HealthBadgeInfo {
  if (!project) return HEALTH_CONFIG.on_track;
  if (project.is_archived) return HEALTH_CONFIG.paused;

  const total = workItems.length;
  if (total === 0) return HEALTH_CONFIG.on_track;

  const completed = workItems.filter(
    (w) => w.state?.group === "COMPLETED"
  ).length;

  const now = new Date().getTime();
  const overdue = workItems.filter((w) => {
    if (!w.target_date) return false;
    const isCompleted = w.state?.group === "COMPLETED" || w.state?.group === "CANCELLED";
    return !isCompleted && new Date(w.target_date).getTime() < now;
  }).length;

  const completionRate = completed / total;
  const overdueRatio = overdue / total;

  // Si no hay fechas definidas de proyecto, inferir con base en la tasa de atrasos
  if (!project.start_date || !project.target_date) {
    if (overdueRatio > 0.2) return HEALTH_CONFIG.off_track;
    if (overdueRatio > 0.05) return HEALTH_CONFIG.at_risk;
    return HEALTH_CONFIG.on_track;
  }

  const startDate = new Date(project.start_date).getTime();
  const targetDate = new Date(project.target_date).getTime();
  const totalDuration = targetDate - startDate;

  if (totalDuration <= 0) {
    if (overdueRatio > 0.2) return HEALTH_CONFIG.off_track;
    if (overdueRatio > 0.05) return HEALTH_CONFIG.at_risk;
    return HEALTH_CONFIG.on_track;
  }

  const timeElapsed = Math.min(1, Math.max(0, (now - startDate) / totalDuration));

  // Off track: mucho trabajo vencido o ritmo muy por detrás del tiempo transcurrido
  if (overdueRatio > 0.2 || completionRate < timeElapsed - 0.25) {
    return HEALTH_CONFIG.off_track;
  }

  // At risk
  if (overdueRatio > 0.05 || completionRate < timeElapsed - 0.1) {
    return HEALTH_CONFIG.at_risk;
  }

  return HEALTH_CONFIG.on_track;
}
