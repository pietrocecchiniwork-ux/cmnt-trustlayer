import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { usePaymentCertificates, useMilestones } from "@/hooks/useSupabaseProject";

export default function PaymentsList() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: certificates = [], isLoading } = usePaymentCertificates(currentProjectId ?? undefined);

  const totalReleased = milestones
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-2">payments</h1>
      <p className="font-mono text-[13px] text-success mb-6">
        £{totalReleased.toLocaleString()} released
      </p>

      {isLoading && (
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      )}

      <div className="flex-1">
        {milestones.map((m) => {
          const isReleased = m.status === "complete";
          return (
            <button
              key={m.id}
              onClick={() => isReleased && navigate(`/project/payment-certificate/${m.id}`)}
              className="w-full flex items-center justify-between py-4 border-b border-border text-left"
            >
              <div>
                <p className="font-sans text-[14px] text-foreground">{m.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  £{Number(m.payment_value ?? 0).toLocaleString()}
                </p>
              </div>
              <span className={`font-mono text-[11px] ${isReleased ? "text-success" : "text-muted-foreground"}`}>
                {isReleased ? "released" : "pending"}
              </span>
            </button>
          );
        })}
        {milestones.length === 0 && !isLoading && (
          <p className="font-sans text-[14px] text-muted-foreground mt-4">no milestones yet</p>
        )}
      </div>
    </div>
  );
}
