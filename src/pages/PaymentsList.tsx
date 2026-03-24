import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { usePaymentCertificates, useMilestones } from "@/hooks/useSupabaseProject";
import { DitheredCircle } from "@/components/DitheredCircle";

export default function PaymentsList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: certificates = [], isLoading } = usePaymentCertificates(currentProjectId ?? undefined);

  const totalReleased = milestones
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  const totalBudget = milestones
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  return (
    <div className="min-h-screen screen-dark">
     <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[14px] text-surface-dark-foreground/40">←</span>
          <span className="font-mono text-[16px] text-surface-dark-foreground/40">—</span>
        </div>
      </div>

      {/* Dithered payment circle */}
      <div className="flex justify-center py-8 text-surface-dark-foreground">
        <DitheredCircle
          size={220}
          label="released"
          value={`£${(totalReleased / 1000).toFixed(0)}k`}
          sublabel="total balance"
        />
      </div>

      {isLoading && (
        <div className="px-6">
          <p className="font-mono text-[13px] text-surface-dark-foreground/40 animate-pulse">loading...</p>
        </div>
      )}

      {/* Payment rows */}
      <div className="flex-1 px-6 pb-6">
        {milestones.map((m) => {
          const isReleased = m.status === "complete";
          return (
            <button
              key={m.id}
              onClick={() => isReleased && navigate(`/project/payment-certificate/${m.id}`)}
              className="w-full flex items-center justify-between py-4 border-b border-surface-dark-foreground/10 text-left group"
            >
              <div>
                <p className="font-mono text-[13px] text-surface-dark-foreground group-hover:opacity-100 transition-opacity">
                  {m.name?.toLowerCase()}
                </p>
                <p className="font-mono text-[11px] text-surface-dark-foreground/40">
                  £{Number(m.payment_value ?? 0).toLocaleString()}
                </p>
              </div>
              <span className={`font-mono text-[10px] ${isReleased ? "text-success" : "text-surface-dark-foreground/30"}`}>
                {isReleased ? "released" : "pending"}
              </span>
            </button>
          );
        })}
        {milestones.length === 0 && !isLoading && (
          <p className="font-mono text-[13px] text-surface-dark-foreground/40 mt-4">no milestones yet</p>
        )}
      </div>

      {/* Bottom tabs */}
      <div className="px-6 pb-6">
        <div className="flex justify-around">
          <span className="font-mono text-[12px] text-surface-dark-foreground/30">balance</span>
          <span className="font-mono text-[12px] text-surface-dark-foreground/30">budget</span>
          <span className="font-mono text-[12px] text-surface-dark-foreground border-b border-surface-dark-foreground pb-0.5">expenses</span>
        </div>
      </div>
      </div>
    </div>
  );
}
