import { useState, useRef, useEffect, ReactNode } from "react";

type Role = "pm" | "contractor" | "ai" | "client" | null;
type CardKind = "pm-milestones" | "contractor-checklist" | "evidence-sources" | "ai-analysis" | "pm-approval" | "client-payment";

interface Slide {
  bg: string;
  text: "light" | "dark";
  role: Role;
  roleLabel?: string;
  dotColor?: string;
  headline: string;
  subtitle?: string;
  card?: CardKind;
  contextLabel?: string;
  cta: string;
  ctaTone: "black" | "white";
  isFinal?: boolean;
}

const slides: Slide[] = [
  {
    bg: "#C1531E",
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: "#FFFFFF",
    headline: "every milestone, one source of truth.",
    subtitle: "anna runs a £280k rear extension. each milestone gates a payment.",
    card: "pm-milestones",
    contextLabel: "6 milestones · 2 verified · 1 in progress",
    cta: "see how a milestone gets verified →",
    ctaTone: "black",
  },
  {
    bg: "#1F3A5C",
    text: "light",
    role: "contractor",
    roleLabel: "CONTRACTOR",
    dotColor: "#60A5FA",
    headline: "the job, before submitting evidence.",
    subtitle: "tom needs to mark the milestone complete and capture proof.",
    card: "contractor-checklist",
    contextLabel: "first fix electrical · day 12 of 14",
    cta: "submit evidence →",
    ctaTone: "white",
  },
  {
    bg: "#1A1A1A",
    text: "light",
    role: "contractor",
    roleLabel: "CONTRACTOR",
    dotColor: "#60A5FA",
    headline: "evidence captured on site.",
    subtitle: "photos, voice note and gps — pulled in from the tools tom already uses.",
    card: "evidence-sources",
    contextLabel: "captured 14:29 — 14:32 · 8 mar 2026",
    cta: "send for verification →",
    ctaTone: "white",
  },
  {
    bg: "#111111",
    text: "light",
    role: "ai",
    roleLabel: "AI ANALYSIS",
    dotColor: "#FFFFFF",
    headline: "verifying against the milestone.",
    subtitle: "cemento checks the evidence against riba stage and the project checklist.",
    card: "ai-analysis",
    contextLabel: "analysis completed in 6 seconds",
    cta: "send result to project manager →",
    ctaTone: "white",
  },
  {
    bg: "#C1531E",
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: "#FFFFFF",
    headline: "approve with one tap.",
    subtitle: "anna sees the verified evidence, the AI flag and the recommendation.",
    card: "pm-approval",
    contextLabel: "decision logged · certificate generated",
    cta: "release to client →",
    ctaTone: "black",
  },
  {
    bg: "#3A6B47",
    text: "light",
    role: "client",
    roleLabel: "CLIENT",
    dotColor: "#FFFFFF",
    headline: "authorise payment.",
    subtitle: "james sees the certificate, the evidence and where the money sits.",
    card: "client-payment",
    contextLabel: "verified in 4 minutes · 0 disputes",
    cta: "release £11,000 →",
    ctaTone: "black",
  },
  {
    bg: "#F5F3EE",
    text: "dark",
    role: null,
    headline: "every party informed.\nevery payment justified.\nevery project on record.",
    cta: "sign in to get started →",
    ctaTone: "black",
    isFinal: true,
  },
];

const SWIPE_THRESHOLD = 50;

// ---------- Card subcomponents ----------

const CARD_BG = "rgba(255,255,255,0.12)";
const HAIRLINE = "rgba(255,255,255,0.12)";

function Eyebrow({ children, color = "rgba(255,255,255,0.55)" }: { children: ReactNode; color?: string }) {
  return (
    <span className="font-sans tracking-[0.18em] uppercase" style={{ fontSize: 10, color }}>
      {children}
    </span>
  );
}

function StatusPill({
  label,
  status,
  height = 48,
}: {
  label: string;
  status: "done" | "progress" | "todo";
  height?: number;
}) {
  const styles = {
    done: { bg: "#1A3D2B", text: "#FFFFFF", badgeText: "#4ADE80", badge: "✓ verified · paid" },
    progress: { bg: "#3D2A0A", text: "#FFFFFF", badgeText: "#FBBF24", badge: "→ in progress" },
    todo: { bg: "rgba(255,255,255,0.10)", text: "rgba(255,255,255,0.60)", badgeText: "rgba(255,255,255,0.40)", badge: "○ not started" },
  } as const;
  const s = styles[status];
  return (
    <div
      className="w-full flex items-center justify-between rounded-2xl px-4"
      style={{ height, backgroundColor: s.bg }}
    >
      <span className="font-sans text-[14px]" style={{ color: s.text }}>{label}</span>
      <span className="font-sans text-[12px]" style={{ color: s.badgeText }}>{s.badge}</span>
    </div>
  );
}

