import { useState } from "react";
import { useRole, UserRole } from "@/contexts/RoleContext";

const roles: { value: UserRole; label: string }[] = [
  { value: "pm", label: "pm" },
  { value: "contractor", label: "contractor" },
  { value: "trade", label: "trade" },
  { value: "client", label: "client" },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-surface-dark text-surface-dark-foreground font-mono text-[11px] px-4 py-1.5 rounded-full"
      >
        viewing as {role}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="relative bg-background w-full max-w-md border-t border-border p-6 pb-10">
            <p className="font-mono text-[10px] text-muted-foreground mb-4">switch role</p>
            <div className="space-y-3">
              {roles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setOpen(false); }}
                  className={`w-full text-left font-sans text-[16px] py-3 border-b border-border transition-colors ${
                    role === r.value ? "text-accent" : "text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
