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

  const textColor = current.role === "ai" ? "text-white" : current.role === "client" ? "text-white" : "text-white";
  const mutedColor = current.role === "ai" ? "text-white/60" : "text-white/70";

  return (
    <div 
      className={`fixed inset-0 z-[100] ${current.bg} transition-colors duration-500 flex flex-col`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <button onClick={onClose} className={`font-mono text-[13px] ${mutedColor}`}>
          ← back to sign in
        </button>
        <span className={`font-mono text-[10px] ${mutedColor} uppercase tracking-widest`}>
          {step + 1}/{steps.length}
        </span>
      </div>

      {/* Role badge */}
      <div className="px-6 mb-2">
        <span className={`font-mono text-[10px] ${mutedColor} uppercase tracking-widest`}>
          viewing as: {current.roleLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <h1 className={`font-sans text-[28px] ${textColor} mb-3 leading-tight`}>
          {current.title}
        </h1>
        <p className={`font-sans text-[15px] ${mutedColor} mb-8`}>
          {current.description}
        </p>

        {/* Detail card */}
        <div className="bg-white/10 backdrop-blur-sm p-5 mb-8">
          {current.detail.map((line, i) => (
            <p key={i} className={`font-mono text-[12px] ${textColor} ${i > 0 ? "mt-2" : ""}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        <button
          onClick={handleNext}
          className="w-full bg-white text-[#1C1C1A] font-sans text-[15px] font-medium py-4 transition-transform active:scale-[0.98]"
        >
          {isLast ? "sign in to get started" : current.cta}
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