function ChecklistPill({
  label,
  status,
}: {
  label: string;
  status: "done" | "progress" | "todo";
}) {
  const styles = {
    done: { bg: "#1A3D2B", text: "#FFFFFF", badgeText: "#4ADE80", badge: "✓ done" },
    progress: { bg: "#3D2A0A", text: "#FFFFFF", badgeText: "#FBBF24", badge: "→ in progress" },
    todo: { bg: "rgba(255,255,255,0.10)", text: "rgba(255,255,255,0.60)", badgeText: "rgba(255,255,255,0.40)", badge: "○ to do" },
  } as const;
  const s = styles[status];
  return (
    <div className="w-full flex items-center justify-between rounded-xl px-4" style={{ height: 40, backgroundColor: s.bg }}>
      <span className="font-sans text-[13px]" style={{ color: s.text }}>{label}</span>
      <span className="font-sans text-[11px]" style={{ color: s.badgeText }}>{s.badge}</span>
    </div>
  );
}

function Hairline() {
  return <div className="w-full my-3" style={{ height: 1, backgroundColor: HAIRLINE }} />;
}

function PmMilestonesCard() {
  const items: Array<{ name: string; status: "done" | "progress" | "todo" }> = [
    { name: "foundations & drainage", status: "done" },
    { name: "structural frame", status: "done" },
    { name: "first fix electrical", status: "progress" },
    { name: "first fix plumbing", status: "todo" },
    { name: "insulation & boarding", status: "todo" },
    { name: "second fix & finishes", status: "todo" },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG }}>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <StatusPill key={it.name} label={it.name} status={it.status} />
        ))}
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-white/80">next payment</span>
        <span className="font-sans text-[12px] text-white/80">
          <span className="text-white font-medium">£11,000</span> · releases when first fix electrical is verified
        </span>
      </div>
    </div>
  );
}

