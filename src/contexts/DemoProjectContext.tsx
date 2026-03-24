import { createContext, useContext, useState, ReactNode } from "react";

// This context now stores only the selected project ID.
// All data fetching is done via hooks in useSupabaseProject.ts.

interface ProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  currentProjectId: null,
  setCurrentProjectId: () => {},
});

const STORAGE_KEY = "cmnt_current_project_id";

export function DemoProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, _setCurrentProjectId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const setCurrentProjectId = (id: string | null) => {
    _setCurrentProjectId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
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

// Keep old name for backward compat during migration
export function useDemoProject() {
  const ctx = useContext(ProjectContext);
  return {
    currentProjectId: ctx.currentProjectId,
    setCurrentProjectId: ctx.setCurrentProjectId,
  };
}
