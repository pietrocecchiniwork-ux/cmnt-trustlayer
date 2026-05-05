import { useState, useRef, useEffect, ReactNode } from "react";

type Role = "pm" | "contractor" | "ai" | "client" | null;
type CardKind = "pm-milestones" | "contractor-checklist" | "evidence-sources" | "ai-analysis" | "pm-approval" | "client-payment";

interface Slide {
  text: "light" | "dark";
  role: Role;
  roleLabel?: string;
  dotColor?: string;
  headline: string;
  subtitle?: string;
  card?: CardKind;
  contextLabel?: string;
  cta: string;
  isFinal?: boolean;
}

// Shared muted palette
const SLIDE_BG = "#2A2520";        // dark mud-beige
const CARD_BG = "#332E28";          // slightly lifted card surface
const HAIRLINE = "rgba(255,255,255,0.08)";
const FINAL_BG = "#F5F3EE";         // cream

// Role colors — only used for the dot + eyebrow + underline at the top of each slide
const ROLE_PM = "#C1531E";
const ROLE_CONTRACTOR = "#60A5FA";
const ROLE_AI = "#B794F4";
const ROLE_CLIENT = "#3D7A5A";

const slides: Slide[] = [
  {
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: ROLE_PM,
    headline: "every milestone, one source of truth.",
    subtitle: "anna runs a £280k rear extension. each milestone gates a payment.",
    card: "pm-milestones",
    contextLabel: "6 milestones · 2 verified · 1 in progress",
    cta: "see how a milestone gets verified →",
  },
  {
    text: "light",
    role: "contractor",
    roleLabel: "CONTRACTOR",
    dotColor: ROLE_CONTRACTOR,
    headline: "the job, before submitting evidence.",
    subtitle: "tom needs to mark the milestone complete and capture proof.",
    card: "contractor-checklist",
    contextLabel: "first fix electrical · day 12 of 14",
    cta: "submit evidence →",
  },
  {
    text: "light",
    role: "contractor",
    roleLabel: "CONTRACTOR",
    dotColor: ROLE_CONTRACTOR,
    headline: "evidence captured on site.",
    subtitle: "photos, voice note and gps — pulled in from the tools tom already uses.",
    card: "evidence-sources",
    contextLabel: "captured 14:29 — 14:32 · 8 mar 2026",
    cta: "send for verification →",
  },
  {
    text: "light",
    role: "ai",
    roleLabel: "AI ANALYSIS",
    dotColor: ROLE_AI,
    headline: "verifying against the milestone.",
    subtitle: "cemento checks the evidence against riba stage and the project checklist.",
    card: "ai-analysis",
    contextLabel: "analysis completed in 6 seconds",
    cta: "send result to project manager →",
  },
  {
    text: "light",
    role: "pm",
    roleLabel: "PROJECT MANAGER",
    dotColor: ROLE_PM,
    headline: "approve with one tap.",
    subtitle: "anna sees the verified evidence, the AI flag and the recommendation.",
    card: "pm-approval",
    contextLabel: "decision logged · certificate generated",
    cta: "release to client →",
  },
  {
    text: "light",
    role: "client",
    roleLabel: "CLIENT",
    dotColor: ROLE_CLIENT,
    headline: "authorise payment.",
    subtitle: "james sees the certificate, the evidence and where the money sits.",
    card: "client-payment",
    contextLabel: "verified in 4 minutes · 0 disputes",
    cta: "release £11,000 →",
  },
  {
    text: "dark",
    role: null,
    headline: "every party informed.\nevery payment justified.\nevery project on record.",
    cta: "sign in to get started →",
    isFinal: true,
  },
];

const SWIPE_THRESHOLD = 50;

// ---------- Card primitives ----------

function Eyebrow({ children, color = "rgba(255,255,255,0.50)" }: { children: ReactNode; color?: string }) {
  return (
    <span className="font-mono tracking-[0.18em] uppercase" style={{ fontSize: 10, color }}>
      {children}
    </span>
  );
}

function Hairline() {
  return <div className="w-full my-3" style={{ height: 1, backgroundColor: HAIRLINE }} />;
}

type RowStatus = "done" | "progress" | "todo";

