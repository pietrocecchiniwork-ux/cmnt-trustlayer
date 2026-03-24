import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "./DemoProjectContext";

export type UserRole = "pm" | "contractor" | "trade" | "client";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({ role: "client", setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const { currentProjectId } = useProjectContext();
  const [role, setRoleState] = useState<UserRole>("client");
  const [overrideKey, setOverrideKey] = useState<string | null>(null);

  const setRole = (newRole: UserRole) => {
    if (overrideKey) sessionStorage.setItem(overrideKey, newRole);
    setRoleState(newRole);
  };

  useEffect(() => {
    let cancelled = false;

    const resolveRole = async () => {
      if (!currentProjectId) {
        setRoleState("client");
        setOverrideKey(null);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setRoleState("client");
        setOverrideKey(null);
        return;
      }

      const key = `dev_role_override:${user.id}:${currentProjectId}`;
      setOverrideKey(key);

      const override = sessionStorage.getItem(key);
      if (override) {
        setRoleState(override as UserRole);
        return;
      }

      const { data, error } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", currentProjectId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Role lookup failed:", error);
        setRoleState("client");
        return;
      }

      setRoleState((data?.role as UserRole) ?? "client");
    };

    void resolveRole();

    return () => {
      cancelled = true;
    };
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
