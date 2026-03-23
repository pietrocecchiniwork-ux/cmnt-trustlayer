import { useNavigate } from "react-router-dom";
import { useDemoProject } from "@/contexts/DemoProjectContext";

export default function PaymentsList() {
  const navigate = useNavigate();
  const { currentProject } = useDemoProject();

  const payments = [
    { milestone: "site setup and demolition", amount: 8000, status: "released", date: "12 jan 2026" },
    { milestone: "foundations and groundwork", amount: 15000, status: "released", date: "30 jan 2026" },
    { milestone: "structural frame and roof", amount: 22000, status: "released", date: "22 feb 2026" },
    { milestone: "first fix — electrical", amount: 11000, status: "pending", date: "—" },
  ];

  const totalReleased = payments.filter(p => p.status === "released").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-2">payments</h1>
      <p className="font-mono text-[28px] text-success mb-6">£{totalReleased.toLocaleString()} released</p>

      <div className="divider mb-4" />

      <div className="space-y-0">
        {payments.map((p, i) => (
          <button
            key={i}
            onClick={() => p.status === "released" && navigate("/project/payment-certificate/m1")}
            className="w-full flex items-center justify-between py-4 border-b border-border text-left"
          >
            <div>
              <p className="font-sans text-[14px] text-foreground">{p.milestone}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{p.date}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[14px] text-foreground">£{p.amount.toLocaleString()}</p>
              <p className={`font-mono text-[10px] ${p.status === "released" ? "text-success" : "text-muted-foreground"}`}>
                {p.status}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
