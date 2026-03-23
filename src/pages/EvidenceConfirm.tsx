import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const aiTags = [
  { label: "work type", value: "rough-in" },
  { label: "trade", value: "plumbing" },
  { label: "location", value: "kitchen" },
  { label: "stage", value: "first fix" },
  { label: "condition", value: "good" },
  { label: "element", value: "pipework" },
];

export default function EvidenceConfirm() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      {/* Photo placeholder */}
      <div className="w-full aspect-square bg-secondary flex items-center justify-center mb-6">
        <p className="font-mono text-[13px] text-muted-foreground">photo captured</p>
      </div>

      {/* AI tags */}
      <p className="font-mono text-[10px] text-muted-foreground mb-3">ai tags</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
        {aiTags.map((tag) => (
          <span key={tag.label} className="font-mono text-[11px] text-accent border-b border-accent/40 pb-0.5">
            {tag.value}
          </span>
        ))}
      </div>

      {/* Optional note */}
      <input
        type="text"
        placeholder="add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="underline-input mb-6"
      />

      <div className="flex-1" />

      <Button variant="dark" size="full" onClick={() => navigate("/project/submission-confirmed")}>
        <span className="font-sans text-[16px]">submit</span>
      </Button>
    </div>
  );
}
