import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PaymentCertificate() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Dark top half */}
      <div className="bg-surface-dark px-6 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-surface-dark-muted mb-8">
          ← back
        </button>

        <p className="font-mono text-[44px] leading-none tracking-tight text-surface-dark-foreground">
          £11,000
        </p>
        <p className="font-sans text-[14px] text-surface-dark-muted mt-2">first fix — electrical and plumbing</p>

        <div className="w-full h-px bg-surface-dark-muted mt-6 mb-4" />

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-[11px] text-surface-dark-muted">project</span>
            <span className="font-mono text-[11px] text-surface-dark-foreground">kensington mews</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[11px] text-surface-dark-muted">approved by</span>
            <span className="font-mono text-[11px] text-surface-dark-foreground">anna p.</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[11px] text-surface-dark-muted">date</span>
            <span className="font-mono text-[11px] text-surface-dark-foreground">14 mar 2026</span>
          </div>
        </div>

        <p className="font-mono text-[10px] text-surface-dark-muted mt-6">CMT-2026-0314-006</p>
      </div>

      {/* Light bottom half */}
      <div className="flex-1 bg-background px-6 pt-8 pb-6 flex flex-col">
        <p className="font-sans text-[14px] text-muted-foreground">
          james r. will be notified via whatsapp
        </p>

        <div className="flex-1" />

        <Button variant="dark" size="full" onClick={() => navigate("/project/dashboard")}>
          <span className="font-sans text-[16px]">confirm and release payment</span>
        </Button>
      </div>
    </div>
  );
}
