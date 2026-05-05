import { useState, useRef, useEffect } from "react";

type Role = "pm" | "contractor" | "ai" | "client" | null;

interface Slide {
  bg: string;
  text: "light" | "dark";
  role: Role;
  roleLabel?: string;
  dotColor?: string;
  headline: string;
  subtitle?: string;
  dataCardBg?: string;
  data?: string;
  outcome?: { text: string; tone: "red" | "green" };
  cta?: string;
  ctaTone?: "black" | "white";
  isFinal?: boolean;
}

const slides: Slide[] = [
  {
    bg: "#1A1A1A",
    text: "light",
    role: null,
    headline: "this is how construction works today.",
    subtitle: "a £280k rear extension. first fix complete.",
    dataCardBg: "rgba(255,255,255,0.06)",
    data: `contractor:  "all done mate 👍"
             IMG_4821.jpg attached

owner:       "looks good"
             09:14 ✓✓

— 3 weeks later —

building control: "consumer unit placement
                   does not meet regs"

owner:       "but you said it was done"
contractor:  "i said it looked done"`,
    outcome: { text: "RESULT: £9,200 rework · 6-week delay · dispute ongoing", tone: "red" },
    cta: "see what changes →",
    ctaTone: "black",
  },
  {
    bg: "#111111",
    text: "light",
    role: "ai",
    roleLabel: "AI ANALYSIS",
    dotColor: "#FFFFFF",
    headline: "verifying evidence",
    subtitle: "cemento analyses 3 photos against the milestone checklist",
    dataCardBg: "rgba(255,255,255,0.08)",
    data: `✓  work type: electrical — matched
✓  trade: electrician — verified
✓  location: ground floor — consistent
✓  stage: first fix — correct
△  condition: consumer unit — needs attention`,
    outcome: { text: "4 of 5 checks passed — 1 condition flag raised before payment", tone: "green" },
    cta: "flag sent to project manager →",
    ctaTone: "white",
  },
  {
    bg: "#C1531E",
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: "#FFFFFF",
    headline: "approve milestone",
    subtitle: "anna reviews the evidence and AI assessment",
    dataCardBg: "rgba(255,255,255,0.15)",
    data: `milestone: first fix electrical & plumbing
photos verified: 3
AI flags: 1 — consumer unit placement
checklist: 4/5 items evidenced

recommendation: approve with note`,
    cta: "approve & generate certificate →",
    ctaTone: "black",
  },
  {
    bg: "#C1531E",
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: "#FFFFFF",
    headline: "certificate issued",
    subtitle: "a tamper-proof payment record. generated in seconds.",
    dataCardBg: "rgba(255,255,255,0.15)",
    data: `certificate:  CMT-2026-0308-A7F2
milestone:    first fix electrical & plumbing
evidence:     3 photos · 1 voice note · GPS verified
AI score:     4/5 · 1 condition flag noted
approved by:  anna p. (PM) · 08 mar 2026 · 14:32`,
    cta: "client authorises payment →",
    ctaTone: "black",
  },
  {
    bg: "#3A6B47",
    text: "light",
    role: "client",
    roleLabel: "CLIENT",
    dotColor: "#FFFFFF",
    headline: "authorise payment",
    subtitle: "james sees the verified certificate and releases funds",
    dataCardBg: "rgba(255,255,255,0.15)",
    data: `certificate:  CMT-2026-0308-A7F2
milestone:    first fix electrical & plumbing
amount:       £11,000
approved by:  anna p. (PM)
status:       awaiting client authorisation`,
    outcome: { text: "RESULT: £11,000 released · 0 disputes · verified in 4 minutes", tone: "green" },
    cta: "release payment →",
    ctaTone: "black",
  },
  {
    bg: "#F5F3EE",
    text: "dark",
    role: null,
    headline: "every project.\nevery milestone.\nverified.",
    subtitle: "3 roles. 1 source of truth. no disputes.",
    isFinal: true,
  },
];

const SWIPE_THRESHOLD = 50;

