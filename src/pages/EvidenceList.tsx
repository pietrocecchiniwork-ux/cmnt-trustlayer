import { useState, useMemo } from "react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectEvidence, useProject } from "@/hooks/useSupabaseProject";
import { format } from "date-fns";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { exportEvidenceList } from "@/lib/exportCsv";
import { useRole } from "@/contexts/RoleContext";

const PAGE_SIZE = 20;
const FLAG_FILTERS = ["all", "pass", "concern", "fail"] as const;
type FlagFilter = typeof FLAG_FILTERS[number];

export default function EvidenceList() {
  const { currentProjectId } = useProjectContext();
  const { data: evidence = [], isLoading } = useProjectEvidence(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { role } = useRole();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evidence.filter((e: any) => {
      const tags = e.ai_tags && typeof e.ai_tags === "object" ? e.ai_tags as Record<string, unknown> : {};
      if (flagFilter !== "all" && tags.condition_flag !== flagFilter) return false;
      if (!q) return true;
      const hay = [
        e.milestone_name ?? "",
        e.note ?? "",
        ...Object.values(tags).map(v => String(v)),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [evidence, search, flagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen screen-cream">
     <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[14px] opacity-40">←</span>
          <span className="font-mono text-[16px] opacity-40">—</span>
        </div>
        <p className="font-mono text-[28px] tracking-tight text-foreground">evidence</p>
        <p className="font-mono text-[12px] text-foreground/40 mt-1">
          {evidence.length} submissions
        </p>
        {(role === "pm" || role === "client") && evidence.length > 0 && (
          <button
            onClick={() => exportEvidenceList(evidence, project?.name ?? "project")}
            className="font-mono text-[10px] text-foreground/50 underline underline-offset-4 mt-2"
          >
            export csv
          </button>
        )}
      </div>

      {isLoading && (
        <div className="px-6">
          <p className="font-mono text-[13px] text-foreground/40 animate-pulse">loading...</p>
        </div>
      )}

      {/* Evidence items */}
      <div className="flex-1 px-6 pb-6">
        {paged.map((e) => {
          const tagsObj = e.ai_tags && typeof e.ai_tags === "object" ? (e.ai_tags as Record<string, unknown>) : {};
          const milestoneMatch = typeof tagsObj.milestone_match === "boolean" ? tagsObj.milestone_match : null;
          const conditionFlag = typeof tagsObj.condition_flag === "string" ? tagsObj.condition_flag : null;
          const aiComment = typeof tagsObj.ai_comment === "string" ? tagsObj.ai_comment : null;
          const displayTags = Object.entries(tagsObj)
            .filter(([k]) => k !== "milestone_match" && k !== "ai_comment" && k !== "condition_flag")
            .map(([, v]) => String(v));

          return (
            <div key={e.id} className="flex items-start gap-4 py-4 border-b border-foreground/10">
              {e.photo_url ? (
                <button onClick={() => setLightboxUrl(e.photo_url!)} className="flex-shrink-0">
                  <img
                    src={e.photo_url}
                    alt="evidence"
                    className="w-[48px] h-[48px] object-cover border border-foreground/20 hover:opacity-80 transition-opacity"
                  />
                </button>
              ) : (
                <div className="w-[48px] h-[48px] border border-foreground/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-[10px] text-foreground/30">—</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[12px] text-foreground truncate">{e.milestone_name}</p>
                  {conditionFlag && (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      conditionFlag === "pass" ? "bg-success/20 text-success" :
                      conditionFlag === "concern" ? "bg-yellow-500/20 text-yellow-600" :
                      "bg-destructive/20 text-destructive"
                    }`}>
                      {conditionFlag}
                    </span>
                  )}
                  {milestoneMatch != null && (
                    <span className={`font-mono text-[10px] flex-shrink-0 ${milestoneMatch ? "text-success" : "text-destructive"}`}>
                      {milestoneMatch ? "✓" : "✕"}
                    </span>
                  )}
                </div>
                <p className="font-mono text-[10px] text-foreground/40 mt-0.5">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {aiComment && (
                  <p className="font-mono text-[10px] text-foreground/50 italic mt-1 leading-relaxed">{aiComment}</p>
                )}
                {e.note && <p className="font-mono text-[12px] text-foreground/70 mt-1">{e.note}</p>}
                {(e as any).voice_note_url && (
                  <audio src={(e as any).voice_note_url} controls className="mt-1 h-7 w-44" />
                )}
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {displayTags.map((tag, j) => (
                    <span
                      key={j}
                      className="font-mono text-[10px] text-foreground/50 border-b border-foreground/20 pb-0.5"
                    >
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {evidence.length === 0 && !isLoading && (
          <p className="font-mono text-[13px] text-foreground/40 mt-4">no evidence submitted yet</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="font-mono text-[11px] text-foreground/60 disabled:opacity-30"
            >
              ← prev
            </button>
            <span className="font-mono text-[11px] text-foreground/40">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="font-mono text-[11px] text-foreground/60 disabled:opacity-30"
            >
              next →
            </button>
          </div>
        )}
      </div>
      </div>

      {lightboxUrl && (
        <PhotoLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
