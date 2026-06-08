import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ONTOLOGY,
  ONTOLOGY_VERSION,
  buildKnowledgeChunks,
  PHASES,
  TRADES,
  MATERIALS,
  STANDARDS,
  DEFECTS,
  EVIDENCE_TYPES,
  COMPLIANCE_VALUES,
  SEQUENCE_RULES,
} from "@/data/ontology";

type Section = "overview" | "phases" | "trades" | "materials" | "standards" | "defects" | "evidence" | "compliance" | "sequence";

const SECTIONS: Array<{ id: Section; label: string; count: number }> = [
  { id: "overview", label: "overview", count: 0 },
  { id: "phases", label: "phases", count: PHASES.length },
  { id: "trades", label: "trades", count: TRADES.length },
  { id: "materials", label: "materials", count: MATERIALS.length },
  { id: "standards", label: "standards", count: STANDARDS.length },
  { id: "defects", label: "defects", count: DEFECTS.length },
  { id: "evidence", label: "evidence", count: EVIDENCE_TYPES.length },
  { id: "compliance", label: "compliance values", count: COMPLIANCE_VALUES.length },
  { id: "sequence", label: "sequence rules", count: SEQUENCE_RULES.length },
];

const GLOBAL_DOC_ID = "00000000-0000-0000-0000-000000000001";
const BATCH_SIZE = 32;

type LogEntry = { ts: number; level: "info" | "success" | "error"; msg: string };

