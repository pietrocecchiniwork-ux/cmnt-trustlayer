import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { RoleSwitcher } from "./RoleSwitcher";

export function AppLayout() {
  return (
    <div className="min-h-screen relative">
      <div className="max-w-md mx-auto pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
