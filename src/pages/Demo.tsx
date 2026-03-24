import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TAGS = ["electrical", "consumer-unit", "ground-floor", "first-fix", "pass"];

const MILESTONES = [
  { num: "01", name: "Site setup and demolition",        status: "complete",     amount: "£8,000"  },
  { num: "02", name: "Foundations and groundwork",        status: "complete",     amount: "£15,000" },
  { num: "03", name: "Structural frame and roof",         status: "complete",     amount: "£22,000" },
  { num: "04", name: "First fix electrical",              status: "complete",     amount: "£11,000" },
  { num: "05", name: "Plastering and drylining",          status: "in_progress",  amount: "£9,000"  },
  { num: "06", name: "Second fix and joinery",            status: "pending",      amount: "£14,000" },
  { num: "07", name: "Decoration and finishing",          status: "pending",      amount: "£7,000"  },
  { num: "08", name: "Final inspection and handover",     status: "pending",      amount: "£6,000"  },
];

const statusDotColor: Record<string, string> = {
  complete:    "bg-[#3D7A5A]",
  in_progress: "bg-accent",
  pending:     "bg-muted-foreground",
};

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            i <= current ? "bg-foreground" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function PhotoPlaceholder() {
  return (
    <div
      className="bg-muted flex items-center justify-center mx-auto"
      style={{ width: 280, height: 280 }}
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        photo: consumer unit installed
      </span>
    </div>
  );
}

function StaticTags() {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {TAGS.map((tag) => (
        <span key={tag} className="font-mono text-[11px] text-accent underline">
          {tag}
        </span>
      ))}
    </div>
  );
}

// Step 0
function StepMilestone({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1">
        <p className="font-mono text-[96px] leading-none tracking-tight text-foreground">04</p>
        <p className="font-sans text-[22px] text-foreground mt-2">First Fix Electrical</p>
        <p className="font-mono text-[13px] text-muted-foreground mt-1">£11,000 · due 8 mar 2026</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          <span className="font-mono text-[12px] text-orange-500">overdue · +6 days</span>
        </div>
        <div className="border-t border-border mt-5 mb-5" />
        <p className="font-sans text-[14px] text-muted-foreground leading-relaxed">
          mark t. has been on site. he needs to submit evidence before the payment can be released.
        </p>
      </div>
      <button
        onClick={onNext}
        className="w-full bg-foreground text-background font-sans text-[16px] py-4"
      >
        see the submission →
      </button>
    </>
  );
}

// Step 1
function StepEvidence({ onNext }: { onNext: () => void }) {
  const [visibleTags, setVisibleTags] = useState<number>(0);

  useEffect(() => {
    setVisibleTags(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleTags(i);
      if (i >= TAGS.length) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex-1">
        <p className="font-mono text-[10px] text-muted-foreground mb-4">evidence submitted</p>
        <PhotoPlaceholder />
        <p className="font-mono text-[10px] text-muted-foreground mt-4 mb-2">ai tags generated</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag, i) => (
            <span
              key={tag}
              className="font-mono text-[11px] text-accent underline transition-opacity duration-300"
              style={{ opacity: i < visibleTags ? 1 : 0 }}
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-4">
          EVD-20260314-K7X2 · 51.5074° N, 0.1278° W
        </p>
      </div>
      <button
        onClick={onNext}
        className="w-full bg-foreground text-background font-sans text-[16px] py-4"
      >
        notify the PM →
      </button>
    </>
  );
}

// Step 2
function StepPMNotified({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1">
        <p className="font-sans text-[26px] text-foreground">PM notified</p>
        <p className="font-sans text-[15px] text-muted-foreground mt-3 leading-relaxed">
          anna p. received an alert. first fix electrical is ready for review.
        </p>
        <div className="mt-8 border border-border p-4 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-sans text-[14px] text-foreground">milestone in review</p>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">today 14:32</p>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full bg-foreground text-background font-sans text-[16px] py-4"
      >
        review evidence →
      </button>
    </>
  );
}

// Step 3
function StepReview({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1">
        <p className="font-mono text-[10px] text-muted-foreground mb-4">milestone 04 · in review</p>
        <PhotoPlaceholder />
        <StaticTags />
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full py-4 font-sans text-[16px] text-white"
          style={{ backgroundColor: "#3D7A5A" }}
        >
          approve milestone
        </button>
        <button
          className="w-full py-4 font-sans text-[16px] border"
          style={{ borderColor: "#C4622A", color: "#C4622A" }}
          disabled
        >
          reject
        </button>
      </div>
    </>
  );
}

// Step 4
function StepPaymentCert({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1">
        <p className="font-mono text-[10px] text-muted-foreground mb-4">payment certificate</p>
        <div className="bg-foreground text-background p-6" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[44px] leading-none">£11,000</p>
          <p className="font-sans text-[14px] mt-1" style={{ color: "#9ca3af" }}>
            First Fix Electrical
          </p>
          <div className="border-t border-background/20 my-4" />
          <div className="space-y-2">
            {[
              ["Project",      "14 Kensington Mews"],
              ["Approved by",  "anna p."],
              ["Date",         "14 Mar 2026"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="font-mono text-[11px]" style={{ color: "#9ca3af" }}>{label}</span>
                <span className="font-mono text-[11px] text-background">{value}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] mt-4" style={{ color: "#9ca3af" }}>
            CMT-2026-0314-004
          </p>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full bg-foreground text-background font-sans text-[16px] py-4"
      >
        view the project →
      </button>
    </>
  );
}

// Step 5
function StepProject() {
  const navigate = useNavigate();
  return (
    <>
      <div className="flex-1">
        <p className="font-mono text-[12px] text-muted-foreground">14 kensington mews</p>
        <p className="font-mono text-[13px] text-foreground mt-1">
          5 of 8 milestones complete · £56,000 released
        </p>
        <div className="mt-3 w-full h-1 bg-muted">
          <div className="h-1 bg-accent" style={{ width: "62%" }} />
        </div>

        <div className="mt-6 space-y-0">
          {MILESTONES.map((m) => (
            <div
              key={m.num}
              className="flex items-center justify-between py-3 border-b border-border"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[12px] text-muted-foreground">{m.num}</span>
                <span className="font-sans text-[14px] text-foreground">{m.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[12px] text-muted-foreground">{m.amount}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[m.status]}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-6 pt-6 text-center">
          <p className="font-sans text-[15px] text-foreground">
            every milestone verified. every payment certified.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => navigate("/auth")}
          className="w-full bg-foreground text-background font-sans text-[16px] py-4"
        >
          create your project
        </button>
        <a
          href="mailto:pietro@cemento.build"
          className="w-full border border-foreground text-foreground font-sans text-[16px] py-4 text-center block"
        >
          book a demo
        </a>
      </div>
    </>
  );
}

export default function Demo() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const next = () => setStep((s) => s + 1);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button
        onClick={() => navigate("/auth")}
        className="font-mono text-[11px] text-muted-foreground text-left mb-4 self-start"
      >
        ← exit
      </button>
      <ProgressDots current={step} total={6} />
      <div className="flex flex-col flex-1">
        {step === 0 && <StepMilestone onNext={next} />}
        {step === 1 && <StepEvidence onNext={next} />}
        {step === 2 && <StepPMNotified onNext={next} />}
        {step === 3 && <StepReview onNext={next} />}
        {step === 4 && <StepPaymentCert onNext={next} />}
        {step === 5 && <StepProject />}
      </div>
    </div>
  );
}
