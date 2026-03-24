import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { RoleSwitcher } from "./RoleSwitcher";

export function AppLayout() {
  return (
    <>
      <div className="max-w-md mx-auto relative min-h-screen pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <RoleSwitcher />
    </>
  );
}
