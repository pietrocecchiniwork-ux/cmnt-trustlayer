import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

const pmLinks = [
  { label: "dashboard", path: "/project/dashboard" },
  { label: "milestones", path: "/project/milestones" },
  { label: "evidence", path: "/project/evidence" },
  { label: "payments", path: "/project/payments" },
  { label: "activity", path: "/project/activity" },
];

const contractorLinks = [
  { label: "dashboard", path: "/project/dashboard" },
  { label: "my tasks", path: "/project/milestones" },
  { label: "submit", path: "/project/submit" },
];

// Map routes to their screen color classes
const routeColorMap: Record<string, { bg: string; text: string; activeText: string; borderColor: string }> = {
  "/project/dashboard":  { bg: "bg-surface-orange", text: "text-surface-orange-foreground/40", activeText: "text-surface-orange-foreground", borderColor: "border-surface-orange-foreground" },
  "/project/milestones": { bg: "bg-surface-dark", text: "text-surface-dark-foreground/40", activeText: "text-surface-dark-foreground", borderColor: "border-surface-dark-foreground" },
  "/project/evidence":   { bg: "bg-surface-cream", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/payments":   { bg: "bg-surface-dark", text: "text-surface-dark-foreground/40", activeText: "text-surface-dark-foreground", borderColor: "border-surface-dark-foreground" },
  "/project/activity":   { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/submit":     { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
};

const defaultColors = { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" };

export function BottomNav() {
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  if (role === "client") return null;

  const links = role === "pm" ? pmLinks : contractorLinks;
  const colors = routeColorMap[location.pathname] ?? defaultColors;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 ${colors.bg} z-40 border-t border-current/5`}>
      <div className="max-w-md mx-auto flex justify-around py-4 px-6">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`font-mono text-[11px] transition-all pb-0.5 ${
                isActive
                  ? `${colors.activeText} border-b ${colors.borderColor}`
                  : `${colors.text}`
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
