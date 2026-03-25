import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSubmitEvidence, uploadEvidencePhoto, useCurrentUser } from "@/hooks/useSupabaseProject";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiTags {
  work_type: string;
  trade_category: string;
  location_in_building: string;
  completion_stage: string;
  condition_flag: string;
  building_element: string;
  quality_score?: number;
  ai_summary?: string;
}

const tagOptions: Partial<Record<keyof AiTags, string[]>> = {
  work_type: ["electrical", "plumbing", "roofing", "carpentry", "plastering", "tiling", "decorating", "flooring", "structural", "general"],
  trade_category: ["electrical", "plumbing", "roofing", "carpentry", "plastering", "tiling", "decorating", "flooring", "structural", "general"],
  location_in_building: ["basement", "ground_floor", "first_floor", "second_floor", "roof", "exterior", "kitchen", "bathroom", "living_room", "bedroom", "hallway", "garage"],
  completion_stage: ["started", "in_progress", "nearly_complete", "complete", "snagging"],
  condition_flag: ["good", "acceptable", "poor", "defect", "damage"],
  building_element: ["wall", "floor", "ceiling", "roof", "window", "door", "foundation", "pipe", "cable", "fitting", "fixture"],
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [aiTags, setAiTags] = useState<AiTags | null>(null);
  const [aiTagsOriginal, setAiTagsOriginal] = useState<AiTags | null>(null);
  const [tagging, setTagging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceCode] = useState<string>(() => generateEvidenceCode());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Tag correction state
  const [correcting, setCorrecting] = useState(false);
  const [editedTags, setEditedTags] = useState<AiTags | null>(null);
  const [tagsEdited, setTagsEdited] = useState(false);

  const submitEvidence = useSubmitEvidence();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const photo = sessionStorage.getItem("capturedPhoto");
    const base64 = sessionStorage.getItem("capturedPhotoBase64");
    const mId = sessionStorage.getItem("evidenceMilestoneId");
    const tId = sessionStorage.getItem("evidenceTaskId");
    const mName = sessionStorage.getItem("evidenceMilestoneName") ?? "";
    const tName = sessionStorage.getItem("evidenceTaskName") ?? "";
    const pName = sessionStorage.getItem("evidenceProjectName") ?? "";
    const mDesc = sessionStorage.getItem("evidenceMilestoneDescription") ?? "";
    const tDesc = sessionStorage.getItem("evidenceTaskDescription") ?? "";
    let allTasksParsed: { name: string; status: string }[] = [];
    try { allTasksParsed = JSON.parse(sessionStorage.getItem("evidenceAllTasks") ?? "[]"); } catch {}

    setPhotoDataUrl(photo);
    setPhotoBase64(base64);
    setMilestoneId(mId ?? "");
    setTaskId(tId ?? "");

    if (base64) {
      setTagging(true);
      supabase.functions.invoke("tag-evidence", {
        body: {
          image_base64: base64,
          milestone_name: mName,
          task_name: tName,
          project_name: pName,
          milestone_description: mDesc,
          task_description: tDesc,
          all_tasks: allTasksParsed,
        },
      }).then(({ data, error }) => {
        setTagging(false);
        if (error) {
          console.error("tag-evidence error:", error);
        } else {
          setAiTags(data as AiTags);
        }
      });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 5000 }
      );
    }
  }, []);

  const startCorrection = () => {
    setEditedTags(aiTags ? { ...aiTags } : null);
    setCorrecting(true);
  };

  const saveCorrection = () => {
    if (!editedTags) return;
    if (!tagsEdited) {
      setAiTagsOriginal(aiTags);
    }
    setAiTags(editedTags);
    setTagsEdited(true);
    setCorrecting(false);
  };

  const handleSubmit = async () => {
    if (!milestoneId || !user) {
      toast.error("Missing milestone or not signed in");
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      let fileHash: string | null = null;
      let fileSizeBytes: number | null = null;

      if (photoDataUrl) {
        const blob = await fetch(photoDataUrl).then(r => r.blob());
        fileSizeBytes = blob.size;
        fileHash = await computeHash(blob);
        photoUrl = await uploadEvidencePhoto(blob, "evidence.jpg");
      }

      const fullPayload = {
        milestone_id: milestoneId,
        submitted_by: user.id,
        photo_url: photoUrl,
        note: note || null,
        channel: "app" as const,
        ai_tags: aiTags ? JSON.parse(JSON.stringify(aiTags)) : {},
        file_hash: fileHash,
        file_size_bytes: fileSizeBytes,
        verification_level: 1,
        training_eligible: true,
        label_dimensions_captured: 1,
        ai_tags_original: tagsEdited && aiTagsOriginal ? JSON.parse(JSON.stringify(aiTagsOriginal)) : null,
        human_override: tagsEdited,
        task_id: taskId || null,
        
        gps_lat: coords?.lat ?? null,
        gps_lng: coords?.lng ?? null,
      };

      try {
        await submitEvidence.mutateAsync(fullPayload);
      } catch (lcmErr: unknown) {
        // If LCM columns don't exist yet (42703 = undefined_column), fall back to base fields
        const code = (lcmErr as { code?: string })?.code;
        if (code === "42703") {
          console.warn("LCM columns missing, falling back to base evidence insert");
          await submitEvidence.mutateAsync({
            milestone_id: milestoneId,
            submitted_by: user.id,
            photo_url: photoUrl,
            note: note || null,
            channel: "app" as const,
            ai_tags: aiTags ? JSON.parse(JSON.stringify(aiTags)) : {},
          });
        } else {
          throw lcmErr;
        }
      }

      sessionStorage.removeItem("capturedPhoto");
      sessionStorage.removeItem("capturedPhotoBase64");
      sessionStorage.removeItem("evidenceMilestoneId");
      sessionStorage.removeItem("evidenceTaskId");

      const { count: freshCount, error: countErr } = await supabase
        .from("evidence")
        .select("id", { count: "exact", head: true })
        .eq("milestone_id", milestoneId);
      if (countErr) console.error("Fresh count error:", countErr);

      queryClient.invalidateQueries({ queryKey: ["evidence", milestoneId] });
      queryClient.invalidateQueries({ queryKey: ["project-evidence"] });

      toast.success("Evidence submitted");
      navigate(`/project/submission-confirmed?milestoneId=${milestoneId}&freshCount=${freshCount ?? 0}&evidenceCode=${encodeURIComponent(evidenceCode)}`);
    } catch (err) {
      console.error("Submit evidence failed:", err);
      toast.error("Failed to submit evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const tagEntries = aiTags ? (Object.entries(aiTags) as [keyof AiTags, string][]).filter(([k]) => k !== "ai_summary" && k !== "quality_score") : [];

  return (
    <div className="flex flex-col h-full bg-background px-6 pt-12 pb-40">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>

      {photoDataUrl ? (
        <img src={photoDataUrl} alt="captured" className="w-full aspect-square object-cover mb-6" />
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
          <button
            onClick={startCorrection}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            correct tags
          </button>
        )}
      </div>

      {correcting && editedTags ? (
        <div className="mb-4 space-y-2">
          {(Object.keys(editedTags) as (keyof AiTags)[]).filter(k => k !== "ai_summary" && k !== "quality_score" && tagOptions[k]).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground w-36 flex-shrink-0">
                {key.replace(/_/g, " ")}
              </span>
              <select
                className="flex-1 bg-secondary border border-border rounded px-2 py-1 font-mono text-[11px] text-foreground"
                value={editedTags[key]}
                onChange={(e) => setEditedTags({ ...editedTags, [key]: e.target.value })}
              >
                {tagOptions[key]!.map((opt) => (
                  <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button
              onClick={saveCorrection}
              className="font-mono text-[11px] text-foreground border border-foreground rounded px-3 py-1"
            >
              save
            </button>
            <button
              onClick={() => setCorrecting(false)}
              className="font-mono text-[11px] text-muted-foreground"
            >
              cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
          {tagEntries.map(([key, val]) => (
            <span key={key} className={`font-mono text-[11px] border-b pb-0.5 ${tagsEdited ? "text-foreground border-foreground/40" : "text-accent border-accent/40"}`}>
              {String(val).replace(/_/g, " ")}
            </span>
          ))}
          {tagging && (
            <span className="font-mono text-[11px] text-muted-foreground animate-pulse">analysing...</span>
          )}
        </div>
      )}

      {aiTags?.quality_score != null && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-[3px]">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`w-[18px] h-[6px] rounded-[1px] transition-colors ${
                  i < aiTags.quality_score!
                    ? aiTags.quality_score! >= 7
                      ? "bg-accent"
                      : aiTags.quality_score! >= 4
                        ? "bg-yellow-500"
                        : "bg-destructive"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {aiTags.quality_score}/10
          </span>
        </div>
      )}

      {aiTags?.ai_summary && (
        <p className="font-mono text-[11px] text-muted-foreground italic mb-4 leading-relaxed">
          {aiTags.ai_summary}
        </p>
      )}

      {coords && (
        <p className="font-mono text-[10px] text-muted-foreground mb-4">
          {formatCoords(coords.lat, coords.lng)}
        </p>
      )}
      {!coords && <div className="mb-4" />}

      <input
        type="text"
        placeholder="add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="underline-input mb-6"
      />

      {/* Fixed submit button above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
      >
        <Button variant="dark" size="full" onClick={handleSubmit} disabled={submitting || !milestoneId}>
          <span className="font-sans text-[16px]">{submitting ? "submitting..." : "submit"}</span>
        </Button>
      </div>
    </div>
  );
}
