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
}

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

export default function EvidenceConfirm() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [aiTags, setAiTags] = useState<AiTags | null>(null);
  const [tagging, setTagging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceCode] = useState<string>(() => generateEvidenceCode());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const submitEvidence = useSubmitEvidence();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const photo = sessionStorage.getItem("capturedPhoto");
    const base64 = sessionStorage.getItem("capturedPhotoBase64");
    const mId = sessionStorage.getItem("evidenceMilestoneId");
    setPhotoDataUrl(photo);
    setPhotoBase64(base64);
    setMilestoneId(mId ?? "");

    // Call tag-evidence edge function
    if (base64) {
      setTagging(true);
      supabase.functions.invoke("tag-evidence", {
        body: { image_base64: base64 },
      }).then(({ data, error }) => {
        setTagging(false);
        if (error) {
          console.error("tag-evidence error:", error);
        } else {
          console.log("AI tags:", data);
          setAiTags(data as AiTags);
        }
      });
    }

    // Request geolocation — never blocks submission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 5000 }
      );
    }
  }, []);

  const handleSubmit = async () => {
    if (!milestoneId || !user) {
      toast.error("Missing milestone or not signed in");
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;

      // Upload photo to storage
      if (photoDataUrl) {
        const blob = await fetch(photoDataUrl).then(r => r.blob());
        photoUrl = await uploadEvidencePhoto(blob, "evidence.jpg");
      }

      const result = await submitEvidence.mutateAsync({
        milestone_id: milestoneId,
        submitted_by: user.id,
        photo_url: photoUrl,
        note: note || null,
        channel: "app" as const,
        ai_tags: aiTags ? JSON.parse(JSON.stringify(aiTags)) : {},
      });

      // Clear session
      sessionStorage.removeItem("capturedPhoto");
      sessionStorage.removeItem("capturedPhotoBase64");
      sessionStorage.removeItem("evidenceMilestoneId");

      // Fetch fresh count AFTER insert has resolved
      const { count: freshCount, error: countErr } = await supabase
        .from("evidence")
        .select("id", { count: "exact", head: true })
        .eq("milestone_id", milestoneId);
      if (countErr) console.error("Fresh count error:", countErr);

      // Invalidate caches for other screens
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

  const tagEntries = aiTags ? Object.entries(aiTags) : [];

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-6">
      <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-muted-foreground mb-8">← back</button>

      {photoDataUrl ? (
        <img src={photoDataUrl} alt="captured" className="w-full aspect-square object-cover mb-6" />
      ) : (
        <div className="w-full aspect-square bg-secondary flex items-center justify-center mb-6">
          <p className="font-mono text-[13px] text-muted-foreground">no photo</p>
        </div>
      )}

      <p className="font-mono text-[10px] text-muted-foreground mb-3">
        {tagging ? "analysing photo..." : "ai tags"}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
        {tagEntries.map(([key, val]) => (
          <span key={key} className="font-mono text-[11px] text-accent border-b border-accent/40 pb-0.5">
            {String(val).replace(/_/g, " ")}
          </span>
        ))}
        {tagging && (
          <span className="font-mono text-[11px] text-muted-foreground animate-pulse">analysing...</span>
        )}
      </div>
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

      <div className="flex-1" />

      <Button variant="dark" size="full" onClick={handleSubmit} disabled={submitting || !milestoneId}>
        <span className="font-sans text-[16px]">{submitting ? "submitting..." : "submit"}</span>
      </Button>
    </div>
  );
}
