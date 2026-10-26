import type { Task } from "@/hooks/useSupabaseProject";
import type { Tables } from "@/integrations/supabase/types";
import type { UserRole } from "@/contexts/RoleContext";

export function visibleHomeMilestones(milestones: Tables<"milestones">[], tasks: Task[], role: UserRole, userId?: string) {
  if (role === "pm" || role === "client") return milestones;
  if (!userId) return [];
  return milestones.filter(m => m.assigned_to === userId || tasks.some(t => t.milestone_id === m.id && t.assigned_to === userId));
}

export function releasedPayments(certificates: Pick<Tables<"payment_certificates">, "amount" | "payment_status">[]) {
  return certificates.filter(c => c.payment_status === "authorized").reduce((sum, c) => sum + Number(c.amount), 0);
}

export function homeDate(value?: string | null) {
  if (!value) return "No date set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date set" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

export const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(value);
