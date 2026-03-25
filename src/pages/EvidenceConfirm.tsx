import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSubmitEvidence, uploadEvidencePhoto, useCurrentUser } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEvidencePhotoState, clearEvidencePhotoState, EvidencePhotoState } from "@/lib/photoStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AiTags {
  work_type: string;
  trade_category: string;
  location_in_building: string;
  completion_stage: string;
  condition_flag: string;
  building_element: string;
  milestone_match?: boolean;
  ai_comment?: string;
}

const tagOptions: Partial<Record<keyof AiTags, string[]>> = {
  work_type: ["electrical", "plumbing", "structural", "roofing", "insulation", "plastering", "carpentry", "glazing", "decoration", "groundworks", "drainage", "hvac", "other"],
  trade_category: ["main_contractor", "electrician", "plumber", "carpenter", "plasterer", "roofer", "groundworker", "glazier", "decorator", "structural_engineer", "other"],
  location_in_building: ["basement", "ground_floor", "first_floor", "second_floor", "roof", "external", "foundation", "party_wall", "loft", "other"],
  completion_stage: ["groundworks", "shell", "first_fix", "insulation", "plastering", "second_fix", "fit_out", "snagging", "complete"],
  condition_flag: ["pass", "concern", "fail"],
  building_element: ["wall", "ceiling", "floor", "roof", "window", "door", "staircase", "foundation", "frame", "drainage", "services", "other"],
};

function generateEvidenceCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EVD-${date}-${rand}`;
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

async function computeHash(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function EvidenceConfirm() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [state, setState] = useState<EvidencePhotoState | null>(null);
  const [aiTags, setAiTags] = useState<AiTags | null>(null);
  const [aiTagsOriginal, setAiTagsOriginal] = useState<AiTags | null>(null);
  const [tagging, setTagging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceCode] = useState<string>(() => generateEvidenceCode());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [editedTags, setEditedTags] = useState<AiTags | null>(null);
  const [tagsEdited, setTagsEdited] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const submitEvidence = useSubmitEvidence();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const photoState = getEvidencePhotoState();
    if (!photoState || photoState.photos.length === 0) {
      navigate(-1);
      return;
    }
    setState(photoState);

    // Tag the first photo
    const firstPhoto = photoState.photos[0];
    setTagging(true);
    supabase.functions.invoke("tag-evidence", {
      body: {
        image_base64: firstPhoto.base64,
        milestone_name: photoState.milestoneName,
        task_name: photoState.taskName,
        project_name: photoState.projectName,
        milestone_description: photoState.milestoneDescription,
        task_description: photoState.taskDescription,
        all_tasks: photoState.allTasks,
      },
    }).then(({ data, error }) => {
      setTagging(false);
      if (error) {
        console.error("tag-evidence error:", error);
      } else {
        setAiTags(data as AiTags);
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 5000 }
      );
    }
  }, [navigate]);

  const startCorrection = () => {
    setEditedTags(aiTags ? { ...aiTags } : null);
    setCorrecting(true);
  };

  const saveCorrection = () => {
    if (!editedTags) return;
    if (!tagsEdited) setAiTagsOriginal(aiTags);
    setAiTags(editedTags);
    setTagsEdited(true);
    setCorrecting(false);
  };

  const handleSubmitClick = () => {
    if (!state?.milestoneId || !user) {
      toast.error("Missing milestone or not signed in");
      return;
    }
    // Show warning if AI flagged issues
    const hasFail = aiTags?.condition_flag === "fail";
    const noMatch = aiTags?.milestone_match === false;
    if (hasFail || noMatch) {
      setShowWarning(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (!state?.milestoneId || !user) return;
    }
    setSubmitting(true);
    try {
      // Upload all photos and submit one evidence record per photo
      for (let i = 0; i < state.photos.length; i++) {
        const photo = state.photos[i];
        const blob = await fetch(photo.dataUrl).then(r => r.blob());
        const fileSizeBytes = blob.size;
        const fileHash = await computeHash(blob);
        const photoUrl = await uploadEvidencePhoto(blob, `evidence_${i}.jpg`);

        const fullPayload = {
          milestone_id: state.milestoneId,
          submitted_by: user.id,
          photo_url: photoUrl,
          note: i === 0 ? (note || null) : null, // note on first photo only
          channel: "app" as const,
          ai_tags: i === 0 && aiTags ? JSON.parse(JSON.stringify(aiTags)) : {},
          file_hash: fileHash,
          file_size_bytes: fileSizeBytes,
          verification_level: 1,
          training_eligible: true,
          label_dimensions_captured: 1,
          ai_tags_original: i === 0 && tagsEdited && aiTagsOriginal ? JSON.parse(JSON.stringify(aiTagsOriginal)) : null,
          human_override: i === 0 ? tagsEdited : false,
          task_id: state.taskId || null,
          gps_lat: coords?.lat ?? null,
          gps_lng: coords?.lng ?? null,
        };

        try {
          await submitEvidence.mutateAsync(fullPayload);
        } catch (lcmErr: unknown) {
          const code = (lcmErr as { code?: string })?.code;
          if (code === "42703") {
            await submitEvidence.mutateAsync({
              milestone_id: state.milestoneId,
              submitted_by: user.id,
              photo_url: photoUrl,
              note: i === 0 ? (note || null) : null,
              channel: "app" as const,
              ai_tags: i === 0 && aiTags ? JSON.parse(JSON.stringify(aiTags)) : {},
            });
          } else {
            throw lcmErr;
          }
        }
      }

      clearEvidencePhotoState();

      const { count: freshCount, error: countErr } = await supabase
        .from("evidence")
        .select("id", { count: "exact", head: true })
        .eq("milestone_id", state.milestoneId);
      if (countErr) console.error("Fresh count error:", countErr);

      queryClient.invalidateQueries({ queryKey: ["evidence", state.milestoneId] });
      queryClient.invalidateQueries({ queryKey: ["project-evidence"] });

      toast.success(`${state.photos.length} photo${state.photos.length !== 1 ? "s" : ""} submitted`);
      navigate(`/project/submission-confirmed?milestoneId=${state.milestoneId}&freshCount=${freshCount ?? 0}&evidenceCode=${encodeURIComponent(evidenceCode)}`);
    } catch (err) {
      console.error("Submit evidence failed:", err);
      toast.error("Failed to submit evidence");
    } finally {
      setSubmitting(false);
    }
  };

  if (!state) return null;

  const tagEntries = aiTags ? (Object.entries(aiTags) as [keyof AiTags, string][]).filter(([k]) => k !== "ai_comment" && k !== "milestone_match") : [];

  return (
    <div className="flex flex-col h-full bg-background px-6 pt-12 pb-40">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>

      {/* Photo thumbnails */}
      {state.photos.length > 1 ? (
        <div className="mb-6">
          <img
            src={state.photos[activePhotoIndex].dataUrl}
            alt={`photo ${activePhotoIndex + 1}`}
            className="w-full aspect-square object-cover mb-2"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {state.photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setActivePhotoIndex(i)}
                className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden border-2 ${
                  i === activePhotoIndex ? "border-foreground" : "border-transparent"
                }`}
              >
                <img src={photo.dataUrl} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {state.photos.length} photos attached
          </p>
        </div>
      ) : state.photos.length === 1 ? (
        <img src={state.photos[0].dataUrl} alt="captured" className="w-full aspect-square object-cover mb-6" />
      ) : (
        <div className="w-full aspect-square bg-secondary flex items-center justify-center mb-6">
          <p className="font-mono text-[13px] text-muted-foreground">no photo</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-1">
        <p className="font-mono text-[10px] text-muted-foreground">
          {tagging ? "analysing photo..." : "ai tags"}
        </p>
        {!tagging && aiTags && !correcting && (
          <button onClick={startCorrection} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            correct tags
          </button>
        )}
      </div>

      {correcting && editedTags ? (
        <div className="mb-4 space-y-2">
          {(Object.keys(editedTags) as (keyof AiTags)[]).filter(k => k !== "ai_comment" && k !== "milestone_match" && tagOptions[k]).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground w-36 flex-shrink-0">{key.replace(/_/g, " ")}</span>
              <select
                className="flex-1 bg-secondary border border-border rounded px-2 py-1 font-mono text-[11px] text-foreground"
                value={String(editedTags[key] ?? "")}
                onChange={(e) => setEditedTags({ ...editedTags, [key]: e.target.value })}
              >
                {tagOptions[key]!.map((opt) => (
                  <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={saveCorrection} className="font-mono text-[11px] text-foreground border border-foreground rounded px-3 py-1">save</button>
            <button onClick={() => setCorrecting(false)} className="font-mono text-[11px] text-muted-foreground">cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
          {tagEntries.map(([key, val]) => (
            <span key={key} className={`font-mono text-[11px] border-b pb-0.5 ${tagsEdited ? "text-foreground border-foreground/40" : "text-accent border-accent/40"}`}>
              {String(val).replace(/_/g, " ")}
            </span>
          ))}
          {tagging && <span className="font-mono text-[11px] text-muted-foreground animate-pulse">analysing...</span>}
        </div>
      )}

      {aiTags?.milestone_match != null && (
        <div className="mb-3">
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${
            aiTags.milestone_match ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          }`}>
            {aiTags.milestone_match ? "✓ matches milestone" : "✕ doesn't match milestone"}
          </span>
        </div>
      )}

      {aiTags?.condition_flag && (
        <div className="mb-3">
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${
            aiTags.condition_flag === "pass" ? "bg-success/20 text-success" :
            aiTags.condition_flag === "concern" ? "bg-yellow-500/20 text-yellow-600" :
            "bg-destructive/20 text-destructive"
          }`}>
            {aiTags.condition_flag === "pass" ? "✓ pass" :
             aiTags.condition_flag === "concern" ? "⚠ concern" :
             "✕ fail"}
          </span>
        </div>
      )}

      {aiTags?.ai_comment && (
        <p className="font-mono text-[11px] text-muted-foreground italic mb-4 leading-relaxed">{aiTags.ai_comment}</p>
      )}

      {coords && (
        <p className="font-mono text-[10px] text-muted-foreground mb-4">{formatCoords(coords.lat, coords.lng)}</p>
      )}
      {!coords && <div className="mb-4" />}

      <input
        type="text"
        placeholder="add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="underline-input mb-6"
      />

      <div
        className="fixed bottom-16 left-0 right-0 px-6 bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
      >
        <Button variant="dark" size="full" onClick={handleSubmit} disabled={submitting || !state.milestoneId}>
          <span className="font-sans text-[16px]">
            {submitting ? "submitting..." : `submit ${state.photos.length} photo${state.photos.length !== 1 ? "s" : ""}`}
          </span>
        </Button>
      </div>
    </div>
  );
}
