import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { RoleSwitcher } from "./RoleSwitcher";

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
