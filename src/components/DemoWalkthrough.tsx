import { useState, useRef, useEffect, ReactNode } from "react";
import { Mic, Camera, MapPin } from "lucide-react";

type Role = "pm" | "contractor" | "ai" | "client" | null;
type CardKind = "pm-milestones" | "contractor-checklist" | "evidence-sources" | "ai-analysis" | "pm-approval" | "client-payment";

interface Slide {
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

// App status colors (match the rest of the app)
const STATUS_DONE = "#39FF14";       // neon green
const STATUS_PROGRESS = "#FF4500";    // acid orange
const STATUS_ALERT = "#FF1744";       // fluorescent red

// Role accent colors (small marker only)
const ROLE_PM = "#C1531E";
const ROLE_CONTRACTOR = "#2563EB";
const ROLE_AI = "#7C3AED";
const ROLE_CLIENT = "#3D7A5A";

const slides: Slide[] = [
  {
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
    role: null,
    headline: "every party informed.\nevery payment justified.\nevery project on record.",
    cta: "sign in to get started →",
    isFinal: true,
  },
];

const SWIPE_THRESHOLD = 50;

// ---------- Card primitives ----------

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono tracking-[0.18em] uppercase text-muted-foreground" style={{ fontSize: 10 }}>
      {children}
    </span>
  );
}

function Hairline() {
  return <div className="w-full my-3 h-px bg-border-light" />;
}

type RowStatus = "done" | "progress" | "todo";

function StatusDot({ status }: { status: RowStatus }) {
  if (status === "todo") {
    return (
      <span
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, border: "1px solid hsl(var(--border-light))" }}
      />
    );
  }
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: 7,
        height: 7,
        backgroundColor: status === "progress" ? STATUS_PROGRESS : STATUS_DONE,
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
  return (
    <div
      className="w-full flex items-center gap-3 rounded-xl px-4 bg-background"
      style={{ height }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StatusDot status={status} />
        <span className={`font-sans text-[13px] truncate ${status === "todo" ? "text-muted-foreground" : "text-foreground"}`}>
          {label}
        </span>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider shrink-0 text-muted-foreground">
        {stateLabel}
      </span>
    </div>
  );
}

// ---------- Cards ----------

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl p-5 bg-card border border-border-light">
      {children}
    </div>
  );
}

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
    <CardShell>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <StatusRow key={it.name} label={it.name} status={it.status} />
        ))}
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-muted-foreground">next payment</span>
        <span className="font-sans text-[12px] text-muted-foreground">
          <span className="text-foreground font-medium">£11,000</span> · on first fix verified
        </span>
      </div>
    </CardShell>
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
    <CardShell>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>milestone</Eyebrow>
          <span className="font-sans text-[13px] text-foreground font-medium truncate">first fix electrical</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>due</Eyebrow>
          <span className="font-sans text-[13px] text-foreground">8 mar · 2 days</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>payment</Eyebrow>
          <span className="font-sans text-[13px] text-foreground font-bold">£11,000</span>
        </div>
      </div>
      <Hairline />
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <StatusRow key={it.name} label={it.name} status={it.status} height={40} />
        ))}
      </div>
      <div className="mt-4">
        <div className="w-full rounded-full overflow-hidden bg-secondary" style={{ height: 4 }}>
          <div style={{ width: "40%", height: "100%", backgroundColor: "hsl(var(--foreground))" }} />
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">
          2 of 5 complete
        </div>
      </div>
    </CardShell>
  );
}

