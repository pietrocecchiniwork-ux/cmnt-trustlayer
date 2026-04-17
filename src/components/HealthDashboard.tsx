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
    <div className="px-6 mt-6">
      {/* Project-wide progress bar */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            project progress
          </p>
          <p className="font-mono text-[12px] text-foreground">{percentComplete}%</p>
        </div>
        <div className="h-1 w-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Traffic-light health summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <HealthCell tone="green" label="on track" count={green} />
        <HealthCell tone="amber" label="watch" count={amber} />
        <HealthCell tone="red" label="at risk" count={red} />
      </div>

      {/* Needs attention today */}
      {attention.length > 0 && (
        <div className="mb-2">
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">
            needs attention today ({attention.length})
          </p>
          <div className="space-y-1.5">
            {attention.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/project/milestone/${item.id}`)}
                className="w-full flex items-center justify-between py-2 border-b border-border text-left group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      item.tone === "red" ? "bg-destructive" : "bg-warning"
                    }`}
                  />
                  <p className="font-sans text-[13px] text-foreground truncate">{item.name}</p>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground flex-shrink-0 ml-3">
                  {item.reason}
                </p>
              </button>
            ))}
            {attention.length > 5 && (
              <p className="font-mono text-[10px] text-muted-foreground pt-2">
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
    <div className="border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="font-mono text-[24px] text-foreground leading-none">{count}</p>
    </div>
  );
}
