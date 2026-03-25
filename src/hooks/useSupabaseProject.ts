import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ─── Projects ───

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) { console.error("useProject error:", error); throw error; }
      return data as Tables<"projects">;
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { console.error("useProjects error:", error); throw error; }
      return data as Tables<"projects">[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: Omit<TablesInsert<"projects">, "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, created_by: user.id })
        .select()
        .single();
      if (error) { console.error("createProject error:", error); throw error; }
      // Auto-add creator as PM member — this MUST succeed or milestone RLS will block inserts
      const { error: memberErr } = await supabase
        .from("project_members")
        .insert({
          project_id: data.id,
          user_id: user.id,
          name: user.email ?? "PM",
          role: "pm" as const,
          status: "active" as const,
          joined_at: new Date().toISOString(),
        });
      if (memberErr) {
        console.error("auto-add PM member error:", memberErr);
        throw new Error(`Project created but failed to add you as PM: ${memberErr.message}`);
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ─── Milestones ───

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ["milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId!)
        .order("position", { ascending: true });
      if (error) { console.error("useMilestones error:", error); throw error; }
      return data as Tables<"milestones">[];
    },
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: TablesInsert<"milestones">) => {
      const { data, error } = await supabase
        .from("milestones")
        .insert(milestone)
        .select()
        .single();
      if (error) { console.error("createMilestone error:", error); throw error; }
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["milestones", data.project_id] }),
  });
}

export function useUpdateMilestoneStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, projectId }: { id: string; status: string; projectId: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "complete") {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.approved_by = user?.id ?? null;
        updateData.approved_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("milestones")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateMilestoneStatus error:", error); throw error; }
      return { ...data, projectId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["milestones", data.projectId] }),
  });
}

// ─── Evidence ───

export function useEvidence(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ["evidence", milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .eq("milestone_id", milestoneId!)
        .order("submitted_at", { ascending: false });
      if (error) { console.error("useEvidence error:", error); throw error; }
      return data as Tables<"evidence">[];
    },
  });
}

export function useProjectEvidence(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-evidence", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // Get milestone IDs for this project first
      const { data: milestones, error: mErr } = await supabase
        .from("milestones")
        .select("id, name")
        .eq("project_id", projectId!);
      if (mErr) { console.error("useProjectEvidence milestones error:", mErr); throw mErr; }
      if (!milestones?.length) return [];
      const milestoneIds = milestones.map(m => m.id);
      const milestoneMap = Object.fromEntries(milestones.map(m => [m.id, m.name]));
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("submitted_at", { ascending: false });
      if (error) { console.error("useProjectEvidence error:", error); throw error; }
      return (data ?? []).map(e => ({ ...e, milestone_name: milestoneMap[e.milestone_id] ?? "" }));
    },
  });
}

export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evidence: TablesInsert<"evidence">) => {
      const { data, error } = await supabase
        .from("evidence")
        .insert(evidence)
        .select()
        .single();
      if (error) { console.error("submitEvidence error:", error); throw error; }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["evidence", data.milestone_id] });
      qc.invalidateQueries({ queryKey: ["project-evidence"] });
    },
  });
}

export function useUpdateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      milestoneId,
      ...updates
    }: {
      id: string;
      milestoneId: string;
      note?: string;
      ai_tags?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("evidence")
        .update(updates as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateEvidence error:", error); throw error; }
      return { ...data, milestoneId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["evidence", data.milestoneId] });
      qc.invalidateQueries({ queryKey: ["project-evidence"] });
    },
  });
}

// ─── Team members ───

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId!);
      if (error) { console.error("useProjectMembers error:", error); throw error; }
      return data as Tables<"project_members">[];
    },
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: TablesInsert<"project_members">) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired — please log in again");

      const { data, error } = await supabase
        .from("project_members")
        .insert(member)
        .select()
        .single();

      if (error) {
        console.error("addProjectMember error:", error);
        if (error.message?.includes("row-level security")) {
          throw new Error("You can only invite members to a project where you are active.");
        }
        throw new Error(error.message || "Failed to add project member");
      }

      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["project-members", data.project_id] }),
  });
}

export function useUpdateProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; project_id: string; role?: "pm" | "contractor" | "trade" | "client"; name?: string; phone_number?: string | null; status?: "invited" | "confirmed" | "active" }) => {
      const { data, error } = await supabase
        .from("project_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateProjectMember error:", error); throw error; }
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["project-members", data.project_id] }),
  });
}

export function useDeleteProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      // Verify we have an active session before deleting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired — please log in again");
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", id)
        .eq("project_id", project_id);
      if (error) { console.error("deleteProjectMember error:", error); throw error; }
      return { project_id };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["project-members", data.project_id] }),
  });
}

// ─── Payments ───

