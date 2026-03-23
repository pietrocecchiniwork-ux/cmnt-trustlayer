import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ManualMilestone() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    paymentValue: "",
    role: "contractor",
    evidenceDescription: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const roles = ["pm", "contractor", "trade", "client"];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-8">add milestone</h1>

      <div className="flex-1 space-y-6">
        <input
          type="text"
          placeholder="milestone name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="underline-input"
        />
        <input
          type="date"
          placeholder="due date"
          value={formData.dueDate}
          onChange={(e) => updateField("dueDate", e.target.value)}
          className="underline-input"
        />
        <div className="relative">
          <span className="absolute left-0 top-3 font-mono text-[16px] text-muted-foreground">£</span>
          <input
            type="number"
            placeholder="payment value"
            value={formData.paymentValue}
            onChange={(e) => updateField("paymentValue", e.target.value)}
            className="underline-input pl-4"
          />
        </div>

        {/* Role selector */}
        <div>
          <p className="font-mono text-[10px] text-muted-foreground mb-2">assigned role</p>
          <div className="flex border-b border-border">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => updateField("role", r)}
                className={`flex-1 py-3 font-mono text-[12px] text-center transition-colors ${
                  formData.role === r ? "text-accent border-b-2 border-accent" : "text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="describe required evidence"
          value={formData.evidenceDescription}
          onChange={(e) => updateField("evidenceDescription", e.target.value)}
          className="underline-input min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-3">
        <Button variant="dark" size="full" onClick={() => navigate("/project/dashboard")}>
          <span className="font-sans text-[16px]">save milestone</span>
        </Button>
        <Button variant="outline" size="full" onClick={() => {
          setFormData({ name: "", dueDate: "", paymentValue: "", role: "contractor", evidenceDescription: "" });
        }}>
          <span className="font-sans text-[16px]">save and add another</span>
        </Button>
      </div>
    </div>
  );
}
