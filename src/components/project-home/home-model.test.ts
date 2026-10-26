import { describe, expect, it } from "vitest";
import { visibleHomeMilestones, releasedPayments } from "./home-model";
import type { Tables } from "@/integrations/supabase/types";
import type { Task } from "@/hooks/useSupabaseProject";
const milestones = [
  { id: "assigned", assigned_to: "worker" },
  { id: "task-parent", assigned_to: "other" },
  { id: "unrelated", assigned_to: "other" },
] as Tables<"milestones">[];
const tasks = [{ milestone_id: "task-parent", assigned_to: "worker" }, { milestone_id: "assigned", assigned_to: "other" }] as Task[];
describe("unified project home", () => {
  it("keeps a directly assigned milestone visible when someone else has a task", () => {
    expect(visibleHomeMilestones(milestones, tasks, "contractor", "worker").map(m => m.id)).toEqual(["assigned", "task-parent"]);
  });
  it("shows project managers and clients every stage", () => {
    expect(visibleHomeMilestones(milestones, tasks, "pm", "worker")).toHaveLength(3);
    expect(visibleHomeMilestones(milestones, tasks, "client", "worker")).toHaveLength(3);
  });
  it("does not show contractor assignments without an identity", () => {
    expect(visibleHomeMilestones(milestones, tasks, "trade")).toEqual([]);
  });
  it("counts only authorized certificates as released, not completed stages or pending payments", () => {
    expect(releasedPayments([{ amount: 2500, payment_status: "authorized" }, { amount: 9000, payment_status: "awaiting_client_authorization" }])).toBe(2500);
  });
});
