import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const extractedMilestones = [
  { name: "site setup and demolition", value: "£8,000" },
  { name: "foundations and groundwork", value: "£15,000" },
  { name: "structural frame and roof", value: "£22,000" },
  { name: "first fix — electrical and plumbing", value: "£11,000" },
  { name: "plastering and drylining", value: "£9,000" },
  { name: "second fix and joinery", value: "£14,000" },
  { name: "decoration and finishing", value: "£7,000" },
  { name: "final inspection and handover", value: "£6,000" },
];

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [state, setState] = useState<"upload" | "loading" | "extracted">("upload");

  const handleUpload = () => {
    setState("loading");
    setTimeout(() => setState("extracted"), 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-8">upload contract</h1>

      <div className="flex-1">
        {state === "upload" && (
          <button
            onClick={handleUpload}
            className="w-full h-48 border border-dashed border-border flex flex-col items-center justify-center gap-2"
          >
            <p className="font-mono text-[13px] text-foreground">drop contract or JCT here</p>
            <p className="font-mono text-[11px] text-muted-foreground">pdf, doc, or image</p>
          </button>
        )}

        {state === "loading" && (
          <div className="flex items-center justify-center h-48">
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">reading document...</p>
          </div>
        )}

        {state === "extracted" && (
          <div className="space-y-0">
            {extractedMilestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                <span className="font-sans text-[14px] text-foreground">{m.name}</span>
                <span className="font-mono text-[13px] text-muted-foreground">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {state === "extracted" && (
        <Button variant="dark" size="full" onClick={() => navigate("/project/dashboard")}>
          <span className="font-sans text-[16px]">confirm milestones</span>
        </Button>
      )}
    </div>
  );
}
