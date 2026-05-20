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
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-gray-200"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="max-w-md mx-auto px-3 pt-2 flex justify-between items-center gap-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 min-w-0 h-10 px-2 rounded-full font-mono text-[10px] leading-none tracking-[0.06em] uppercase truncate transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={18} stroke={1.75} />
              {t(tab.key)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
