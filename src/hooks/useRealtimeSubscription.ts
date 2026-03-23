import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeMilestones(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`milestones-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones", filter: `project_id=eq.${projectId}` },
        (payload) => {
          console.log("Realtime milestone change:", payload);
          qc.invalidateQueries({ queryKey: ["milestones", projectId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);
}

export function useRealtimeEvidence(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`evidence-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evidence" },
        (payload) => {
          console.log("Realtime evidence change:", payload);
          qc.invalidateQueries({ queryKey: ["project-evidence", projectId] });
          qc.invalidateQueries({ queryKey: ["evidence"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);
}
