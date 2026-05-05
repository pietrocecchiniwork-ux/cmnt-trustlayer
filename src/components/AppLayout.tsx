import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

const sectionLabels: Record<string, string> = {
  "/project/dashboard": "dashboard",
  "/project/milestones": "milestones",
  "/project/evidence": "evidence",
  "/project/payments": "payments",
  "/project/activity": "activity",
  "/project/team": "team",
  "/project/submit": "submit",
};

export function AppLayout() {
  const location = useLocation();
  const label = sectionLabels[location.pathname];

  return (
    <div className="h-screen overflow-hidden">
      {/* Top hairline rail; burger trigger from BurgerMenu sits over right edge */}
      <header className="fixed top-0 left-0 right-0 z-30 h-10 bg-background border-b border-hairline flex items-center px-5">
        {label && <span className="t-eyebrow">{label}</span>}
      </header>
      {/* pt-10 clears top rail; pb-16 clears BottomNav */}
      <div className="h-full overflow-y-auto pt-10 pb-16">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
