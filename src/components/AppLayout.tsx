import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { RoleSwitcher } from "./RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";

function TopBar() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-4 px-5 py-3">
      <button
        onClick={() => navigate("/demo")}
        className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        demo
      </button>
      <button
        onClick={handleSignOut}
        className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        sign out
      </button>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Outlet />
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
