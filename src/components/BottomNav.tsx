import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconInbox, IconLayoutList, IconCreditCard } from "@tabler/icons-react";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const tabs = [
    { key: "navigation.inbox", path: "/project/dashboard", icon: IconInbox },
    { key: "navigation.project", path: "/project/milestones", icon: IconLayoutList },
    { key: "navigation.payments", path: "/project/payments", icon: IconCreditCard },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-card rounded-full px-2 py-1.5 flex justify-between items-center gap-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 min-w-0 h-9 px-2 rounded-full font-mono text-[10px] leading-none tracking-tight truncate transition-all flex items-center justify-center gap-1 ${
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} stroke={1.5} />
              {t(tab.key)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
