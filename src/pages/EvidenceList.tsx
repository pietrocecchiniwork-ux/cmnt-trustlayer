import { useDemoProject } from "@/contexts/DemoProjectContext";

export default function EvidenceList() {
  const { currentProject } = useDemoProject();

  const allEvidence = [
    { milestone: "first fix — electrical", submitter: "mark t.", timestamp: "14 mar 2026 · 09:42", tags: ["plumbing", "kitchen"] },
    { milestone: "first fix — electrical", submitter: "sarah k.", timestamp: "13 mar 2026 · 16:18", tags: ["electrical", "ground floor"] },
    { milestone: "structural frame", submitter: "mark t.", timestamp: "18 feb 2026 · 10:22", tags: ["steel", "frame"] },
    { milestone: "foundations", submitter: "mark t.", timestamp: "25 jan 2026 · 14:05", tags: ["concrete", "excavation"] },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">evidence</h1>

      <div className="space-y-4">
        {allEvidence.map((e, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-border">
            <div className="w-[44px] h-[44px] bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[14px] text-foreground">{e.submitter}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{e.milestone}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{e.timestamp}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                {e.tags.map((tag, j) => (
                  <span key={j} className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