function StatusDot({ status }: { status: RowStatus }) {
  if (status === "todo") {
    return (
      <span
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, border: "1px solid rgba(255,255,255,0.30)" }}
      />
    );
  }
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: 7,
        height: 7,
        backgroundColor: status === "progress" ? "#E07A3C" : "#7FB069",
      }}
    />
  );
}

function StatusRow({
  label,
  status,
  height = 44,
}: {
  label: string;
  status: RowStatus;
  height?: number;
}) {
  const stateLabel = status === "done" ? "done" : status === "progress" ? "in progress" : "to do";
  const labelColor = status === "todo" ? "rgba(255,255,255,0.55)" : "#FFFFFF";
  const stateColor =
    status === "done" ? "#7FB069" : status === "progress" ? "#E07A3C" : "rgba(255,255,255,0.45)";
  return (
    <div
      className="w-full flex items-center justify-between rounded-xl px-4"
      style={{ height, backgroundColor: "rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <StatusDot status={status} />
        <span className="font-sans text-[13px] truncate" style={{ color: labelColor }}>{label}</span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: stateColor }}>
        {stateLabel}
      </span>
    </div>
  );
}

// ---------- Cards ----------

function PmMilestonesCard() {
  const items: Array<{ name: string; status: RowStatus }> = [
    { name: "foundations & drainage", status: "done" },
    { name: "structural frame", status: "done" },
    { name: "first fix electrical", status: "progress" },
    { name: "first fix plumbing", status: "todo" },
    { name: "insulation & boarding", status: "todo" },
    { name: "second fix & finishes", status: "todo" },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <StatusRow key={it.name} label={it.name} status={it.status} />
        ))}
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-white/70">next payment</span>
        <span className="font-sans text-[12px] text-white/70">
          <span className="text-white font-medium">£11,000</span> · on first fix verified
        </span>
      </div>
    </div>
  );
}

function ContractorChecklistCard() {
  const items: Array<{ name: string; status: RowStatus }> = [
    { name: "consumer unit location agreed", status: "done" },
    { name: "cable routes marked", status: "done" },
    { name: "wiring run to all circuits", status: "progress" },
    { name: "consumer unit fitted", status: "todo" },
    { name: "plumbing rough-in complete", status: "todo" },
  ];
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Eyebrow>milestone</Eyebrow>
          <div className="font-sans text-[14px] text-white font-medium mt-1">first fix electrical</div>
        </div>
        <div>
          <Eyebrow>due</Eyebrow>
          <div className="font-sans text-[14px] text-white mt-1">8 mar · 2 days</div>
        </div>
        <div className="text-right">
          <Eyebrow>payment</Eyebrow>
          <div className="font-sans text-[14px] text-white font-bold mt-1">£11,000</div>
        </div>
      </div>
      <Hairline />
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <StatusRow key={it.name} label={it.name} status={it.status} height={40} />
        ))}
      </div>
      <div className="mt-4">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div style={{ width: "40%", height: "100%", backgroundColor: "#FFFFFF" }} />
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-wider text-white/55 mt-1.5">
          2 of 5 complete
        </div>
      </div>
    </div>
  );
}

function EvidenceSource({
  tag,
  title,
  sub,
  pill,
}: {
  tag: string;
  title: string;
  sub: string;
  pill: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-md shrink-0 font-mono uppercase"
        style={{
          width: 36,
          height: 36,
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.70)",
          border: `1px solid ${HAIRLINE}`,
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        {tag}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[13px] text-white font-medium truncate">{title}</div>
        <div className="font-sans text-[11px] text-white/55 truncate">{sub}</div>
      </div>
      <span
        className="font-mono text-[10px] uppercase tracking-wider rounded-full px-2.5 py-1 shrink-0"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)" }}
      >
        {pill}
      </span>
    </div>
  );
}

function EvidenceSourcesCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="flex flex-col gap-3">
        <EvidenceSource
          tag="VOX"
          title={'voice note · "all cables run, consumer unit fitted"'}
          sub="sent via whatsapp · 14:29"
          pill="captured"
        />
        <EvidenceSource
          tag="IMG"
          title="3 site photographs · ground floor"
          sub="geotagged · 42 pembroke rd W8 4PT · 14:32"
          pill="3 files"
        />
        <EvidenceSource
          tag="GPS"
          title="location confirmed on site"
          sub="within 15m of project address"
          pill="verified"
        />
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-white/70">submitting against</span>
        <span className="font-sans text-[12px] text-white/70">
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
  return (
    <div className="flex items-center" style={{ height: 42, borderBottom: `1px solid ${HAIRLINE}` }}>
      <span
        className="w-5 text-center font-mono text-[11px]"
        style={{ color: pass ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)" }}
      >
        {pass ? "✓" : "!"}
      </span>
      <div className="flex-1 flex items-center gap-3 pl-2 min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/50 w-20 shrink-0">{label}</span>
        <span className="font-sans text-[13px] text-white truncate">{value}</span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/55 pl-2">
        {result}
      </span>
    </div>
  );
}

function AiAnalysisCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>cemento analysis</Eyebrow>
        <Eyebrow>6s</Eyebrow>
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
          <div className="rounded-full overflow-hidden" style={{ width: 120, height: 4, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <div style={{ width: "80%", height: "100%", backgroundColor: "#FFFFFF" }} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">confidence high · 1 flag</span>
        </div>
      </div>
      <div className="mt-3">
        <span className="font-sans text-[12px] text-white/75 italic">
          recommendation: approve with note on consumer unit placement
        </span>
      </div>
    </div>
  );
}

function PmApprovalCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="grid grid-cols-3 gap-2">
        {["3 photos", "1 voice", "gps"].map((p) => (
          <span
            key={p}
            className="font-mono text-[10px] uppercase tracking-wider text-white/80 text-center rounded-full h-8 inline-flex items-center justify-center whitespace-nowrap"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            {p}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-white/65">ai result</span>
          <span className="font-sans text-[12px] text-white">4 / 5 · 1 flag</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-white/65">time to review</span>
          <span className="font-sans text-[12px] text-white">4 minutes</span>
        </div>
      </div>
      <Hairline />
      <div>
        <Eyebrow>pm note</Eyebrow>
        <div
          className="mt-2 rounded-xl px-3 py-2.5 font-sans text-[12px] text-white/90 leading-relaxed"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${HAIRLINE}` }}
        >
          "consumer unit positioning noted — mark to adjust before second fix"
        </div>
      </div>
      <div
        className="mt-4 w-full flex items-center justify-center rounded-2xl font-mono text-[11px] uppercase tracking-wider text-white px-4 text-center"
        style={{ minHeight: 44, border: `1px solid ${HAIRLINE}`, backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        approved with condition
      </div>
    </div>
  );
}

function ClientPaymentCard() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}>
      <div className="flex items-center justify-between">
        <Eyebrow>payment certificate</Eyebrow>
        <span className="font-mono text-[11px] text-white/80">CMT-2026-0308-A7F2</span>
      </div>
      <div className="mt-3">
        {[
          { l: "milestone", v: "first fix electrical & plumbing", big: false },
          { l: "evidence", v: "verified by ai · confirmed by pm", big: false },
          { l: "amount", v: "£11,000", big: true },
        ].map((row, i) => (
          <div
            key={row.l}
            className="flex items-center justify-between"
            style={{ height: 40, borderTop: i === 0 ? `1px solid ${HAIRLINE}` : undefined, borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">{row.l}</span>
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
            <div className="font-sans text-[16px] font-semibold text-white">£63,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">paid</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold text-white">£11,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">this</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold text-white/55">£206,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">remaining</div>
          </div>
        </div>
        <div className="mt-3 w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div style={{ width: "26.5%", height: "100%", backgroundColor: "#FFFFFF" }} />
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

  const slideBg = current.isFinal ? FINAL_BG : SLIDE_BG;
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
          style={{ backgroundColor: slideBg }}
        >
          {/* Role marker — only colored element on the slide */}
          {current.role && (
            <div className="self-start mb-5">
              <div className="inline-flex items-center gap-2 pb-1.5" style={{ borderBottom: `1px solid ${current.dotColor}` }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: current.dotColor }}
                />
                <span
                  className="font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: current.dotColor }}
                >
                  {current.roleLabel}
                </span>
              </div>
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
                <p className={`mt-3 font-mono text-[10px] tracking-wider uppercase ${isLight ? "text-white/50" : "text-foreground/55"}`}>
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
            current.isFinal
              ? "bg-foreground text-background"
              : "bg-white text-[#2A2520]"
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