function EvidenceSource({
  icon,
  title,
  sub,
  pill,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  pill: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-md shrink-0 bg-background border border-border-light text-foreground"
        style={{ width: 32, height: 32 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[12px] text-foreground font-medium leading-snug line-clamp-2">{title}</div>
        <div className="font-sans text-[10px] text-muted-foreground truncate mt-0.5">{sub}</div>
      </div>
      <span
        className="font-mono text-[9px] uppercase tracking-wider rounded-full px-2 py-1 shrink-0"
        style={{ backgroundColor: STATUS_DONE, color: "#0a0a0a" }}
      >
        {pill}
      </span>
    </div>
  );
}

function EvidenceSourcesCard() {
  return (
    <CardShell>
      <div className="flex flex-col gap-3">
        <EvidenceSource
          icon={<Mic size={16} strokeWidth={1.75} />}
          title={'voice note · "all cables run, consumer unit fitted"'}
          sub="sent via whatsapp · 14:29"
          pill="captured"
        />
        <EvidenceSource
          icon={<Camera size={16} strokeWidth={1.75} />}
          title="3 site photographs · ground floor"
          sub="geotagged · 42 pembroke rd W8 4PT · 14:32"
          pill="3 files"
        />
        <EvidenceSource
          icon={<MapPin size={16} strokeWidth={1.75} />}
          title="location confirmed on site"
          sub="within 15m of project address"
          pill="verified"
        />
      </div>
      <Hairline />
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-muted-foreground">submitting against</span>
        <span className="font-sans text-[12px] text-muted-foreground">
          first fix electrical · <span className="text-foreground font-medium">£11,000</span>
        </span>
      </div>
    </CardShell>
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
  const accent = pass ? STATUS_DONE : STATUS_ALERT;
  return (
    <div className="flex items-center gap-2 h-10 border-b border-border-light">
      <span
        className="w-4 text-center font-mono text-[11px] shrink-0"
        style={{ color: accent }}
      >
        {pass ? "✓" : "!"}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-sans text-[12px] text-foreground flex-1 min-w-0 truncate">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider shrink-0 whitespace-nowrap" style={{ color: accent }}>
        {result}
      </span>
    </div>
  );
}

function AiAnalysisCard() {
  return (
    <CardShell>
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
      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="font-sans text-[12px] font-medium whitespace-nowrap shrink-0 rounded-full px-2.5 py-1"
          style={{ backgroundColor: STATUS_DONE, color: "#0a0a0a" }}
        >
          4 / 5 checks passed
        </span>
        <div className="flex flex-col items-end gap-1 min-w-0">
          <div className="rounded-full overflow-hidden bg-secondary" style={{ width: 100, height: 4 }}>
            <div style={{ width: "80%", height: "100%", backgroundColor: STATUS_DONE }} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">confidence high · 1 flag</span>
        </div>
      </div>
      <div className="mt-3">
        <span className="font-sans text-[12px] text-muted-foreground italic">
          recommendation: approve with note on consumer unit placement
        </span>
      </div>
    </CardShell>
  );
}

function PmApprovalCard() {
  return (
    <CardShell>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Camera size={12} strokeWidth={1.75} />, label: "3 photos" },
          { icon: <Mic size={12} strokeWidth={1.75} />, label: "1 voice" },
          { icon: <MapPin size={12} strokeWidth={1.75} />, label: "gps" },
        ].map((p) => (
          <span
            key={p.label}
            className="font-mono text-[10px] uppercase tracking-wider text-foreground text-center rounded-full h-8 inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-secondary"
          >
            {p.icon}
            {p.label}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-muted-foreground">ai result</span>
          <span className="font-sans text-[12px] text-foreground">4 / 5 · 1 flag</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-[12px] text-muted-foreground">time to review</span>
          <span className="font-sans text-[12px] text-foreground">4 minutes</span>
        </div>
      </div>
      <Hairline />
      <div>
        <Eyebrow>pm note</Eyebrow>
        <div className="mt-2 rounded-xl px-3 py-2.5 font-sans text-[12px] text-foreground leading-relaxed bg-background border border-border-light">
          "consumer unit positioning noted — mark to adjust before second fix"
        </div>
      </div>
      <div
        className="mt-4 w-full flex items-center justify-center rounded-full font-mono text-[11px] uppercase tracking-wider px-4 text-center"
        style={{ minHeight: 44, backgroundColor: STATUS_DONE, color: "#0a0a0a" }}
      >
        approved with condition
      </div>
    </CardShell>
  );
}

function ClientPaymentCard() {
  return (
    <CardShell>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>payment certificate</Eyebrow>
        <span className="font-mono text-[10px] text-muted-foreground truncate">CMT-2026-0308-A7F2</span>
      </div>
      <div className="mt-3">
        {[
          { l: "milestone", v: "first fix electrical & plumbing", big: false },
          { l: "evidence", v: "verified by ai · confirmed by pm", big: false },
          { l: "amount", v: "£11,000", big: true },
        ].map((row, i) => (
          <div
            key={row.l}
            className="flex items-center justify-between gap-3 border-b border-border-light"
            style={{ minHeight: 40, paddingTop: 8, paddingBottom: 8, borderTop: i === 0 ? `1px solid hsl(var(--border-light))` : undefined }}
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{row.l}</span>
            <span className={`font-sans text-foreground text-right ${row.big ? "text-[22px] font-bold" : "text-[12px]"}`}>
              {row.v}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Eyebrow>project financial summary</Eyebrow>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <div className="font-sans text-[16px] font-semibold text-foreground">£63,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">paid</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold text-foreground">£11,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">this</div>
          </div>
          <div>
            <div className="font-sans text-[16px] font-semibold text-muted-foreground">£206,000</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">remaining</div>
          </div>
        </div>
        <div className="mt-3 w-full rounded-full overflow-hidden bg-secondary" style={{ height: 4 }}>
          <div style={{ width: "26.5%", height: "100%", backgroundColor: "hsl(var(--foreground))" }} />
        </div>
      </div>
    </CardShell>
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

      {/* Slide content */}
      <div className="flex-1 flex flex-col px-5 min-h-0 overflow-auto">
        {/* Role marker */}
        {current.role && (
          <div className="self-start mt-4 mb-6">
            <div className="inline-flex items-center gap-2.5 pb-2" style={{ borderBottom: `2px solid ${current.dotColor}` }}>
              <span
                className="inline-block rounded-full"
                style={{ width: 10, height: 10, backgroundColor: current.dotColor }}
              />
              <span
                className="font-mono text-[11px] tracking-[0.18em] uppercase font-medium"
                style={{ color: current.dotColor }}
              >
                {current.roleLabel}
              </span>
            </div>
          </div>
        )}

        {current.isFinal ? (
          <div className="flex-1 flex items-center justify-center">
            <h1 className="font-sans tracking-[-0.01em] leading-[1.25] lowercase text-center text-[28px] md:text-[36px] text-foreground">
              {current.headline.split("\n").map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <h1 className="font-sans tracking-[-0.01em] leading-[1.1] mb-3 lowercase text-foreground text-[26px] md:text-[30px]">
              {current.headline}
            </h1>
            {current.subtitle && (
              <p className="font-sans text-[14px] mb-5 leading-relaxed text-muted-foreground">
                {current.subtitle}
              </p>
            )}

            {current.card && <div>{renderCard(current.card)}</div>}

            {current.contextLabel && (
              <p className="mt-3 font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
                {current.contextLabel}
              </p>
            )}
          </div>
        )}

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-6 mb-2">
          {slides.map((_, i) => {
            const active = i === step;
            return (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all bg-foreground ${
                  active ? "w-5" : "w-1.5 opacity-30"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pt-4 pb-6 space-y-2">
        <button
          onClick={current.isFinal ? onClose : handleNext}
          className="w-full h-12 rounded-full font-sans text-[14px] font-medium transition-transform active:scale-[0.96] bg-foreground text-background"
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
