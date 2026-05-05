import { useState, useMemo } from "react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectEvidence, useProject, useCreateChange, useCurrentUser } from "@/hooks/useSupabaseProject";
import { format } from "date-fns";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { exportEvidenceList } from "@/lib/exportCsv";
import { useRole } from "@/contexts/RoleContext";
import { GpsMapThumb } from "@/components/GpsMapThumb";
import { CsvExportButton } from "@/components/CsvExportButton";

const PAGE_SIZE = 20;
const FLAG_FILTERS = ["all", "pass", "concern", "fail"] as const;
type FlagFilter = typeof FLAG_FILTERS[number];

export default function EvidenceList() {
  const { currentProjectId } = useProjectContext();
  const { data: evidence = [], isLoading } = useProjectEvidence(currentProjectId ?? undefined);
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { data: currentUser } = useCurrentUser();
  const createChange = useCreateChange();
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

  // Log evidence view (lightbox open) for legal defensibility — fire & forget
  const logEvidenceView = (e: any) => {
    if (!currentProjectId || !currentUser) return;
    createChange.mutate({
      project_id: currentProjectId,
      entity_type: "evidence",
      entity_id: e.milestone_id, // link to milestone for filtering
      entity_name: e.milestone_name ?? "evidence",
      change_type: "viewed",
      changed_by: currentUser.id,
      changed_by_name: currentUser.email ?? "user",
      new_value: { evidence_id: e.id, viewer_role: role },
    } as any);
  };

  return (
    <div className="min-h-screen bg-background">
     <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 pt-20 pb-6 space-y-3">
        <div className="bg-card rounded-3xl px-6 py-5">
          <p className="t-eyebrow">evidence</p>
          <p className="font-sans text-[26px] tracking-[-0.02em] text-foreground mt-1 lowercase">
            {evidence.length} submissions
          </p>
          {(role === "pm" || role === "client") && evidence.length > 0 && (
            <div className="mt-2">
              <CsvExportButton
                onExport={(range) => exportEvidenceList(evidence, project?.name ?? "project", range)}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-4"
              />
            </div>
          )}
        </div>

        {/* Search + filter */}
        {evidence.length > 0 && (
          <div className="bg-card rounded-3xl px-6 py-5 space-y-3">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="search notes, tags, milestone…"
              className="w-full px-4 py-2.5 bg-secondary rounded-full font-mono text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {FLAG_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => { setFlagFilter(f); setPage(0); }}
                  className={`font-mono text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    flagFilter === f
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="px-6">
          <div className="bg-card rounded-3xl px-6 py-5">
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
          </div>
        </div>
      )}

      {/* Evidence items */}
      <div className="flex-1 px-6 pb-6 space-y-3">
        {paged.map((e: any) => {
          const tagsObj = e.ai_tags && typeof e.ai_tags === "object" ? (e.ai_tags as Record<string, unknown>) : {};
          const milestoneMatch = typeof tagsObj.milestone_match === "boolean" ? tagsObj.milestone_match : null;
          const conditionFlag = typeof tagsObj.condition_flag === "string" ? tagsObj.condition_flag : null;
          const aiComment = typeof tagsObj.ai_comment === "string" ? tagsObj.ai_comment : null;
          const displayTags = Object.entries(tagsObj)
            .filter(([k]) => k !== "milestone_match" && k !== "ai_comment" && k !== "condition_flag")
            .map(([, v]) => String(v));

          const lat = e.gps_lat ?? e.latitude;
          const lng = e.gps_lng ?? e.longitude;
          const hasGps = typeof lat === "number" && typeof lng === "number";

          return (
            <div key={e.id} className="bg-card rounded-3xl px-5 py-4 flex items-start gap-4">
              <div className="flex flex-col gap-1 flex-shrink-0">
                {e.photo_url ? (
                  <button
                    onClick={() => {
                      setLightboxUrl(e.photo_url!);
                      logEvidenceView(e);
                    }}
                  >
                    <img
                      src={e.photo_url}
                      alt="evidence"
                      className="w-[52px] h-[52px] object-cover rounded-2xl hover:opacity-80 transition-opacity"
                    />
                  </button>
                ) : (
                  <div className="w-[52px] h-[52px] rounded-2xl bg-secondary flex items-center justify-center">
                    <span className="font-mono text-[10px] text-muted-foreground">—</span>
                  </div>
                )}
                {hasGps && <GpsMapThumb lat={Number(lat)} lng={Number(lng)} size={52} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-sans text-[14px] text-foreground truncate">{e.milestone_name}</p>
                  {conditionFlag && (
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                      conditionFlag === "pass" ? "bg-success/15 text-success" :
                      conditionFlag === "concern" ? "bg-warning/15 text-warning" :
                      "bg-destructive/15 text-destructive"
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
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {aiComment && (
                  <p className="font-sans text-[12px] text-muted-foreground italic mt-1 leading-relaxed">{aiComment}</p>
                )}
                {e.note && <p className="font-sans text-[13px] text-foreground/80 mt-1">{e.note}</p>}
                {(e as any).voice_note_url && (
                  <audio src={(e as any).voice_note_url} controls className="mt-2 h-7 w-44" />
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {displayTags.map((tag, j) => (
                    <span
                      key={j}
                      className="font-mono text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5"
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
          <div className="bg-card rounded-3xl px-6 py-8">
            <p className="font-mono text-[13px] text-muted-foreground text-center">no evidence submitted yet</p>
          </div>
        )}
        {evidence.length > 0 && filtered.length === 0 && (
          <div className="bg-card rounded-3xl px-6 py-8">
            <p className="font-mono text-[13px] text-muted-foreground text-center">no evidence matches filter</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-card rounded-full px-4 py-2 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              ← prev
            </button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30"
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