export function DemoWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = slides[step];
  const isLight = current.text === "light";
  const total = slides.length;

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleNext = () => {
    if (step < total - 1) setStep((s) => s + 1);
  };
  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const d = touchStartX.current - touchEndX.current;
    if (d > SWIPE_THRESHOLD) handleNext();
    else if (d < -SWIPE_THRESHOLD) handlePrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const mutedTextColor = isLight ? "text-white/60" : "text-foreground/60";
  const headlineColor = isLight ? "text-white" : "text-foreground";

  return (
    <div
      className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-full bg-secondary hover:bg-secondary/80 transition-colors font-mono text-[11px] text-foreground"
        >
          ← sign in
        </button>
        <span className="h-9 px-4 inline-flex items-center rounded-full bg-secondary font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
          {step + 1}/{total}
        </span>
      </div>

      {/* Static tagline above carousel */}
      <p className="text-center font-sans text-[14px] md:text-[15px] text-foreground/55 px-6 pb-3 lowercase">
        cemento turns site photos into verified payment certificates.
      </p>

      {/* Card */}
      <div className="flex-1 flex flex-col px-4 min-h-0">
        <div
          className="rounded-3xl p-6 flex-1 flex flex-col transition-colors duration-500 overflow-hidden"
          style={{ backgroundColor: current.bg }}
        >
          {/* Role pill */}
          {current.role && (
            <div className="inline-flex self-start items-center gap-2 mb-5">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, backgroundColor: current.dotColor }}
              />
              <span className={`font-mono text-[11px] tracking-[0.18em] uppercase ${isLight ? "text-white/85" : "text-foreground/80"}`}>
                {current.roleLabel}
              </span>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            <h1 className={`font-sans tracking-[-0.01em] leading-[1.1] mb-3 lowercase ${headlineColor} ${current.isFinal ? "text-[34px] md:text-[42px]" : "text-[26px] md:text-[30px]"}`}>
              {current.headline.split("\n").map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
            {current.subtitle && (
              <p className={`font-sans text-[14px] mb-5 leading-relaxed ${mutedTextColor}`}>
                {current.subtitle}
              </p>
            )}

            {current.data && (
              <div
                className="rounded-2xl p-4 overflow-auto"
                style={{ backgroundColor: current.dataCardBg }}
              >
                <pre className={`font-mono text-[12px] md:text-[13px] leading-relaxed whitespace-pre-wrap ${isLight ? "text-white" : "text-foreground"}`}>
{current.data}
                </pre>
              </div>
            )}

            {current.outcome && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 font-mono text-[11px] tracking-wider uppercase ${
                  current.outcome.tone === "red"
                    ? "bg-red-500/15 text-red-200"
                    : "bg-emerald-400/15 text-emerald-100"
                }`}
                style={
                  !isLight && current.outcome.tone === "green"
                    ? { backgroundColor: "rgba(58,107,71,0.12)", color: "#2F5638" }
                    : undefined
                }
              >
                {current.outcome.text}
              </div>
            )}

            {current.isFinal && <div className="flex-1" />}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {slides.map((_, i) => {
              const active = i === step;
              const dotBase = isLight ? "bg-white" : "bg-foreground";
              return (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    active ? `w-5 ${dotBase}` : `w-1.5 ${dotBase} opacity-40`
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-6 space-y-2">
        {current.isFinal ? (
          <>
            <button
              onClick={onClose}
              className="w-full h-12 bg-foreground text-background rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.98]"
            >
              sign in to get started →
            </button>
            <button
              onClick={() => setStep(0)}
              className="w-full h-12 bg-transparent border border-foreground/25 text-foreground rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.98]"
            >
              watch the full demo
            </button>
            <p className="text-center font-mono text-[11px] text-foreground/50 pt-1">
              used on projects from £80k to £500k across the UK
            </p>
          </>
        ) : (
          <button
            onClick={handleNext}
            className={`w-full h-12 rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.96] ${
              current.ctaTone === "white"
                ? "bg-white text-[#111111]"
                : "bg-foreground text-background"
            }`}
          >
            {current.cta}
          </button>
        )}
      </div>
    </div>
  );
}
