import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Image as ImageIcon } from "lucide-react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useTasks, useProject } from "@/hooks/useSupabaseProject";

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
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);

  const milestone = milestones.find(m => m.id === milestoneId);
  const task = allTasks.find(t => t.id === taskId);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(",")[1];
      setPreview(dataUrl);
      setBase64Data(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!preview || !base64Data) return;
    sessionStorage.setItem("capturedPhoto", preview);
    sessionStorage.setItem("capturedPhotoBase64", base64Data);
    sessionStorage.setItem("evidenceMilestoneId", milestoneId);
    sessionStorage.setItem("evidenceTaskId", taskId);
    sessionStorage.setItem("evidenceMilestoneName", milestone?.name || itemName || "");
    sessionStorage.setItem("evidenceTaskName", task?.name || (searchParams.get("taskName") ?? ""));
    sessionStorage.setItem("evidenceProjectName", project?.name ?? "");
    sessionStorage.setItem("evidenceMilestoneDescription", milestone?.description ?? "");
    sessionStorage.setItem("evidenceTaskDescription", task?.description ?? "");
    sessionStorage.setItem("evidenceAllTasks", JSON.stringify(allTasks.map(t => ({ name: t.name, status: t.status }))));
    sessionStorage.setItem("evidenceProjectName", project?.name ?? "");
    sessionStorage.setItem("evidenceMilestoneDescription", milestone?.description ?? "");
    sessionStorage.setItem("evidenceTaskDescription", task?.description ?? "");
    sessionStorage.setItem("evidenceAllTasks", JSON.stringify(allTasks.map(t => ({ name: t.name, status: t.status }))));
    navigate("/project/evidence-confirm");
  };

  const handleRetake = () => {
    setPreview(null);
    setBase64Data(null);
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
        {preview ? (
          <img src={preview} alt="captured" className="w-full aspect-square object-cover rounded" />
        ) : (
          <div className="relative w-full aspect-square">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-surface-dark-foreground" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-surface-dark-foreground" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-surface-dark-foreground" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-surface-dark-foreground" />
            <div className="absolute inset-8 flex flex-col items-center justify-center gap-3">
              <p className="font-mono text-[11px] text-surface-dark-muted text-center">take a photo or choose from gallery</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Fixed buttons above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 flex justify-center gap-6 pb-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {preview ? (
          <div className="flex gap-4">
            <button
              onClick={handleRetake}
              className="font-mono text-[13px] text-surface-dark-foreground border border-surface-dark-foreground rounded-full px-6 py-3"
            >
              retake
            </button>
            <button
              onClick={handleConfirm}
              className="font-mono text-[13px] bg-surface-dark-foreground text-surface-dark rounded-full px-6 py-3"
            >
              use photo →
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <span className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center">
                <Camera className="w-6 h-6 text-surface-dark-foreground" />
              </span>
              <span className="font-mono text-[10px] text-surface-dark-muted">camera</span>
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <span className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-surface-dark-foreground" />
              </span>
              <span className="font-mono text-[10px] text-surface-dark-muted">gallery</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
