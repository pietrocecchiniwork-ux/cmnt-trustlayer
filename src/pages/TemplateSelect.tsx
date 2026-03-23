import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const templates = [
  { name: "full refurbishment", milestones: 8 },
  { name: "new build", milestones: 10 },
  { name: "extension", milestones: 6 },
  { name: "loft conversion", milestones: 5 },
  { name: "kitchen and bath", milestones: 4 },
  { name: "structural only", milestones: 3 },
  { name: "commercial fit-out", milestones: 7 },
  { name: "listed building", milestones: 6 },
];

export default function TemplateSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-6">choose a template</h1>

      <div className="flex-1 grid grid-cols-2 gap-3">
        {templates.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setSelected(i)}
            className={`text-left p-4 border border-border transition-colors ${
              selected === i ? "border-l-4 border-l-accent" : ""
            }`}
          >
            <p className="font-sans text-[15px] text-foreground">{t.name}</p>
            <p className="font-mono text-[12px] text-muted-foreground mt-1">{t.milestones} milestones</p>
          </button>
        ))}
      </div>

      <Button
        variant="dark"
        size="full"
        className="mt-6"
        disabled={selected === null}
        onClick={() => navigate("/project/dashboard")}
      >
        <span className="font-sans text-[16px]">use this template</span>
      </Button>
    </div>
  );
}
