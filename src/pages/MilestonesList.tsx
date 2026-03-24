import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { MilestoneFlipCard } from "@/components/MilestoneFlipCard";
import { useTranslation } from "react-i18next";

export default function MilestonesList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { role } = useRole();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen screen-dark">
        <p className="font-mono text-[13px] opacity-40 animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen screen-dark">
     <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[14px] opacity-40">←</span>
          <span className="font-mono text-[16px] opacity-40">—</span>
        </div>
        <p className="font-mono text-[28px] tracking-tight">
          {role === "contractor" ? t("navigation.my_tasks") : t("navigation.milestones")}
        </p>
        <p className="font-mono text-[12px] opacity-40 mt-1">
          {t("milestone.items_complete", {
            count: milestones.length,
            done: milestones.filter(m => m.status === "complete").length,
          })}
        </p>
      </div>

      {/* Milestone list */}
      <div className="flex-1 px-6 pb-6">
        <div className="space-y-0">
          {milestones.map((m) => (
            <MilestoneFlipCard key={m.id} milestone={m} />
          ))}
          {milestones.length === 0 && (
            <p className="font-mono text-[13px] opacity-40 mt-4">{t("milestone.no_milestones")}</p>
          )}
        </div>

        {role === "pm" && (
          <button
            onClick={() => navigate("/manual-milestone")}
            className="w-full mt-6 py-4 border border-surface-dark-foreground/20 font-mono text-[13px] text-surface-dark-foreground/60 hover:text-surface-dark-foreground hover:border-surface-dark-foreground/40 transition-colors"
          >
            {t("milestone.add_milestone")}
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
