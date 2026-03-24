import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectEvidence } from "@/hooks/useSupabaseProject";
import { format } from "date-fns";

export default function EvidenceList() {
  const { currentProjectId } = useProjectContext();
  const { data: evidence = [], isLoading } = useProjectEvidence(currentProjectId ?? undefined);

  return (
    <div className="flex flex-col min-h-screen screen-cream">
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
      </div>

      {isLoading && (
        <div className="px-6">
          <p className="font-mono text-[13px] text-foreground/40 animate-pulse">loading...</p>
        </div>
      )}

      {/* Evidence items */}
      <div className="flex-1 px-6 pb-6">
        {evidence.map((e) => {
          const tags = e.ai_tags && typeof e.ai_tags === "object"
            ? Object.values(e.ai_tags as Record<string, string>)
            : [];
          return (
            <div key={e.id} className="flex items-start gap-4 py-4 border-b border-foreground/10">
              {e.photo_url ? (
                <img
                  src={e.photo_url}
                  alt="evidence"
                  className="w-[48px] h-[48px] object-cover flex-shrink-0 border border-foreground/20"
                />
              ) : (
                <div className="w-[48px] h-[48px] border border-foreground/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-[10px] text-foreground/30">—</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] text-foreground">{e.milestone_name}</p>
                <p className="font-mono text-[10px] text-foreground/40 mt-0.5">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {e.note && <p className="font-mono text-[12px] text-foreground/70 mt-1">{e.note}</p>}
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {tags.map((tag, j) => (
                    <span
                      key={j}
                      className="font-mono text-[10px] text-foreground/50 border-b border-foreground/20 pb-0.5"
                    >
                      {String(tag).replace(/_/g, " ")}
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
      </div>
    </div>
  );
}
