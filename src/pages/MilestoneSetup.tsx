import { useNavigate } from "react-router-dom";

const options = [
  {
    label: "upload contract or JCT",
    description: "we'll extract milestones and payment values automatically",
    path: "/document-upload",
  },
  {
    label: "use a template",
    description: "choose from common UK construction project types",
    path: "/template-select",
  },
  {
    label: "add manually",
    description: "enter each milestone, date, and payment value by hand",
    path: "/manual-milestone",
  },
];

export default function MilestoneSetup() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-8">milestone setup</h1>

      <div className="flex-1">
        {options.map((opt) => (
          <button
            key={opt.path}
            onClick={() => navigate(opt.path)}
            className="w-full flex items-center justify-between py-5 border-b border-border text-left group"
          >
            <div>
              <p className="font-sans text-[16px] text-foreground">{opt.label}</p>
              <p className="font-mono text-[12px] text-muted-foreground mt-1">{opt.description}</p>
            </div>
            <span className="font-mono text-[18px] text-muted-foreground group-hover:text-foreground transition-colors">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
