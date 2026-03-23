import { createContext, useContext, useState, ReactNode } from "react";

// Demo data for the Kensington Mews project used throughout the prototype
export interface DemoMilestone {
  id: string;
  position: number;
  name: string;
  dueDate: string;
  paymentValue: number;
  status: "pending" | "in_progress" | "overdue" | "in_review" | "complete";
  assignedRole: string;
  description: string;
  evidenceRequired: string[];
}

export interface DemoProject {
  id: string;
  name: string;
  address: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  paymentMode: boolean;
  milestones: DemoMilestone[];
}

const kensingtonMilestones: DemoMilestone[] = [
  { id: "m1", position: 1, name: "site setup and demolition", dueDate: "10 jan 2026", paymentValue: 8000, status: "complete", assignedRole: "contractor", description: "Clear site, set up welfare facilities", evidenceRequired: ["site clearance", "welfare setup", "skip delivery"] },
  { id: "m2", position: 2, name: "foundations and groundwork", dueDate: "28 jan 2026", paymentValue: 15000, status: "complete", assignedRole: "contractor", description: "Excavation and concrete pour", evidenceRequired: ["excavation", "rebar placement", "concrete pour", "building control sign-off"] },
  { id: "m3", position: 3, name: "structural frame and roof", dueDate: "20 feb 2026", paymentValue: 22000, status: "complete", assignedRole: "contractor", description: "Steel frame erection and roof structure", evidenceRequired: ["frame erection", "roof trusses", "felt and battens"] },
  { id: "m4", position: 4, name: "first fix — electrical and plumbing", dueDate: "08 mar 2026", paymentValue: 11000, status: "in_review", assignedRole: "trade", description: "Rough-in electrical and plumbing", evidenceRequired: ["plumbing rough-in", "electrical rough-in", "gas installation", "inspection certificate"] },
  { id: "m5", position: 5, name: "plastering and drylining", dueDate: "22 mar 2026", paymentValue: 9000, status: "overdue", assignedRole: "trade", description: "Board and plaster all walls", evidenceRequired: ["boarding complete", "plaster coat", "drying check"] },
  { id: "m6", position: 6, name: "second fix and joinery", dueDate: "10 apr 2026", paymentValue: 14000, status: "pending", assignedRole: "trade", description: "Doors, skirting, kitchen units", evidenceRequired: ["door hanging", "skirting and architrave", "kitchen fit"] },
  { id: "m7", position: 7, name: "decoration and finishing", dueDate: "28 apr 2026", paymentValue: 7000, status: "pending", assignedRole: "trade", description: "Paint, tile, floor covering", evidenceRequired: ["painting", "tiling", "flooring"] },
  { id: "m8", position: 8, name: "final inspection and handover", dueDate: "12 may 2026", paymentValue: 6000, status: "pending", assignedRole: "contractor", description: "Snagging, building control, handover", evidenceRequired: ["snagging list", "building control final", "client walkthrough"] },
];

const demoProject: DemoProject = {
  id: "proj-1",
  name: "kensington mews",
  address: "14 Kensington Mews, London W8 5EP",
  startDate: "06 jan 2026",
  endDate: "12 may 2026",
  totalBudget: 92000,
  paymentMode: true,
  milestones: kensingtonMilestones,
};

const demoProjects: DemoProject[] = [
  demoProject,
  {
    id: "proj-2",
    name: "camden loft conversion",
    address: "23 Camden Road, London NW1 9LR",
    startDate: "01 feb 2026",
    endDate: "30 jun 2026",
    totalBudget: 65000,
    paymentMode: true,
    milestones: [],
  },
  {
    id: "proj-3",
    name: "shoreditch office fit-out",
    address: "8 Shoreditch High Street, London E1 6PG",
    startDate: "15 mar 2026",
    endDate: "15 aug 2026",
    totalBudget: 120000,
    paymentMode: false,
    milestones: [],
  },
];

interface DemoProjectContextType {
  projects: DemoProject[];
  currentProject: DemoProject | null;
  setCurrentProject: (project: DemoProject | null) => void;
}

const DemoProjectContext = createContext<DemoProjectContextType>({
  projects: demoProjects,
  currentProject: null,
  setCurrentProject: () => {},
});

export function DemoProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<DemoProject | null>(null);
  return (
    <DemoProjectContext.Provider value={{ projects: demoProjects, currentProject, setCurrentProject }}>
      {children}
    </DemoProjectContext.Provider>
  );
}

export function useDemoProject() {
  return useContext(DemoProjectContext);
}