function ContractorChecklistCard() {
  const items: Array<{ name: string; status: "done" | "progress" | "todo" }> = [
    { name: "consumer unit location agreed", status: "done" },
    { name: "cable routes marked", status: "done" },
    { name: "wiring run to all circuits", status: "progress" },
    { name: "consumer unit fitted", status: "todo" },
    { name: "plumbing rough-in complete", status: "todo" },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG }}>
      {/* Header row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Eyebrow>milestone</Eyebrow>
          <div className="font-sans text-[14px] text-white font-medium mt-1">first fix electrical</div>
        </div>
        <div>
          <Eyebrow>due</Eyebrow>
          <div className="font-sans text-[14px] mt-1" style={{ color: "#FBBF24" }}>8 mar · 2 days</div>
        </div>
        <div className="text-right">
          <Eyebrow>payment</Eyebrow>
          <div className="font-sans text-[14px] text-white font-bold mt-1">£11,000</div>
        </div>
      </div>
      <Hairline />
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <ChecklistPill key={it.name} label={it.name} status={it.status} />
        ))}
      </div>
      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "rgba(255,255,255,0.15)" }}>
          <div style={{ width: "40%", height: "100%", backgroundColor: "#4ADE80" }} />
        </div>
        <div className="text-right font-sans text-[11px] text-white/70 mt-1.5">2 of 5 complete</div>
      </div>
    </div>
  );
}

function EvidenceSource({
  iconBg,
  icon,
  title,
  sub,
  pill,
  pillBg = "rgba(255,255,255,0.10)",
  pillColor = "#FFFFFF",
}: {
  iconBg: string;
  icon: string;
  title: string;
  sub: string;
  pill: string;
  pillBg?: string;
  pillColor?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 32, height: 32, backgroundColor: iconBg, fontSize: 16 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[13px] text-white font-medium truncate">{title}</div>
        <div className="font-sans text-[11px] text-white/60 truncate">{sub}</div>
      </div>
      <span
        className="font-sans text-[11px] rounded-full px-2.5 py-1 shrink-0"
        style={{ backgroundColor: pillBg, color: pillColor }}
      >
        {pill}
      </span>
    </div>
  );
}

function EvidenceSourcesCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG }}>
      <div className="flex flex-col gap-3">
        <EvidenceSource
          iconBg="#25D366"
          icon="💬"
          title={'voice note · "all cables run, consumer unit fitted"'}
          sub="sent via WhatsApp · 14:29"
          pill="captured"
        />
        <EvidenceSource
          iconBg="#1E40AF"
          icon="📷"
          title="3 site photographs · ground floor"
          sub="geotagged · 42 pembroke rd W8 4PT · 14:32"
          pill="3 files"
        />
        <EvidenceSource
          iconBg="#B91C1C"
          icon="📍"
          title="location confirmed on site"
          sub="within 15m of project address"
          pill="verified"
          pillBg="#1A3D2B"
          pillColor="#4ADE80"
        />
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-white/80">submitting against</span>
        <span className="font-sans text-[12px] text-white/80">
          first fix electrical · <span className="text-white font-medium">£11,000</span>
        </span>
      </div>
    </div>
  );
}

function AiCheckRow({
  pass,
  label,
  value,
  result,
}: {
  pass: boolean;
  label: string;
  value: string;
  result: string;
}) {
  const color = pass ? "#4ADE80" : "#FBBF24";
  const pillBg = pass ? "#1A3D2B" : "#3D2A0A";
  return (
    <div className="flex items-center" style={{ height: 44, borderBottom: "1px solid #222" }}>
      <span className="w-6 text-center font-sans text-[14px]" style={{ color }}>{pass ? "✓" : "△"}</span>
      <div className="flex-1 flex items-center gap-3 pl-2">
        <span className="font-sans text-[12px] text-white/55 w-24">{label}</span>
        <span className="font-sans text-[13px] text-white font-medium">{value}</span>
      </div>
      <span
        className="font-sans text-[11px] rounded-full px-2.5 py-1"
        style={{ backgroundColor: pillBg, color }}
      >
        {result}
      </span>
    </div>
  );
}

function AiAnalysisCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "#1A1A1A", border: "1px solid #333333" }}>
      <div className="flex items-center justify-between mb-3">
        <Eyebrow color="#666666">cemento analysis</Eyebrow>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block rounded-full animate-pulse" style={{ width: 6, height: 6, backgroundColor: "#4ADE80" }} />
          <span className="font-sans uppercase" style={{ fontSize: 10, color: "#4ADE80" }}>live</span>
        </span>
      </div>
      <div>
        <AiCheckRow pass label="work type" value="electrical" result="matched" />
        <AiCheckRow pass label="trade" value="electrician" result="verified" />
        <AiCheckRow pass label="location" value="ground floor" result="consistent" />
        <AiCheckRow pass label="riba stage" value="first fix" result="correct" />
        <AiCheckRow pass={false} label="condition" value="consumer unit" result="needs attention" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-sans text-[13px] text-white">4 / 5 checks passed</span>
        <div className="flex flex-col items-end gap-1">
          <div className="rounded-full overflow-hidden flex" style={{ width: 120, height: 6, backgroundColor: "rgba(255,255,255,0.10)" }}>
            <div style={{ width: "80%", backgroundColor: "#4ADE80" }} />
            <div style={{ width: "20%", backgroundColor: "#FBBF24" }} />
          </div>
          <span className="font-sans text-[10px] text-white/55">confidence: high</span>
        </div>
      </div>
      <div className="mt-3">
        <span className="font-sans text-[12px] text-white/90 italic">
          recommendation: approve with note on consumer unit placement
        </span>
      </div>
    </div>
  );
}

function PmApprovalCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG }}>
      <div className="grid grid-cols-3 gap-2">
        {["📷 3 photos", "🎙 1 voice", "📍 gps"].map((p) => (
          <span
            key={p}
            className="font-sans text-[11px] text-white text-center rounded-full h-8 inline-flex items-center justify-center whitespace-nowrap"
            style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
          >
            {p}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-white/70">AI result</span>
          <span className="font-sans text-[12px]" style={{ color: "#FBBF24" }}>4/5 · 1 flag</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-white/70">time to review</span>
          <span className="font-sans text-[12px] text-white">4 minutes</span>
        </div>
      </div>
      <Hairline />
      <div>
        <Eyebrow>pm note</Eyebrow>
        <div
          className="mt-2 rounded-xl px-3 py-2.5 font-sans text-[12px] text-white leading-relaxed"
          style={{ backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}
        >
          "consumer unit positioning noted — mark to adjust before second fix"
        </div>
      </div>
      <div
        className="mt-4 w-full flex items-center justify-center rounded-2xl font-sans text-[12px] font-medium px-4 text-center leading-tight"
        style={{ minHeight: 48, paddingTop: 10, paddingBottom: 10, backgroundColor: "#1A3D2B", color: "#4ADE80" }}
      >
        ✓&nbsp;&nbsp;approved with condition
      </div>
    </div>
  );
}

function ClientPaymentCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG }}>
      <div className="flex items-center justify-between">
        <Eyebrow color="#A7D5B5">payment certificate</Eyebrow>
        <span className="font-mono text-[12px] text-white">CMT-2026-0308-A7F2</span>
      </div>
      <div className="mt-3">
        {[
          { l: "milestone", v: "first fix electrical & plumbing", big: false },
          { l: "evidence", v: "verified by AI · confirmed by PM", big: false },
          { l: "amount", v: "£11,000", big: true },
        ].map((row, i) => (
          <div
            key={row.l}
            className="flex items-center justify-between"
            style={{ height: 40, borderTop: i === 0 ? `1px solid ${HAIRLINE}` : undefined, borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <span className="font-sans text-[12px] text-white/65">{row.l}</span>
            <span
              className={`font-sans text-white ${row.big ? "text-[24px] font-bold" : "text-[13px]"}`}
            >
              {row.v}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Eyebrow>project financial summary</Eyebrow>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <div className="font-sans text-[16px] font-semibold" style={{ color: "#4ADE80" }}>£63,000</div>
            <div className="font-sans text-[10px] text-white/55 mt-0.5">paid</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold" style={{ color: "#FBBF24" }}>£11,000</div>
            <div className="font-sans text-[10px] text-white/55 mt-0.5">this payment</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold text-white/60">£206,000</div>
            <div className="font-sans text-[10px] text-white/55 mt-0.5">remaining</div>
          </div>
        </div>
        <div className="mt-3 w-full rounded-full overflow-hidden flex" style={{ height: 6, backgroundColor: "rgba(255,255,255,0.15)" }}>
          <div style={{ width: "22.5%", backgroundColor: "#4ADE80" }} />
          <div style={{ width: "4%", backgroundColor: "#FBBF24" }} />
        </div>
      </div>
    </div>
  );
}

function renderCard(kind: CardKind) {
  switch (kind) {
    case "pm-milestones": return <PmMilestonesCard />;
    case "contractor-checklist": return <ContractorChecklistCard />;
    case "evidence-sources": return <EvidenceSourcesCard />;
    case "ai-analysis": return <AiAnalysisCard />;
    case "pm-approval": return <PmApprovalCard />;
    case "client-payment": return <ClientPaymentCard />;
  }
}

// ---------- Main component ----------

export function DemoWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = slides[step];
  const isLight = current.text === "light";
  const total = slides.length;

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleNext = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else onClose();
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

  const headlineColor = isLight ? "text-white" : "text-foreground";
  const subColor = isLight ? "text-white/60" : "text-foreground/60";

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

          {current.isFinal ? (
            <div className="flex-1 flex items-center justify-center">
              <h1 className={`font-sans tracking-[-0.01em] leading-[1.25] lowercase text-center text-[28px] md:text-[36px] ${headlineColor}`}>
                {current.headline.split("\n").map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <h1 className={`font-sans tracking-[-0.01em] leading-[1.1] mb-3 lowercase ${headlineColor} text-[26px] md:text-[30px]`}>
                {current.headline}
              </h1>
              {current.subtitle && (
                <p className={`font-sans text-[14px] mb-5 leading-relaxed ${subColor}`}>
                  {current.subtitle}
                </p>
              )}

              {current.card && (
                <div className="overflow-auto">
                  {renderCard(current.card)}
                </div>
              )}

              {current.contextLabel && (
                <p className={`mt-3 font-mono text-[11px] tracking-wider uppercase ${isLight ? "text-white/55" : "text-foreground/55"}`}>
                  {current.contextLabel}
                </p>
              )}
            </div>
          )}

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
        <button
          onClick={current.isFinal ? onClose : handleNext}
          className={`w-full h-12 rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.96] ${
            current.ctaTone === "white"
              ? "bg-white text-[#111111]"
              : "bg-foreground text-background"
          }`}
        >
          {current.cta}
        </button>
        {current.isFinal && (
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full bg-transparent border border-foreground/25 text-foreground font-sans text-[14px] font-medium transition-transform active:scale-[0.98]"
          >
            request a demo
          </button>
        )}
      </div>
    </div>
  );
}
