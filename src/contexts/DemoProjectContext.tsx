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

export function DemoProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
