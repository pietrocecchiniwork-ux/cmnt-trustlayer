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
  const [role, setRoleState] = useState<UserRole>(() => {
    const override = sessionStorage.getItem("dev_role_override");
    return override ? (override as UserRole) : "pm";
  });

  const setRole = (newRole: UserRole) => {
    sessionStorage.setItem("dev_role_override", newRole);
    setRoleState(newRole);
  };

  useEffect(() => {
    // If there's a dev override, use it and skip DB lookup
    const override = sessionStorage.getItem("dev_role_override");
    if (override) {
      setRoleState(override as UserRole);
      return;
    }

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
          if (data?.role) setRoleState(data.role as UserRole);
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
