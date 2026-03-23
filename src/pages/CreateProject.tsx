import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CreateProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    startDate: "",
    endDate: "",
    paymentMode: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/")} className="font-mono text-[13px] text-muted-foreground">
          ← back
        </button>
        <span className="font-mono text-[13px] text-muted-foreground">{step} / 3</span>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-8">new project</h1>
            <div className="space-y-6">
              <input
                type="text"
                placeholder="project name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="underline-input"
              />
              <input
                type="text"
                placeholder="address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="underline-input"
              />
              <input
                type="date"
                placeholder="start date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="underline-input"
              />
              <input
                type="date"
                placeholder="end date"
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                className="underline-input"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-8">payment settings</h1>
            <div className="flex items-center justify-between py-4">
              <div className="flex-1 pr-4">
                <p className="font-sans text-[16px] text-foreground">release payments on milestone completion</p>
                <p className="font-mono text-[12px] text-muted-foreground mt-1">certificates generated automatically</p>
              </div>
              <button
                onClick={() => updateField("paymentMode", !formData.paymentMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  formData.paymentMode ? "bg-accent" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-background rounded-full transition-transform ${
                    formData.paymentMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-sans text-[22px] text-foreground mb-8">confirm project</h1>
            <div className="space-y-4">
              <div className="py-3 border-b border-border">
                <p className="font-mono text-[10px] text-muted-foreground">name</p>
                <p className="font-sans text-[16px] text-foreground mt-1">{formData.name || "—"}</p>
              </div>
              <div className="py-3 border-b border-border">
                <p className="font-mono text-[10px] text-muted-foreground">address</p>
                <p className="font-sans text-[16px] text-foreground mt-1">{formData.address || "—"}</p>
              </div>
              <div className="py-3 border-b border-border">
                <p className="font-mono text-[10px] text-muted-foreground">dates</p>
                <p className="font-sans text-[16px] text-foreground mt-1">{formData.startDate} → {formData.endDate}</p>
              </div>
              <div className="py-3 border-b border-border">
                <p className="font-mono text-[10px] text-muted-foreground">payment mode</p>
                <p className="font-sans text-[16px] text-foreground mt-1">{formData.paymentMode ? "auto-release on approval" : "manual"}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <Button
        variant="dark"
        size="full"
        onClick={() => {
          if (step < 3) setStep(step + 1);
          else navigate("/invite-team");
        }}
      >
        <span className="font-sans text-[16px]">{step < 3 ? "next" : "create project"}</span>
      </Button>
    </div>
  );
}
