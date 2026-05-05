import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useSupabaseProject";
import { useProjectContext } from "@/contexts/DemoProjectContext";

const HIDDEN_ROUTES = ["/auth", "/forgot-password", "/reset-password", "/unsubscribe", "/", "/onboarding", "/demo"];

export function ProjectPill() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { currentProjectId, setCurrentProjectId } = useProjectContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isHidden =
    HIDDEN_ROUTES.some((p) => location.pathname === p) ||
    !location.pathname.startsWith("/project");
  if (isHidden) return null;

  const active = projects.filter((p: any) => !p.cancelled_at);
  const current = active.find((p) => p.id === currentProjectId);
  if (!current) return null;

  const label = (current.name ?? "project").toLowerCase();
  const truncated = label.length > 22 ? `${label.slice(0, 22)}…` : label;
  const switchable = active.length > 1;

  return (
    <div ref={ref} className="fixed top-3 left-3 z-50">
      <button
        onClick={() => switchable && setOpen((v) => !v)}
        className="h-10 px-4 rounded-full bg-card flex items-center gap-2 max-w-[60vw] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-transform active:scale-95"
        aria-haspopup={switchable ? "listbox" : undefined}
        aria-expanded={open}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-foreground" aria-hidden="true" />
        <span className="font-sans text-[13px] text-foreground tracking-[-0.01em] truncate">
          {truncated}
        </span>
        {switchable && (
          <span className="font-mono text-[11px] text-muted-foreground" aria-hidden="true">
            ▾
          </span>
        )}
      </button>

      {open && switchable && (
        <div
          role="listbox"
          className="absolute top-12 left-0 w-[260px] max-w-[calc(100vw-24px)] bg-card rounded-3xl p-2 shadow-sm"
        >
          <p className="px-3 pt-2 pb-1 t-eyebrow">switch project</p>
          <div className="flex flex-col gap-0.5">
            {active.map((p) => {
              const isCurrent = p.id === currentProjectId;
              return (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => {
                    setCurrentProjectId(p.id);
                    setOpen(false);
                    navigate("/project/dashboard");
                  }}
                  className={`w-full text-left rounded-full font-sans text-[14px] py-2.5 px-4 transition-colors ${
                    isCurrent
                      ? "bg-secondary text-foreground"
                      : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <span className="truncate block">{(p.name ?? "").toLowerCase()}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/");
            }}
            className="w-full text-left rounded-full font-mono text-[11px] py-2.5 px-4 text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            all projects →
          </button>
        </div>
      )}
    </div>
  );
}
