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
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
    >
      <div className="pointer-events-auto max-w-sm mx-auto p-1.5 flex items-center gap-1 rounded-full bg-primary text-primary-foreground">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={t(tab.key)}
              className={`h-11 rounded-full flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.08em] uppercase transition-all duration-300 ${
                isActive
                  ? "flex-[2] bg-card text-foreground px-4"
                  : "flex-1 text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              <Icon size={18} stroke={1.75} />
              {isActive && <span className="truncate">{t(tab.key)}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
