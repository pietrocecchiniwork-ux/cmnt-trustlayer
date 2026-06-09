import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AssistantFab } from "./ProjectAssistant/AssistantFab";

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-full overflow-y-auto pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <AssistantFab />
    </div>
  );
}
