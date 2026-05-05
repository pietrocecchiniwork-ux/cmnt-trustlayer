import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface Step {
  role: "pm" | "contractor" | "client" | "ai";
  bg: string;
  roleLabel: string;
  title: string;
  description: string;
  detail: string[];
  cta: string;
}

const SWIPE_THRESHOLD = 50;

const steps: Step[] = [
  {
    role: "pm",
    bg: "bg-[#C4622A]",
    roleLabel: "project manager",
    title: "set up milestone",
    description: "anna creates \"first fix electrical\" and assigns it to mark",
    detail: [
      "milestone: first fix electrical & plumbing",
      "due: 8 mar 2026",
      "payment: £11,000",
      "assigned to: mark t. (contractor)",
    ],
    cta: "assign to contractor →",
  },
  {
    role: "contractor",
    bg: "bg-[#2563EB]",
    roleLabel: "contractor",
    title: "view assigned work",
    description: "mark sees the milestone on his dashboard as his next task",
    detail: [
      "⚡ first fix electrical & plumbing",
      "status: in progress",
      "due: 8 mar 2026 — 4 days left",
      "5 checklist items to complete",
    ],
    cta: "submit evidence →",
  },
  {
    role: "contractor",
    bg: "bg-[#2563EB]",
    roleLabel: "contractor",
    title: "capture evidence",
    description: "mark photographs completed wiring and plumbing rough-in",
    detail: [
      "📸  3 photos captured",
      "🎤  voice note: \"all cables run, consumer unit fitted\"",
      "📍  GPS: 14 Kensington Mews, W8 4PT",
    ],
    cta: "submit for review →",
  },
  {
    role: "ai",
    bg: "bg-[#1C1C1A]",
    roleLabel: "ai analysis",
    title: "verifying evidence",
    description: "cemento analyses photos against the milestone checklist",
    detail: [
      "✓  work type: electrical — matched",
      "✓  trade: electrician — verified",
      "✓  location: ground floor — consistent",
      "✓  stage: first fix — correct",
      "⚠  condition: consumer unit — needs attention",
    ],
    cta: "send to PM for approval →",
  },
  {
    role: "pm",
    bg: "bg-[#C4622A]",
    roleLabel: "project manager",
    title: "approve milestone",
    description: "anna reviews the evidence and AI assessment",
    detail: [
      "3 photos verified by AI",
      "1 condition flag: consumer unit placement",
      "checklist: 4/5 items evidenced",
      "recommendation: approve with note",
    ],
    cta: "approve & generate certificate →",
  },
  {
    role: "client",
    bg: "bg-[#3D7A5A]",
    roleLabel: "client",
    title: "authorise payment",
    description: "james sees the completed milestone and payment certificate",
    detail: [
      "certificate: CMT-2026-0308-A7F2",
      "milestone: first fix electrical & plumbing",
      "amount: £11,000",
      "approved by: anna p. (PM)",
    ],
    cta: "release payment →",
  },
];

export function DemoWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = steps[step];
  const isLast = step === steps.length - 1;
  
  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStep((s) => s + 1);
  };

  const handlePrevious = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className={`fixed inset-0 z-[100] ${current.bg} transition-colors duration-500 flex flex-col text-white`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-full bg-white/15 hover:bg-white/25 transition-colors font-mono text-[11px]"
        >
          ← sign in
        </button>
        <span className="h-9 px-4 inline-flex items-center rounded-full bg-white/15 font-mono text-[11px] tracking-widest uppercase">
          {step + 1}/{steps.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-4">
        <div className="bg-card text-foreground rounded-3xl p-6 flex-1 flex flex-col">
          <span className="t-eyebrow">viewing as · {current.roleLabel}</span>

          <div className="mt-5 flex-1 flex flex-col">
            <h1 className="font-sans text-[26px] tracking-[-0.01em] leading-tight mb-2">
              {current.title}
            </h1>
            <p className="font-sans text-[14px] text-muted-foreground mb-6 leading-relaxed">
              {current.description}
            </p>

            <div className="rounded-2xl bg-secondary p-4 space-y-2">
              {current.detail.map((line, i) => (
                <p key={i} className="font-mono text-[12px] text-foreground leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-6 mb-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-6">
        <button
          onClick={handleNext}
          className="w-full h-12 bg-white text-[#1C1C1A] rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.98]"
        >
          {isLast ? "sign in to get started" : current.cta}
        </button>
      </div>
    </div>
  );
}
