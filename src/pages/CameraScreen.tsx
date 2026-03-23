import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CameraScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-surface-dark px-6 pt-12 pb-6 items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <p className="font-mono text-[12px] text-surface-dark-foreground">first fix — electrical</p>
        <button onClick={() => navigate(-1)} className="font-mono text-[18px] text-surface-dark-foreground">✕</button>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 flex items-center justify-center w-full max-w-[300px]">
        <div className="relative w-full aspect-square">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-surface-dark-foreground" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-surface-dark-foreground" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-surface-dark-foreground" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-surface-dark-foreground" />

          {/* Placeholder */}
          <div className="absolute inset-8 flex items-center justify-center">
            <p className="font-mono text-[11px] text-surface-dark-muted">camera preview</p>
          </div>
        </div>
      </div>

      {/* Shutter button */}
      <button
        onClick={() => navigate("/project/evidence-confirm")}
        className="w-16 h-16 rounded-full border-2 border-surface-dark-foreground flex items-center justify-center mt-8"
      >
        <span className="w-12 h-12 rounded-full bg-surface-dark-foreground" />
      </button>
    </div>
  );
}