export function usePaymentCertificates(projectId: string | undefined) {
  return useQuery({
    queryKey: ["payment-certificates", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: milestones, error: mErr } = await supabase
        .from("milestones")
        .select("id, name, payment_value")
        .eq("project_id", projectId!);
      if (mErr) { console.error("usePaymentCertificates milestones error:", mErr); throw mErr; }
      if (!milestones?.length) return [];
      const milestoneIds = milestones.map(m => m.id);
      const milestoneMap = Object.fromEntries(milestones.map(m => [m.id, { name: m.name, value: m.payment_value }]));
      const { data, error } = await supabase
        .from("payment_certificates")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("generated_at", { ascending: false });
      if (error) { console.error("usePaymentCertificates error:", error); throw error; }
      return (data ?? []).map(p => ({ ...p, milestone_name: milestoneMap[p.milestone_id]?.name ?? "" }));
    },
  });
}

// ─── Storage ───

export async function uploadEvidencePhoto(file: Blob, fileName: string): Promise<string> {
  const path = `${Date.now()}_${fileName}`;
  const { error } = await supabase.storage
    .from("evidence-photos")
    .upload(path, file, { contentType: "image/jpeg" });
  if (error) { console.error("uploadEvidencePhoto error:", error); throw error; }
  const { data } = supabase.storage.from("evidence-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Local types for new tables (not yet in generated types) ───

export type Task = {
  id: string;
  milestone_id: string;
  name: string;
  description: string | null;
  position: number;
  status: "pending" | "in_progress" | "complete";
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_role: string | null;
  evidence_required: boolean;
  due_date: string | null;
  budget: number | null;
  depends_on: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
};

export type ProjectChange = {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  change_type: string;
  changed_by: string | null;
  changed_by_name: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
};

// ─── Tasks ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("id", taskId!)
        .single();
      if (error) { console.error("useTask error:", error); throw error; }
      return data as Task;
    },
  });
}

export function useTasks(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("milestone_id", milestoneId!)
        .order("position", { ascending: true });
      if (error) { console.error("useTasks error:", error); throw error; }
      return data as Task[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: {
      milestone_id: string;
      name: string;
      description?: string;
      position: number;
      assigned_to?: string;
      assigned_to_name?: string;
      assigned_role?: string;
      evidence_required?: boolean;
      due_date?: string;
      budget?: number;
      depends_on?: string;
    }) => {
      const { data, error } = await db
        .from("tasks")
        .insert(task)
        .select()
        .single();
      if (error) { console.error("createTask error:", error); throw error; }
      return data as Task;
    },
    onSuccess: (data: Task) => qc.invalidateQueries({ queryKey: ["tasks", data.milestone_id] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      milestoneId,
      ...updates
    }: {
      id: string;
      milestoneId: string;
      status?: string;
      name?: string;
      description?: string;
      position?: number;
      assigned_to?: string;
      assigned_to_name?: string;
      assigned_role?: string;
      evidence_required?: boolean;
      due_date?: string;
      budget?: number;
      depends_on?: string | null;
      completed_at?: string;
      completed_by?: string;
    }) => {
      const { data, error } = await db
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateTask error:", error); throw error; }
      return { ...(data as Task), milestoneId };
    },
    onSuccess: (data: Task & { milestoneId: string }) =>
      qc.invalidateQueries({ queryKey: ["tasks", data.milestoneId] }),
  });
}

// ─── Project changes ───

export function useCreateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (change: {
      project_id: string;
      entity_type: string;
      entity_id?: string;
      entity_name?: string;
      change_type: string;
      changed_by?: string;
      changed_by_name?: string;
      old_value?: Record<string, unknown>;
      new_value?: Record<string, unknown>;
      note?: string;
    }) => {
      const { data, error } = await db
        .from("project_changes")
        .insert(change)
        .select()
        .single();
      if (error) { console.error("createChange error:", error); throw error; }
      return data as ProjectChange;
    },
    onSuccess: (data: ProjectChange) =>
      qc.invalidateQueries({ queryKey: ["project-changes", data.project_id] }),
  });
}

export function useProjectChanges(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-changes", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db
        .from("project_changes")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) { console.error("useProjectChanges error:", error); throw error; }
      return data as ProjectChange[];
    },
  });
}

export function useTaskChanges(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-changes", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await db
        .from("project_changes")
        .select("*")
        .eq("entity_id", taskId!)
        .order("created_at", { ascending: false });
      if (error) { console.error("useTaskChanges error:", error); throw error; }
      return data as ProjectChange[];
    },
  });
}

// ─── Milestones update (for inline edit) ───

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      ...updates
    }: {
      id: string;
      projectId: string;
      name?: string;
      due_date?: string;
      payment_value?: number;
      assigned_to?: string | null;
      assigned_to_name?: string | null;
    }) => {
      const { data, error } = await db
        .from("milestones")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateMilestone error:", error); throw error; }
      return { ...data, projectId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["milestones", data.projectId] }),
  });
}

// ─── Auth helper ───

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error("useCurrentUser error:", error);
      return user;
    },
    staleTime: 1000 * 60 * 5,
  });
}
