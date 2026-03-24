import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CameraScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get("milestoneId") ?? "";
  const itemName = searchParams.get("item") ?? "";
  const taskId = searchParams.get("taskId") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      sessionStorage.setItem("capturedPhoto", reader.result as string);
      sessionStorage.setItem("capturedPhotoBase64", base64);
      sessionStorage.setItem("evidenceMilestoneId", milestoneId);
      sessionStorage.setItem("evidenceTaskId", taskId);
      navigate("/project/evidence-confirm");
    };
    reader.readAsDataURL(file);
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
        <div className="relative w-full aspect-square">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-surface-dark-foreground" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-surface-dark-foreground" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-surface-dark-foreground" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-surface-dark-foreground" />
          <div className="absolute inset-8 flex flex-col items-center justify-center gap-2">
            <p className="font-mono text-[11px] text-surface-dark-muted">tap shutter to select photo</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      {/* Fixed shutter button above bottom nav */}
      <div
        className="fixed bottom-16 left-0 right-0 flex justify-center pb-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center"
        >
          <span className="w-12 h-12 rounded-full bg-surface-dark-foreground" />
        </button>
      </div>
    </div>
  );
}
