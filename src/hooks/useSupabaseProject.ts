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
      // Auto-add creator as PM member
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
      if (memberErr) console.error("auto-add PM member error:", memberErr);
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
      const { data, error } = await supabase
        .from("project_members")
        .insert(member)
        .select()
        .single();
      if (error) { console.error("addProjectMember error:", error); throw error; }
      return data;
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

// ─── Tasks ───

export function useTasks(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("milestone_id", milestoneId!)
        .order("position", { ascending: true });
      if (error) { console.error("useTasks error:", error); throw error; }
      return data;
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
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();
      if (error) { console.error("createTask error:", error); throw error; }
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["tasks", data.milestone_id] }),
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
      completed_at?: string;
      completed_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("updateTask error:", error); throw error; }
      return { ...data, milestoneId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["tasks", data.milestoneId] }),
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
      const { data, error } = await supabase
        .from("project_changes")
        .insert(change)
        .select()
        .single();
      if (error) { console.error("createChange error:", error); throw error; }
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["project-changes", data.project_id] }),
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
