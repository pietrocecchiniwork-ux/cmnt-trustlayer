import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  currentProjectId: null,
  setCurrentProjectId: () => {},
});

const STORAGE_KEY_PREFIX = "cmnt_current_project_id";

function getUserScopedStorageKey(userId: string | null) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? "guest"}`;
}

export function DemoProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string>(getUserScopedStorageKey(null));

  useEffect(() => {
    let mounted = true;

    const syncProjectForUser = async (userId: string | null) => {
      const nextKey = getUserScopedStorageKey(userId);
      if (!mounted) return;
      setStorageKey(nextKey);
      setCurrentProjectIdState(localStorage.getItem(nextKey));
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      void syncProjectForUser(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProjectForUser(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setCurrentProjectId = (id: string | null) => {
    setCurrentProjectIdState(id);
    if (id) localStorage.setItem(storageKey, id);
    else localStorage.removeItem(storageKey);
  };

  return (
    <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  return useContext(ProjectContext);
}

export function useDemoProject() {
  const ctx = useContext(ProjectContext);
  return {
    currentProjectId: ctx.currentProjectId,
    setCurrentProjectId: ctx.setCurrentProjectId,
  };
}
