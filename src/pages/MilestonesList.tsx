import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";

const statusDotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-foreground",
  overdue: "bg-destructive",
  in_review: "bg-accent",
  complete: "bg-success",
};

export default function MilestonesList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  const { role } = useRole();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-6 pt-10 pb-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate("/project/dashboard")} className="font-mono text-[14px] text-muted-foreground hover:text-foreground transition-colors">
              ←
            </button>
            <span className="font-mono text-[16px] text-muted-foreground">—</span>
          </div>
          <p className="font-mono text-[28px] tracking-tight text-foreground">
            {role === "contractor" ? t("navigation.my_tasks") : t("navigation.milestones")}
          </p>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">
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
              <button
                key={m.id}
                onClick={() => navigate(`/project/milestone/${m.id}`)}
                className="w-full flex items-center justify-between py-4 border-b border-border text-left group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-mono text-[18px] text-muted-foreground group-hover:text-foreground transition-opacity flex-shrink-0">
                    {String(m.position).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[14px] text-foreground truncate">{m.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {m.due_date ?? "no date"} · £{Number(m.payment_value ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotClass[m.status]}`} />
              </button>
            ))}
            {milestones.length === 0 && (
              <p className="font-mono text-[13px] text-muted-foreground mt-4">{t("milestone.no_milestones")}</p>
            )}
          </div>

          {role === "pm" && (
            <button
              onClick={() => navigate("/manual-milestone")}
              className="w-full mt-6 py-4 border border-border font-mono text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              {t("milestone.add_milestone")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
