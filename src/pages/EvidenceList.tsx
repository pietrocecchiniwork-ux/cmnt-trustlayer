import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useProjectEvidence } from "@/hooks/useSupabaseProject";
import { format } from "date-fns";

export default function EvidenceList() {
  const { currentProjectId } = useProjectContext();
  const { data: evidence = [], isLoading } = useProjectEvidence(currentProjectId ?? undefined);

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <h1 className="font-sans text-[22px] text-foreground mb-6">evidence</h1>

      {isLoading && (
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading...</p>
      )}

      <div className="space-y-4">
        {evidence.map((e) => {
          const tags = e.ai_tags && typeof e.ai_tags === "object"
            ? Object.values(e.ai_tags as Record<string, string>)
            : [];
          return (
            <div key={e.id} className="flex items-start gap-3 py-3 border-b border-border">
              {e.photo_url ? (
                <img src={e.photo_url} alt="evidence" className="w-[44px] h-[44px] object-cover flex-shrink-0" />
              ) : (
                <div className="w-[44px] h-[44px] bg-secondary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] text-muted-foreground">{e.milestone_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(e.submitted_at), "dd MMM yyyy · HH:mm")}
                </p>
                {e.note && <p className="font-sans text-[13px] text-foreground mt-0.5">{e.note}</p>}
                <div className="flex flex-wrap gap-3 mt-1">
                  {tags.map((tag, j) => (
                    <span key={j} className="font-mono text-[10px] text-accent border-b border-accent/40 pb-0.5">
                      {String(tag).replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {evidence.length === 0 && !isLoading && (
          <p className="font-sans text-[14px] text-muted-foreground">no evidence submitted yet</p>
        )}
      </div>
    </div>
  );
}
