import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Image as ImageIcon, X, Plus } from "lucide-react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useTasks, useProject } from "@/hooks/useSupabaseProject";
import { CapturedPhoto, resizeImage, setEvidencePhotoState } from "@/lib/photoStore";
import { toast } from "sonner";

export default function CameraScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get("milestoneId") ?? "";
  const itemName = searchParams.get("item") ?? "";
  const taskId = searchParams.get("taskId") ?? "";
  const { currentProjectId } = useProjectContext();
  const { data: project } = useProject(currentProjectId ?? undefined);
  const { data: milestones = [] } = useMilestones(currentProjectId ?? undefined);
  const { data: allTasks = [] } = useTasks(milestoneId || undefined);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [processing, setProcessing] = useState(false);

  const milestone = milestones.find(m => m.id === milestoneId);
  const task = allTasks.find(t => t.id === taskId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessing(true);
    try {
      const resized = await resizeImage(file);
      setPhotos(prev => [...prev, resized]);
    } catch (err) {
      console.error("Failed to process image:", err);
      toast.error("Failed to process image");
    } finally {
      setProcessing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (photos.length === 0) return;
    setEvidencePhotoState({
      photos,
      milestoneId,
      taskId,
      milestoneName: milestone?.name || itemName || "",
      taskName: task?.name || (searchParams.get("taskName") ?? ""),
      projectName: project?.name ?? "",
      milestoneDescription: milestone?.description ?? "",
      taskDescription: task?.description ?? "",
      allTasks: allTasks.map(t => ({ name: t.name, status: t.status })),
    });
    navigate("/project/evidence-confirm");
  };

  return (
    <div className="flex flex-col h-full bg-surface-dark px-6 pt-12 pb-32 items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <p className="font-mono text-[12px] text-surface-dark-foreground">capture evidence</p>
        <button onClick={() => navigate(-1)} className="font-mono text-[18px] text-surface-dark-foreground">✕</button>
      </div>

      {itemName && (
        <p className="font-sans text-[16px] text-surface-dark-foreground mb-6 w-full text-left">{itemName}</p>
      )}

      <div className="flex-1 flex items-center justify-center w-full max-w-[300px]">
        {photos.length > 0 ? (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={photo.dataUrl} alt={`photo ${i + 1}`} className="w-full h-full object-cover rounded" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-surface-dark/80 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-surface-dark-foreground" />
                  </button>
                </div>
              ))}
              {/* Add more button */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square border border-dashed border-surface-dark-foreground/40 rounded flex flex-col items-center justify-center gap-1"
              >
                <Plus className="w-5 h-5 text-surface-dark-muted" />
                <span className="font-mono text-[9px] text-surface-dark-muted">add more</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-surface-dark-muted text-center">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        ) : (
          <div className="relative w-full aspect-square">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-surface-dark-foreground" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-surface-dark-foreground" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-surface-dark-foreground" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-surface-dark-foreground" />
            <div className="absolute inset-8 flex flex-col items-center justify-center gap-3">
              <p className="font-mono text-[11px] text-surface-dark-muted text-center">
                {processing ? "processing..." : "take a photo or choose from gallery"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Fixed buttons above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 flex justify-center gap-6 pb-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {photos.length > 0 ? (
          <div className="flex gap-4">
            <button
              onClick={() => setPhotos([])}
              className="font-mono text-[13px] text-surface-dark-foreground border border-surface-dark-foreground rounded-full px-6 py-3"
            >
              clear all
            </button>
            <button
              onClick={handleConfirm}
              className="font-mono text-[13px] bg-surface-dark-foreground text-surface-dark rounded-full px-6 py-3"
            >
              use {photos.length} photo{photos.length !== 1 ? "s" : ""} →
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2" disabled={processing}>
              <span className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center">
                <Camera className="w-6 h-6 text-surface-dark-foreground" />
              </span>
              <span className="font-mono text-[10px] text-surface-dark-muted">take photo</span>
            </button>
            <button onClick={() => galleryInputRef.current?.click()} className="flex flex-col items-center gap-2" disabled={processing}>
              <span className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-surface-dark-foreground" />
              </span>
              <span className="font-mono text-[10px] text-surface-dark-muted">choose from library</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
