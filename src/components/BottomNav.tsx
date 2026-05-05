import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const linksByRole: Record<string, { key: string; path: string }[]> = {
    pm: [
      { key: "navigation.dashboard", path: "/project/dashboard" },
      { key: "navigation.milestones", path: "/project/milestones" },
      { key: "navigation.evidence", path: "/project/evidence" },
      { key: "navigation.payments", path: "/project/payments" },
      { key: "navigation.team", path: "/project/team" },
    ],
    contractor: [
      { key: "navigation.dashboard", path: "/project/dashboard" },
      { key: "navigation.my_work", path: "/project/milestones" },
      { key: "navigation.evidence", path: "/project/evidence" },
      { key: "navigation.activity", path: "/project/activity" },
      { key: "navigation.team", path: "/project/team" },
    ],
    trade: [
      { key: "navigation.dashboard", path: "/project/dashboard" },
      { key: "navigation.my_work", path: "/project/milestones" },
      { key: "navigation.evidence", path: "/project/evidence" },
      { key: "navigation.activity", path: "/project/activity" },
    ],
    client: [
      { key: "navigation.dashboard", path: "/project/dashboard" },
      { key: "navigation.activity", path: "/project/activity" },
    ],
  };

  const links = linksByRole[role] ?? linksByRole.client;

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-card rounded-full px-1.5 py-1.5 flex justify-between items-center gap-0.5">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex-1 min-w-0 h-9 px-1 rounded-full font-mono text-[10px] leading-none tracking-tight truncate transition-all ${
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
