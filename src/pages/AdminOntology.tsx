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

type FailedBatch = { startIndex: number; batchNum: number; batchCount: number; error: string };

type BatchStatus = "pending" | "running" | "succeeded" | "failed" | "retried-ok" | "retried-failed";
type BatchState = { startIndex: number; batchNum: number; batchCount: number; status: BatchStatus; attempts: number; lastError?: string };

const MAX_RETRIES = 3;
const COOLDOWN_MS = 15_000;

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
  const [failedBatches, setFailedBatches] = useState<FailedBatch[]>([]);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [batchStates, setBatchStates] = useState<BatchState[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Keep the chunks from the most recent run available for retries
  const chunksRef = useRef<ReturnType<typeof buildKnowledgeChunks> | null>(null);

  // Live elapsed timer while seeding
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  // Cooldown countdown
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, cooldownUntil - Date.now());
      setCooldownRemaining(rem);
      if (rem === 0) setCooldownUntil(null);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

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

  /**
   * Runs a list of batches sequentially. Continues past failures so we
   * collect every failed batch in one pass. Returns the new list of
   * still-failing batches (empty = all good).
   */
  const runBatches = async (
    chunks: ReturnType<typeof buildKnowledgeChunks>,
    targets: Array<{ startIndex: number; batchNum: number; batchCount: number }>,
    onSuccess: (startIndex: number, size: number) => void,
    isRetry: boolean
  ): Promise<FailedBatch[]> => {
    const stillFailing: FailedBatch[] = [];
    for (const t of targets) {
      const slice = chunks.slice(t.startIndex, t.startIndex + BATCH_SIZE);
      setBatchStates((prev) =>
        prev.map((b) =>
          b.startIndex === t.startIndex ? { ...b, status: "running" } : b
        )
      );
      pushLog(
        "info",
        `batch ${t.batchNum}/${t.batchCount}${isRetry ? " (retry)" : ""}: embedding ${slice.length} chunks (${t.startIndex}–${t.startIndex + slice.length - 1})`
      );
      try {
        const res = await supabase.functions.invoke("seed-global-knowledge", {
          body: {
            mode: "batch",
            ontology_version: ONTOLOGY_VERSION,
            chunks: slice,
            start_index: t.startIndex,
          },
        });
        if (res.error) throw new Error(res.error.message || `batch ${t.batchNum} failed`);
        onSuccess(t.startIndex, slice.length);
        setBatchStates((prev) =>
          prev.map((b) =>
            b.startIndex === t.startIndex
              ? { ...b, status: isRetry ? "retried-ok" : "succeeded", attempts: b.attempts + 1, lastError: undefined }
              : b
          )
        );
        pushLog("success", `batch ${t.batchNum}/${t.batchCount}: inserted ${slice.length} chunks`);
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        setBatchStates((prev) =>
          prev.map((b) =>
            b.startIndex === t.startIndex
              ? { ...b, status: isRetry ? "retried-failed" : "failed", attempts: b.attempts + 1, lastError: message }
              : b
          )
        );
        pushLog("error", `batch ${t.batchNum}/${t.batchCount} failed: ${message}`);
        stillFailing.push({
          startIndex: t.startIndex,
          batchNum: t.batchNum,
          batchCount: t.batchCount,
          error: message,
        });
      }
    }
    return stillFailing;
  };

  const finalize = async () => {
    pushLog("info", "finalize: marking global document ready");
    const finRes = await supabase.functions.invoke("seed-global-knowledge", {
      body: { mode: "finalize", ontology_version: ONTOLOGY_VERSION },
    });
    if (finRes.error) throw new Error(finRes.error.message || "finalize failed");
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    setLog([]);
    setFailedBatches([]);
    setRetryAttempt(0);
    setCooldownUntil(null);
    setBatchStates([]);
    setFinishedAt(null);
    setElapsedMs(0);
    const start = Date.now();
    setStartedAt(start);

    const completedIndexes = new Set<number>();

    try {
      const chunks = buildKnowledgeChunks();
      chunksRef.current = chunks;
      const total = chunks.length;
      setProgress({ done: 0, total });
      pushLog("info", `built ${total} chunks from ontology v${ONTOLOGY_VERSION}`);

      // 1) init — wipes prior global chunks, sets doc to processing
      pushLog("info", "init: resetting global document and clearing prior chunks");
      const initRes = await supabase.functions.invoke("seed-global-knowledge", {
        body: { mode: "init", ontology_version: ONTOLOGY_VERSION, total },
      });
      if (initRes.error) throw new Error(initRes.error.message || "init failed");

      // 2) batches — build the full target list, then run, continuing past errors
      const batchCount = Math.ceil(total / BATCH_SIZE);
      const targets = Array.from({ length: batchCount }, (_, k) => ({
        startIndex: k * BATCH_SIZE,
        batchNum: k + 1,
        batchCount,
      }));
      setBatchStates(
        targets.map((t) => ({ ...t, status: "pending" as BatchStatus, attempts: 0 }))
      );

      const failures = await runBatches(chunks, targets, (startIndex, size) => {
        completedIndexes.add(startIndex);
        setProgress((p) => ({ done: p.done + size, total: p.total }));
      }, false);

      if (failures.length > 0) {
        setFailedBatches(failures);
        const summary = `${failures.length}/${batchCount} batch${failures.length === 1 ? "" : "es"} failed — use retry to re-run only the failures`;
        setSeedError(summary);
        pushLog("error", summary);
        toast.error(summary);
      } else {
        // 3) finalize
        await finalize();
        const finished = Date.now();
        setFinishedAt(finished);
        setElapsedMs(finished - start);
        pushLog("success", `done — ${total} chunks embedded in ${((finished - start) / 1000).toFixed(1)}s`);
        toast.success(`Seeded ${total} ontology chunks in ${((finished - start) / 1000).toFixed(1)}s`);
      }
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      console.error("seed error:", err);
      setSeedError(message);
      pushLog("error", message);
      toast.error(`Seed failed: ${message}`);
    } finally {
      const finished = Date.now();
      if (!finishedAt) {
        setFinishedAt(finished);
        setElapsedMs(finished - start);
      }
      queryClient.invalidateQueries({ queryKey: ["global-ontology-doc"] });
      queryClient.invalidateQueries({ queryKey: ["global-chunk-count"] });
      setSeeding(false);
    }
  };

  /**
   * Retry only the batches that failed in the previous run. The original
   * log + run history is preserved; new entries are appended under a
   * "retry attempt N" separator. Does NOT re-init (so successful chunks stay).
   */
  const handleRetry = async () => {
    const chunks = chunksRef.current;
    if (!chunks || failedBatches.length === 0) return;

    if (retryAttempt >= MAX_RETRIES) {
      const msg = `max retries (${MAX_RETRIES}) reached — re-seed from scratch or investigate the failing batches`;
      pushLog("error", msg);
      toast.error(msg);
      return;
    }
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return;
    }

    const attempt = retryAttempt + 1;
    setRetryAttempt(attempt);
    setSeeding(true);
    setSeedError(null);
    setFinishedAt(null);

    const retryStart = Date.now();
    if (!startedAt) setStartedAt(retryStart);

    // Reset prior retry-failed markers so the new attempt's per-batch results are clear
    setBatchStates((prev) =>
      prev.map((b) =>
        b.status === "failed" || b.status === "retried-failed"
          ? { ...b, status: "pending" as BatchStatus }
          : b
      )
    );

    pushLog(
      "info",
      `── retry attempt ${attempt}/${MAX_RETRIES}: re-running ${failedBatches.length} failed batch${failedBatches.length === 1 ? "" : "es"} ──`
    );

    try {
      const targets = failedBatches.map((b) => ({
        startIndex: b.startIndex,
        batchNum: b.batchNum,
        batchCount: b.batchCount,
      }));

      const remaining = await runBatches(chunks, targets, (_startIndex, size) => {
        setProgress((p) => ({ done: Math.min(p.done + size, p.total), total: p.total }));
      }, true);

      setFailedBatches(remaining);

      if (remaining.length === 0) {
        await finalize();
        const finished = Date.now();
        setFinishedAt(finished);
        if (startedAt) setElapsedMs(finished - startedAt);
        pushLog("success", `retry attempt ${attempt}: all batches succeeded — global knowledge ready`);
        toast.success(`Retry succeeded — all batches embedded`);
      } else {
        const summary = `retry attempt ${attempt}/${MAX_RETRIES}: ${remaining.length} batch${remaining.length === 1 ? "" : "es"} still failing`;
        setSeedError(summary);
        pushLog("error", summary);
        toast.error(summary);
        if (attempt >= MAX_RETRIES) {
          pushLog("error", `max retries reached — retry button disabled`);
        } else {
          const until = Date.now() + COOLDOWN_MS;
          setCooldownUntil(until);
          pushLog("info", `cooldown ${(COOLDOWN_MS / 1000).toFixed(0)}s before next retry is allowed`);
        }
      }
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      console.error("retry error:", err);
      setSeedError(message);
      pushLog("error", `retry attempt ${attempt}: ${message}`);
      toast.error(`Retry failed: ${message}`);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["global-ontology-doc"] });
      queryClient.invalidateQueries({ queryKey: ["global-chunk-count"] });
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
            className={`font-mono text-[11px] uppercase tracking-wider ${
              seeding
                ? "text-foreground"
                : seedError || globalDoc?.status === "failed"
                ? "text-destructive"
                : globalDoc?.status === "ready"
                ? "text-[hsl(var(--success,142_40%_36%))]"
                : "text-muted-foreground"
            }`}
          >
            {seeding ? "seeding…" : seedError ? "failed" : globalDoc?.status ?? "not seeded"}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <span className="font-mono text-[11px] text-muted-foreground">
            {chunkCount ?? 0} chunks embedded
          </span>
          {globalDoc?.created_at && (
            <span className="font-mono text-[11px] text-muted-foreground">
              last seeded {new Date(globalDoc.created_at).toLocaleString()}
            </span>
          )}
          {(seeding || finishedAt) && (
            <span className="font-mono text-[11px] text-muted-foreground">
              elapsed {(elapsedMs / 1000).toFixed(1)}s
            </span>
          )}
          {finishedAt && !seedError && (
            <span className="font-mono text-[11px] text-[hsl(var(--success,142_40%_36%))]">
              completed {new Date(finishedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {(seeding || (progress.total > 0 && !seedError)) && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                progress
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {progress.done} / {progress.total} ({progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
              <div
                className="h-full bg-foreground transition-all duration-200"
                style={{
                  width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Error banner + failed-batch breakdown */}
        {seedError && (
          <div className="mb-3 p-2 border border-destructive/40 bg-destructive/5 rounded">
            <p className="font-mono text-[10px] text-destructive uppercase tracking-wider mb-1">
              error{retryAttempt > 0 ? ` · after retry ${retryAttempt}` : ""}
            </p>
            <p className="font-mono text-[11px] text-destructive break-words">{seedError}</p>
            {failedBatches.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {failedBatches.map((b) => (
                  <li
                    key={b.startIndex}
                    className="font-mono text-[10px] text-destructive/90 break-words"
                  >
                    · batch {b.batchNum}/{b.batchCount} (chunks {b.startIndex}–
                    {b.startIndex + BATCH_SIZE - 1}): {b.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}



        {/* Live log */}
        {log.length > 0 && (
          <div className="mb-3 border border-border bg-secondary/30 rounded max-h-48 overflow-y-auto">
            <div className="px-2 py-1 border-b border-border flex items-center justify-between sticky top-0 bg-secondary/80 backdrop-blur">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                seed log
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{log.length} events</span>
            </div>
            <div className="p-2 space-y-0.5">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-2 font-mono text-[10px] leading-relaxed">
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {new Date(entry.ts).toLocaleTimeString(undefined, { hour12: false })}
                  </span>
                  <span
                    className={`shrink-0 uppercase tracking-wider ${
                      entry.level === "error"
                        ? "text-destructive"
                        : entry.level === "success"
                        ? "text-[hsl(var(--success,142_40%_36%))]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-foreground break-words">{entry.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* Per-batch status grid */}
        {batchStates.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                per-batch status
              </span>
              <div className="flex items-center gap-2.5 font-mono text-[10px] text-muted-foreground">
                <LegendDot className="bg-secondary border border-border" /> pending
                <LegendDot className="bg-foreground/40" /> running
                <LegendDot className="bg-[hsl(var(--success,142_40%_36%))]" /> ok
                <LegendDot className="bg-destructive" /> failed
                <LegendDot className="bg-[hsl(var(--success,142_40%_36%))] ring-1 ring-foreground" /> retried-ok
                <LegendDot className="bg-destructive ring-1 ring-foreground" /> retried-failed
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {batchStates.map((b) => (
                <div
                  key={b.startIndex}
                  title={`batch ${b.batchNum}/${b.batchCount} · ${b.status} · ${b.attempts} attempt${b.attempts === 1 ? "" : "s"}${b.lastError ? ` · ${b.lastError}` : ""}`}
                  className={`h-5 min-w-[28px] px-1.5 flex items-center justify-center rounded-sm font-mono text-[9px] tabular-nums ${batchSwatchClass(b.status)}`}
                >
                  {b.batchNum}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-9 px-4 rounded-full bg-foreground text-background font-sans text-[13px] disabled:opacity-50"
          >
            {seeding && retryAttempt === 0
              ? `seeding… ${progress.done}/${progress.total}`
              : globalDoc
              ? "re-seed global knowledge"
              : "seed global knowledge"}
          </button>

          {failedBatches.length > 0 && (
            <button
              onClick={handleRetry}
              disabled={seeding || retryAttempt >= MAX_RETRIES || cooldownRemaining > 0}
              className="h-9 px-4 rounded-full border border-destructive text-destructive font-sans text-[13px] disabled:opacity-50"
            >
              {seeding && retryAttempt > 0
                ? `retrying attempt ${retryAttempt}/${MAX_RETRIES}…`
                : retryAttempt >= MAX_RETRIES
                ? `max retries reached (${MAX_RETRIES}/${MAX_RETRIES})`
                : cooldownRemaining > 0
                ? `cooldown ${(cooldownRemaining / 1000).toFixed(0)}s…`
                : `retry ${failedBatches.length} failed batch${failedBatches.length === 1 ? "" : "es"} (attempt ${retryAttempt + 1}/${MAX_RETRIES})`}
            </button>
          )}

          {failedBatches.length > 0 && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {retryAttempt}/{MAX_RETRIES} retries used
            </span>
          )}
        </div>


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

function LegendDot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-sm ${className}`} />;
}

function batchSwatchClass(status: BatchStatus): string {
  switch (status) {
    case "pending":
      return "bg-secondary text-muted-foreground border border-border";
    case "running":
      return "bg-foreground/40 text-background animate-pulse";
    case "succeeded":
      return "bg-[hsl(var(--success,142_40%_36%))] text-background";
    case "failed":
      return "bg-destructive text-destructive-foreground";
    case "retried-ok":
      return "bg-[hsl(var(--success,142_40%_36%))] text-background ring-1 ring-foreground";
    case "retried-failed":
      return "bg-destructive text-destructive-foreground ring-1 ring-foreground";
  }
}
