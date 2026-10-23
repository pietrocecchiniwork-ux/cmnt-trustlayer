import { useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { IconArrowRight } from "@tabler/icons-react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useRole } from "@/contexts/RoleContext";

const dotClass: Record<string, string> = {
  pending: "bg-muted-foreground",
  in_progress: "bg-accent",
  in_review: "bg-accent",
  overdue: "bg-destructive",
  disputed: "bg-destructive",
  complete: "bg-success",
};

export function ProjectHomeHero() {
  const navigate = useNavigate();
  const { role } = useRole();
  const { currentProjectId } = useProjectContext();
  const { data: user } = useCurrentUser();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);

  if (!currentProjectId || milestones.length === 0) return null;

  const open = milestones.filter((m) => m.status !== "complete");
  const isLate = (m: (typeof milestones)[number]) =>
    m.status === "overdue" || (m.status !== "complete" && !!m.due_date && isPast(new Date(m.due_date)));
  const inReview = milestones.filter((m) => m.status === "in_review");
  const overdue = milestones.filter(isLate);
  const done = milestones.filter((m) => m.status === "complete").length;

  const byDue = (a: any, b: any) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  let action: { eyebrow: string; title: string; cta: string; go: () => void; tone: "accent" | "warn" | "ok" };

  if (role === "pm" && inReview.length > 0) {
    action = { eyebrow: "action required", title: `${inReview.length} milestone${inReview.length > 1 ? "s" : ""} waiting for your review`, cta: "review evidence", go: () => navigate(`/project/milestone/${inReview[0].id}`), tone: "accent" };
  } else if (role === "client" && done > 0) {
    action = { eyebrow: "action required", title: "Check completed stages and authorise payment", cta: "open payments", go: () => navigate("/project/payments"), tone: "accent" };
  } else {
    const mine = role === "pm" || role === "client" ? open : open.filter((m) => m.assigned_to === user?.id);
    const next = [...mine].sort(byDue)[0];
    action = next
      ? { eyebrow: isLate(next) ? "overdue" : "next up", title: next.name, cta: role === "contractor" || role === "trade" ? "submit evidence" : "open milestone", go: () => navigate(`/project/milestone/${next.id}`), tone: isLate(next) ? "warn" : "accent" }
      : { eyebrow: "all clear", title: "Nothing needs you right now", cta: "view milestones", go: () => navigate("/project/milestones"), tone: "ok" };
  }

  const toneClass = action.tone === "warn" ? "bg-destructive text-destructive-foreground" : action.tone === "ok" ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground";

  return (
    <section className="px-5 pt-20 space-y-3 max-w-2xl mx-auto">
      <button onClick={action.go} className={`w-full text-left rounded-3xl p-6 ${toneClass} transition-transform active:scale-[0.99]`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">{action.eyebrow}</p>
        <h2 className="font-sans text-[24px] leading-tight mt-2 tracking-[-0.01em]">{action.title}</h2>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-card text-foreground px-4 h-10 font-mono text-[11px] uppercase tracking-[0.08em]">
          {action.cta} <IconArrowRight size={14} />
        </span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "done", value: `${done}/${milestones.length}` },
          { label: "in review", value: inReview.length },
          { label: "overdue", value: overdue.length },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl bg-card p-4">
            <p className="font-mono text-[20px] text-foreground">{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 snap-x">
        {milestones.map((m) => (
          <button key={m.id} onClick={() => navigate(`/project/milestone/${m.id}`)} className="snap-start shrink-0 w-44 text-left rounded-3xl bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">{String(m.position).padStart(2, "0")}</span>
              <span className={`w-2 h-2 rounded-full ${dotClass[isLate(m) ? "overdue" : m.status] ?? "bg-muted-foreground"}`} />
            </div>
            <p className="font-sans text-[14px] text-foreground mt-3 line-clamp-2 min-h-[40px]">{m.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-2">
              {m.due_date ? format(new Date(m.due_date), "d MMM") : "no date"} · {m.status.replace("_", " ")}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
