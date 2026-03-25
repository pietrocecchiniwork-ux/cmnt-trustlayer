import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";

// Map routes to their screen color classes
const routeColorMap: Record<string, { bg: string; text: string; activeText: string; borderColor: string }> = {
  "/project/dashboard":  { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/milestones": { bg: "bg-surface-dark", text: "text-surface-dark-foreground/40", activeText: "text-surface-dark-foreground", borderColor: "border-surface-dark-foreground" },
  "/project/evidence":   { bg: "bg-surface-cream", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/payments":   { bg: "bg-surface-dark", text: "text-surface-dark-foreground/40", activeText: "text-surface-dark-foreground", borderColor: "border-surface-dark-foreground" },
  "/project/activity":   { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/team":       { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
  "/project/submit":     { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" },
};

const defaultColors = { bg: "bg-background", text: "text-foreground/40", activeText: "text-foreground", borderColor: "border-foreground" };

export function BottomNav() {
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (role === "client") return null;

  const pmLinks = [
    { key: "navigation.dashboard", path: "/project/dashboard" },
    { key: "navigation.milestones", path: "/project/milestones" },
    { key: "navigation.evidence", path: "/project/evidence" },
    { key: "navigation.payments", path: "/project/payments" },
    { key: "navigation.activity", path: "/project/activity" },
    { key: "navigation.team", path: "/project/team" },
  ];

  const contractorLinks = [
    { key: "navigation.dashboard", path: "/project/dashboard" },
    { key: "navigation.my_tasks", path: "/project/milestones" },
    { key: "navigation.submit", path: "/project/submit" },
    { key: "navigation.activity", path: "/project/activity" },
    { key: "navigation.team", path: "/project/team" },
  ];

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
              {t(link.key)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