export default function AdminOntology() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Live elapsed timer while seeding
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length]);

  const pushLog = (level: LogEntry["level"], msg: string) =>
    setLog((prev) => [...prev, { ts: Date.now(), level, msg }]);

  const { data: globalDoc } = useQuery({
    queryKey: ["global-ontology-doc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_documents")
        .select("status, byte_size, created_at, title")
        .eq("id", GLOBAL_DOC_ID)
        .maybeSingle();
      return data;
    },
  });

  const { data: chunkCount } = useQuery({
    queryKey: ["global-chunk-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("knowledge_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", GLOBAL_DOC_ID);
      return count ?? 0;
    },
  });

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    setLog([]);
    setFinishedAt(null);
    setElapsedMs(0);
    const start = Date.now();
    setStartedAt(start);

    try {
      const chunks = buildKnowledgeChunks();
      const total = chunks.length;
      setProgress({ done: 0, total });
      pushLog("info", `built ${total} chunks from ontology v${ONTOLOGY_VERSION}`);

      // 1) init — wipes prior global chunks, sets doc to processing
      pushLog("info", "init: resetting global document and clearing prior chunks");
      const initRes = await supabase.functions.invoke("seed-global-knowledge", {
        body: { mode: "init", ontology_version: ONTOLOGY_VERSION, total },
      });
      if (initRes.error) throw new Error(initRes.error.message || "init failed");

      // 2) batches
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const slice = chunks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batchCount = Math.ceil(total / BATCH_SIZE);
        pushLog("info", `batch ${batchNum}/${batchCount}: embedding ${slice.length} chunks (${i}–${i + slice.length - 1})`);
        const res = await supabase.functions.invoke("seed-global-knowledge", {
          body: {
            mode: "batch",
            ontology_version: ONTOLOGY_VERSION,
            chunks: slice,
            start_index: i,
          },
        });
        if (res.error) throw new Error(res.error.message || `batch ${batchNum} failed`);
        setProgress({ done: i + slice.length, total });
        pushLog("success", `batch ${batchNum}/${batchCount}: inserted ${slice.length} chunks`);
      }

      // 3) finalize
      pushLog("info", "finalize: marking global document ready");
      const finRes = await supabase.functions.invoke("seed-global-knowledge", {
        body: { mode: "finalize", ontology_version: ONTOLOGY_VERSION },
      });
      if (finRes.error) throw new Error(finRes.error.message || "finalize failed");

      const finished = Date.now();
      setFinishedAt(finished);
      setElapsedMs(finished - start);
      pushLog("success", `done — ${total} chunks embedded in ${((finished - start) / 1000).toFixed(1)}s`);
      toast.success(`Seeded ${total} ontology chunks in ${((finished - start) / 1000).toFixed(1)}s`);
      queryClient.invalidateQueries({ queryKey: ["global-ontology-doc"] });
      queryClient.invalidateQueries({ queryKey: ["global-chunk-count"] });
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      console.error("seed error:", err);
      setSeedError(message);
      pushLog("error", message);
      toast.error(`Seed failed: ${message}`);
      const finished = Date.now();
      setFinishedAt(finished);
      setElapsedMs(finished - start);
      queryClient.invalidateQueries({ queryKey: ["global-ontology-doc"] });
      queryClient.invalidateQueries({ queryKey: ["global-chunk-count"] });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="font-mono text-[13px] text-muted-foreground mb-8"
      >
        ← back
      </button>

      <div className="flex items-baseline justify-between mb-2">
        <h1 className="font-sans text-[22px] text-foreground">app knowledge — LCM ontology</h1>
        <span className="font-mono text-[11px] text-muted-foreground">v{ONTOLOGY_VERSION}</span>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground mb-6">
        Cemento's permanent UK construction brain. Available to every project, every AI call. Source-of-truth lives in <code className="font-mono">src/data/ontology/</code>.
      </p>

      {/* Seed status card */}
      <div className="border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="font-sans text-[14px] text-foreground">global knowledge status</p>
          <span
            className={`font-mono text-[11px] ${
              globalDoc?.status === "ready"
                ? "text-[hsl(var(--success,142_40%_36%))]"
                : globalDoc?.status === "failed"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {globalDoc?.status ?? "not seeded"}
          </span>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {chunkCount ?? 0} chunks embedded
          </span>
          {globalDoc?.created_at && (
            <span className="font-mono text-[11px] text-muted-foreground">
              last seeded {new Date(globalDoc.created_at).toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="h-9 px-4 rounded-full bg-foreground text-background font-sans text-[13px] disabled:opacity-50"
        >
          {seeding ? "seeding..." : globalDoc ? "re-seed global knowledge" : "seed global knowledge"}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`font-mono text-[11px] px-3 py-1.5 rounded-full transition-colors ${
              section === s.id
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
            {s.count > 0 && <span className="ml-1.5 opacity-60">{s.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === "overview" && (
        <div className="space-y-3 font-mono text-[12px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="font-sans text-foreground">Cemento LCM Ontology v{ONTOLOGY_VERSION}</strong> — England jurisdiction. All values grounded in primary UK sources: Building Regulations 2010 Approved Documents, BS 8000 workmanship series, BS 7671:2018 (IET 18th Edition), NHBC Standards 2024, JCT SBC/Q 2016, and Eurocodes.
          </p>
          <p>
            The compact taxonomy (entity IDs + names) is hard-coded into <code>supabase/functions/_shared/ontology-prompt.ts</code> and prepended to every AI prompt (tag-evidence, extract-milestones). The detailed chunks (compliance values, defect signatures, sequence rules) are embedded into <code>knowledge_chunks</code> with <code>project_id = NULL</code> and retrieved per query.
          </p>
          <p>
            Every project's AI sees: <strong className="font-sans text-foreground">app ontology (always-on) + project knowledge (uploaded docs, if any)</strong>. Project chunks win on ties.
          </p>
        </div>
      )}

      {section === "phases" && <Table headers={["id", "name", "RIBA", "duration"]} rows={PHASES.map((p) => [p.id, p.name, p.riba_stage, `${p.duration_weeks} wks`])} />}
      {section === "trades" && <Table headers={["id", "name", "CITB", "key standards"]} rows={TRADES.map((t) => [t.id, t.name, t.citb_classification, t.key_standards.join(", ")])} />}
      {section === "materials" && <Table headers={["id", "name", "standard", "installed by"]} rows={MATERIALS.map((m) => [m.id, m.name, m.key_standard, m.installed_by.join(", ")])} />}
      {section === "standards" && <Table headers={["id", "reference", "title"]} rows={STANDARDS.map((s) => [s.id, s.reference, s.title])} />}
      {section === "defects" && (
        <Table
          headers={["id", "name", "severity", "phase", "trade"]}
          rows={DEFECTS.map((d) => [d.id, d.name, d.severity, d.phase, d.trade])}
        />
      )}
      {section === "evidence" && (
        <Table
          headers={["id", "name", "pays?", "weight"]}
          rows={EVIDENCE_TYPES.map((e) => [e.id, e.name, e.can_trigger_payment ? "yes" : "no", e.legal_weight])}
        />
      )}
      {section === "compliance" && (
        <Table
          headers={["entity", "parameter", "value", "unit", "source"]}
          rows={COMPLIANCE_VALUES.map((c) => [c.entity, c.parameter, c.value, c.unit, c.source])}
        />
      )}
      {section === "sequence" && (
        <Table
          headers={["predecessor", "relationship", "successor", "basis"]}
          rows={SEQUENCE_RULES.map((r) => [r.predecessor, r.relationship, r.successor, r.basis])}
        />
      )}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="border border-border overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-border whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0 hover:bg-secondary/30">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top ${
                    j === 0 ? "font-mono text-[11px] text-muted-foreground whitespace-nowrap" : "font-sans text-[12px] text-foreground"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
