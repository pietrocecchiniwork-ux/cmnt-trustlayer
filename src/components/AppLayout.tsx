import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { RoleSwitcher } from "./RoleSwitcher";
import { BurgerMenu } from "./BurgerMenu";

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden">
      <BurgerMenu />
      {/* Single scrollable region — pb-16 clears the fixed BottomNav (≈64px) */}
      <div className="h-full overflow-y-auto pb-16">
        <Outlet />
      </div>
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
