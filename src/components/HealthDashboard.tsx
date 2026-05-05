import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";

type Milestone = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  payment_value: number | null;
  position: number;
};

type Health = "green" | "amber" | "red";

interface Props {
  milestones: Milestone[];
  needsApprovalCount: number;
}

/**
 * PM milestone health dashboard.
 * - Project-wide progress bar (% complete by milestone count)
 * - Traffic-light counts (green/amber/red)
 * - "Needs attention today" callouts: overdue, due ≤2 days, awaiting approval
 */
export function HealthDashboard({ milestones, needsApprovalCount }: Props) {
  const navigate = useNavigate();

  const { green, amber, red, percentComplete, attention } = useMemo(() => {
    const today = new Date();
    let g = 0, a = 0, r = 0;
    const attn: { id: string; name: string; reason: string; tone: Health }[] = [];

    for (const m of milestones) {
      let h: Health = "green";
      if (m.status === "complete") {
        h = "green";
      } else if (m.status === "overdue" || m.status === "disputed") {
        h = "red";
        attn.push({
          id: m.id,
          name: m.name,
          reason: m.status === "disputed" ? "disputed" : "overdue",
          tone: "red",
        });
      } else if (m.status === "in_review") {
        h = "amber";
        attn.push({ id: m.id, name: m.name, reason: "awaiting approval", tone: "amber" });
      } else if (m.due_date) {
        const days = differenceInDays(parseISO(m.due_date), today);
        if (days < 0) {
          h = "red";
          attn.push({ id: m.id, name: m.name, reason: "past due date", tone: "red" });
        } else if (days <= 2) {
          h = "amber";
          attn.push({
            id: m.id,
            name: m.name,
            reason: days === 0 ? "due today" : `due in ${days}d`,
            tone: "amber",
          });
        }
      }
      if (h === "green") g++;
      else if (h === "amber") a++;
      else r++;
    }

    const total = milestones.length;
    const completeCount = milestones.filter(m => m.status === "complete").length;
    const pct = total === 0 ? 0 : Math.round((completeCount / total) * 100);

    return { green: g, amber: a, red: r, percentComplete: pct, attention: attn };
  }, [milestones]);

  if (milestones.length === 0) return null;

  return (
    <div className="px-6 mt-4 space-y-3">
      {/* Project-wide progress */}
      <div className="bg-card rounded-3xl px-6 py-5">
        <div className="flex items-baseline justify-between">
          <p className="t-eyebrow">project progress</p>
          <p className="font-sans text-[28px] tracking-[-0.02em] text-foreground leading-none">
            {percentComplete}%
          </p>
        </div>
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-foreground transition-all rounded-full"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Traffic-light health summary */}
      <div className="grid grid-cols-3 gap-3">
        <HealthCell tone="green" label="on track" count={green} />
        <HealthCell tone="amber" label="watch" count={amber} />
        <HealthCell tone="red" label="at risk" count={red} />
      </div>

      {/* Needs attention today */}
      {attention.length > 0 && (
        <div className="bg-card rounded-3xl px-6 py-5">
          <p className="t-eyebrow mb-3">
            needs attention today ({attention.length})
          </p>
          <div className="flex flex-col">
            {attention.slice(0, 5).map((item, i) => (
              <button
                key={item.id}
                onClick={() => navigate(`/project/milestone/${item.id}`)}
                className={`w-full flex items-center justify-between py-3 text-left group ${
                  i !== Math.min(attention.length, 5) - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      item.tone === "red" ? "bg-destructive" : "bg-warning"
                    }`}
                  />
                  <p className="font-sans text-[14px] text-foreground truncate">{item.name}</p>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground flex-shrink-0 ml-3">
                  {item.reason}
                </p>
              </button>
            ))}
            {attention.length > 5 && (
              <p className="font-mono text-[10px] text-muted-foreground pt-3">
                +{attention.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCell({ tone, label, count }: { tone: Health; label: string; count: number }) {
  const dotClass =
    tone === "green" ? "bg-success" : tone === "amber" ? "bg-warning" : "bg-destructive";
  return (
    <div className="bg-card rounded-3xl px-4 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <p className="t-eyebrow">{label}</p>
      </div>
      <p className="font-sans text-[28px] text-foreground leading-none tracking-[-0.02em]">{count}</p>
    </div>
  );
}
