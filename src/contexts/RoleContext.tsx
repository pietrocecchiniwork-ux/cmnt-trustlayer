import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "./DemoProjectContext";

export type UserRole = "pm" | "contractor" | "trade" | "client";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({ role: "pm", setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const { currentProjectId } = useProjectContext();
  const [role, setRole] = useState<UserRole>("pm");

  useEffect(() => {
    if (!currentProjectId) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("project_members")
        .select("role")
        .eq("project_id", currentProjectId)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role) setRole(data.role as UserRole);
        });
    });
  }, [currentProjectId]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
