import { useState } from "react";
import { useLocation } from "react-router-dom";
import { IconSparkles } from "@tabler/icons-react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { AssistantPanel } from "./AssistantPanel";

const HIDE_ON = new Set([
  "/project/camera",
  "/project/evidence-confirm",
  "/project/submission-confirmed",
]);

export function AssistantFab() {
  const { currentProjectId } = useProjectContext();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!currentProjectId) return null;
  if (!location.pathname.startsWith("/project")) return null;
  if (HIDE_ON.has(location.pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open project assistant"
        className="fixed z-40 right-4 bottom-24 h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
      >
        <IconSparkles size={22} stroke={1.75} />
      </button>
      <AssistantPanel
        open={open}
        onOpenChange={setOpen}
        projectId={currentProjectId}
      />
    </>
  );
}
