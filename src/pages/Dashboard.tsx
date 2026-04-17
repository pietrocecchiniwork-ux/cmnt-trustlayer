import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useMilestones, useCurrentUser } from "@/hooks/useSupabaseProject";
import { useRealtimeMilestones, useRealtimeEvidence } from "@/hooks/useRealtimeSubscription";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Task } from "@/hooks/useSupabaseProject";
import { generateEvidencePackPdf, downloadBlob } from "@/lib/evidencePdf";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { HealthDashboard } from "@/components/HealthDashboard";

export default function Dashboard() {
  const { role } = useRole();
  if (role === "pm" || role === "client") return <PMDashboard />;
  return <ContractorDashboard />;
}

/* ───────────────────── PM / CLIENT DASHBOARD ───────────────────── */

function PMDashboard() {
  const navigate = useNavigate();
  const { currentProjectId, setCurrentProjectId } = useProjectContext();
  const { role } = useRole();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: milestones = [], isLoading } = useMilestones(currentProjectId ?? undefined);
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);

  const [isAnon, setIsAnon] = useState(false);
  const [authorizing, setAuthorizing] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.is_anonymous) setIsAnon(true);
    });
  }, []);

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", currentProjectId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch evidence counts for in_review milestones
  const inReviewIds = milestones.filter(m => m.status === "in_review").map(m => m.id);
  const { data: evidenceCounts = {} } = useQuery({
    queryKey: ["evidence-counts", inReviewIds],
    enabled: inReviewIds.length > 0,
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of inReviewIds) {
        const { count } = await supabase
          .from("evidence")
          .select("id", { count: "exact", head: true })
          .eq("milestone_id", id);
        counts[id] = count ?? 0;
      }
      return counts;
    },
  });

  // Fetch assigned_to_name for in_progress milestones (from milestone itself now)
  const inProgressMilestones = milestones.filter(m => m.status === "in_progress");

  // Payment certificates for PM view
  const { data: paymentCerts = [] } = useQuery({
    queryKey: ["pm-payment-certs", currentProjectId],
    enabled: !!currentProjectId && role === "pm",
    queryFn: async () => {
      const { data: ms } = await supabase.from("milestones").select("id, name").eq("project_id", currentProjectId!);
      if (!ms?.length) return [];
      const ids = ms.map(m => m.id);
      const nameMap = Object.fromEntries(ms.map(m => [m.id, m.name]));
      const { data } = await supabase.from("payment_certificates").select("*").in("milestone_id", ids);
      return (data ?? []).map((p: any) => ({ ...p, milestone_name: nameMap[p.milestone_id] ?? "" }));
    },
  });

  // Client payment authorization
  const { data: clientPaymentCerts = [] } = useQuery({
    queryKey: ["client-payment-certs", currentProjectId],
    enabled: !!currentProjectId && role === "client",
    queryFn: async () => {
      const { data: ms } = await supabase.from("milestones").select("id, name, payment_value").eq("project_id", currentProjectId!);
      if (!ms?.length) return [];
      const ids = ms.map(m => m.id);
      const nameMap = Object.fromEntries(ms.map(m => [m.id, { name: m.name, value: m.payment_value }]));
      const { data } = await (supabase as any).from("payment_certificates").select("*").in("milestone_id", ids).eq("payment_status", "awaiting_client_authorization");
      return (data ?? []).map((p: any) => ({ ...p, milestone_name: nameMap[p.milestone_id]?.name ?? "", payment_value: nameMap[p.milestone_id]?.value ?? 0 }));
    },
  });

  const [isCreator, setIsCreator] = useState(false);
  useEffect(() => {
    if (!project) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsCreator(user?.id === project.created_by);
    });
  }, [project]);

  const handleCancelProject = async () => {
    if (!currentProjectId) return;
    setCancelling(true);
    try {
      const { error } = await (supabase as any)
        .from("projects")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", currentProjectId);
      if (error) throw error;
      toast.success("Project cancelled");
      setCurrentProjectId(null);
      navigate("/");
    } catch {
      toast.error("Failed to cancel project");
    } finally {
      setCancelling(false);
      setCancelStep(0);
    }
  };

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  if (!project) return null;

  const completed = milestones.filter(m => m.status === "complete").length;
  const total = milestones.length;
  const releasedBudget = milestones
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + Number(m.payment_value ?? 0), 0);

  const needsApproval = milestones.filter(m => m.status === "in_review");
  const delays = milestones.filter(m => m.status === "overdue");
  const inProgress = inProgressMilestones;
  const pending = milestones.filter(m => m.status === "pending");
  const disputed = milestones.filter(m => (m.status as string) === "disputed");

  const handleAuthorize = async (cert: any) => {
    if (!currentUser) return;
    setAuthorizing(cert.id);
    try {
      const now = new Date().toISOString();
      await (supabase as any).from("payment_certificates").update({ payment_status: "authorized", released_at: now, released_by: currentUser.id }).eq("id", cert.id);
      if (currentProjectId) {
        await (supabase as any).from("project_changes").insert({
          project_id: currentProjectId,
          entity_type: "payment",
          entity_id: cert.milestone_id,
          entity_name: cert.milestone_name,
          change_type: "authorized",
          changed_by: currentUser.id,
          changed_by_name: currentUser.email,
          new_value: { amount: cert.amount, milestone_name: cert.milestone_name },
        });
      }
      // Notify PM + assigned contractor of payment authorization
      try {
        const { data: members } = await supabase
          .from("project_members")
          .select("name, email, role, user_id")
          .eq("project_id", currentProjectId!)
          .eq("status", "active");
        const ms = milestones.find(m => m.id === cert.milestone_id);
        const assignedUserId = (ms as any)?.assigned_to;
        const recipients = (members ?? []).filter(m => m.email && (m.role === "pm" || m.user_id === assignedUserId));
        for (const r of recipients) {
          await sendTransactionalEmail({
            templateName: "payment-authorized",
            recipientEmail: r.email!,
            idempotencyKey: `payment-authorized-${cert.id}-${r.email}`,
            templateData: {
              recipientName: r.name?.split(" ")[0] ?? null,
              milestoneName: cert.milestone_name,
              projectName: project?.name ?? null,
              amount: cert.amount,
              certificateRef: `CMT-${cert.id.slice(0, 8).toUpperCase()}`,
              authorizedBy: currentUser.email?.split("@")[0] ?? "client",
            },
          });
        }
      } catch (emailErr) {
        console.warn("payment-authorized email failed:", emailErr);
      }
      toast.success("Payment authorized");
      queryClient.invalidateQueries({ queryKey: ["client-payment-certs"] });
      queryClient.invalidateQueries({ queryKey: ["pm-payment-certs"] });
      queryClient.invalidateQueries({ queryKey: ["payment-certificates"] });
    } catch {
      toast.error("Failed to authorize payment");
    } finally {
      setAuthorizing(null);
    }
  };

  const handleExportPack = async () => {
    if (!currentProjectId || !project) return;
    setGeneratingPdf(true);
    try {
      const { data: ev } = await supabase
        .from("evidence")
        .select("id, milestone_id, photo_url, note, submitted_at, ai_tags")
        .in("milestone_id", milestones.map(m => m.id))
        .order("submitted_at", { ascending: true });
      const { data: pmRow } = await supabase
        .from("project_members")
        .select("user_id, name, role")
        .eq("project_id", currentProjectId)
        .eq("role", "pm")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      const blob = await generateEvidencePackPdf({
        project: { name: project.name, address: project.address, project_code: (project as any).project_code ?? null },
        milestones: milestones.map(m => ({
          id: m.id, name: m.name, status: m.status, position: m.position,
          due_date: m.due_date, payment_value: m.payment_value, approved_at: (m as any).approved_at ?? null,
        })),
        evidence: (ev ?? []) as any,
        pmMember: pmRow as any,
      });
      const safeName = (project.name || "project").replace(/\s+/g, "_");
      downloadBlob(blob, `${safeName}_evidence_pack.pdf`);
      toast.success("Evidence pack generated");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const awaitingCerts = paymentCerts.filter((p: any) => p.payment_status === "awaiting_client_authorization");
  const releasedCerts = paymentCerts.filter((p: any) => p.payment_status === "authorized");

  const allClear = needsApproval.length === 0 && delays.length === 0 && inProgress.length === 0 && pending.length === 0 && disputed.length === 0 && (role === "pm" ? awaitingCerts.length === 0 : clientPaymentCerts.length === 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-10 pb-0">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              ← all projects
            </button>
            {isAnon && (
              <button onClick={handleExitDemo} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-opacity">
                {t("auth.sign_out")}
              </button>
            )}
          </div>

          <p className="font-mono text-[28px] tracking-tight text-foreground mt-6">
            {project.name?.toLowerCase()}
          </p>
          <div className="flex items-end justify-between mt-1 gap-3">
            <p className="font-mono text-[12px] text-muted-foreground">
              {completed} of {total} milestones complete · £{releasedBudget.toLocaleString()} released
            </p>
            {role === "pm" && total > 0 && (
              <button
                onClick={handleExportPack}
                disabled={generatingPdf}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 flex-shrink-0"
              >
                {generatingPdf ? "generating..." : "export pack (pdf)"}
              </button>
            )}
          </div>
        </div>

        {/* PM-only health dashboard */}
        {role === "pm" && (
          <HealthDashboard milestones={milestones as any} needsApprovalCount={needsApproval.length} />
        )}

        {/* Action queue */}
        <div className="px-6 mt-8 flex-1">
          {allClear ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-sans text-[16px] text-muted-foreground">all clear — no actions needed</p>
            </div>
          ) : (
            <div className="space-y-8">
              {needsApproval.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">needs approval</p>
                  <div className="space-y-2">
                    {needsApproval.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-accent">{evidenceCounts[m.id] ?? 0} evidence</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {delays.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">delays to review</p>
                  <div className="space-y-2">
                    {delays.map(m => {
                      const daysOverdue = m.due_date ? differenceInDays(new Date(), new Date(m.due_date)) : 0;
                      return (
                        <button
                          key={m.id}
                          onClick={() => navigate("/project/cascade-review")}
                          className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                        >
                          <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                          <span className="font-mono text-[11px] text-destructive">{daysOverdue}d overdue</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {inProgress.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">waiting for evidence</p>
                  <div className="space-y-2">
                    {inProgress.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {(m as any).assigned_to_name ?? "unassigned"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pending.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">not started</p>
                  <div className="space-y-2">
                    {pending.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {(m as any).assigned_to_name ?? "unassigned"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {disputed.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">disputed</p>
                  <div className="space-y-2">
                    {disputed.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/project/milestone/${m.id}`)}
                        className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                      >
                        <span className="font-sans text-[14px] text-foreground">{m.name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-destructive">disputed</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PM: payment certificate status */}
              {role === "pm" && awaitingCerts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">awaiting client authorization</p>
                  <div className="space-y-2">
                    {awaitingCerts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-3 border-b border-border">
                        <span className="font-sans text-[14px] text-foreground">{c.milestone_name?.toLowerCase()}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">£{Number(c.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client: authorize payments */}
              {role === "client" && clientPaymentCerts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">payments awaiting your authorization</p>
                  <div className="space-y-2">
                    {clientPaymentCerts.map((c: any) => (
                      <div key={c.id} className="space-y-2 py-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-[14px] text-foreground">{c.milestone_name?.toLowerCase()}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">£{Number(c.amount).toLocaleString()}</span>
                        </div>
                        <Button variant="dark" size="full" onClick={() => handleAuthorize(c)} disabled={authorizing === c.id}>
                          <span className="font-sans text-[16px]">{authorizing === c.id ? "authorizing..." : "authorize payment"}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cancel project (creator + PM only) */}
        {isCreator && role === "pm" && (
          <div className="px-6 pb-6">
            {cancelStep === 0 && (
              <button onClick={() => setCancelStep(1)} className="w-full font-mono text-[11px] text-destructive/60 hover:text-destructive transition-colors text-center py-3">
                cancel project
              </button>
            )}
            {cancelStep === 1 && (
              <div className="border border-destructive/30 p-4 space-y-3">
                <p className="font-mono text-[12px] text-foreground">are you sure you want to cancel this project?</p>
                <p className="font-mono text-[11px] text-muted-foreground">this will hide the project from all members. this action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setCancelStep(0)} className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border hover:border-foreground/40 transition-colors">go back</button>
                  <button onClick={() => setCancelStep(2)} className="flex-1 py-2 font-mono text-[12px] text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors">yes, cancel</button>
                </div>
              </div>
            )}
            {cancelStep === 2 && (
              <div className="border border-destructive p-4 space-y-3">
                <p className="font-mono text-[13px] text-destructive font-bold">final confirmation</p>
                <p className="font-mono text-[11px] text-foreground">type the project name to confirm: <strong>{project.name}</strong></p>
                <CancelConfirmInput projectName={project.name} onConfirm={handleCancelProject} onCancel={() => setCancelStep(0)} cancelling={cancelling} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── CONTRACTOR / TRADE DASHBOARD ─────────────── */

function ContractorDashboard() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { t } = useTranslation();
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(currentProjectId ?? undefined);
  const { data: user } = useCurrentUser();
  useRealtimeMilestones(currentProjectId ?? undefined);

  const { data: project } = useQuery({
    queryKey: ["project", currentProjectId],
    enabled: !!currentProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", currentProjectId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all tasks across all milestones assigned to this user
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["all-user-tasks", currentProjectId, user?.id],
    enabled: !!currentProjectId && !!user && milestones.length > 0,
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .in("milestone_id", milestoneIds)
        .eq("assigned_to", user!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  // Milestones assigned directly to this user (Mode A — no tasks)
  const myMilestones = useMemo(() => {
    if (!user) return [];
    return milestones.filter(m =>
      (m as any).assigned_to === user.id &&
      m.status !== "complete"
    );
  }, [milestones, user]);

  // Check which milestones have tasks
  const milestonesWithTasks = useMemo(() => {
    const set = new Set(allTasks.map(t => t.milestone_id));
    return set;
  }, [allTasks]);

  // We need to know ALL tasks per milestone to determine Mode A vs B
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["all-project-tasks-for-mode", currentProjectId],
    enabled: !!currentProjectId && milestones.length > 0,
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("id, milestone_id")
        .in("milestone_id", milestoneIds);
      if (error) throw error;
      return (data ?? []) as { id: string; milestone_id: string }[];
    },
  });

  const milestonesWithAnyTasks = useMemo(() => {
    return new Set(allProjectTasks.map(t => t.milestone_id));
  }, [allProjectTasks]);

  // Build unified work list: Mode A milestones (no tasks) + Mode B tasks
  type WorkItem = {
    id: string;
    name: string;
    type: "milestone" | "task";
    parentMilestoneName: string;
    milestonePosition: number;
    position: number;
    status: string;
    dueDate: string | null;
    milestoneId: string;
    taskId: string | null;
  };

  const workItems = useMemo<WorkItem[]>(() => {
    const items: WorkItem[] = [];

    // Mode A: milestones assigned to user with NO tasks
    for (const m of myMilestones) {
      if (!milestonesWithAnyTasks.has(m.id)) {
        items.push({
          id: m.id,
          name: m.name,
          type: "milestone",
          parentMilestoneName: "",
          milestonePosition: m.position,
          position: 0,
          status: m.status,
          dueDate: m.due_date,
          milestoneId: m.id,
          taskId: null,
        });
      }
    }

    // Mode B: tasks assigned to user
    const incompleteTasks = allTasks.filter(t => t.status !== "complete");
    for (const t of incompleteTasks) {
      const m = milestones.find(ms => ms.id === t.milestone_id);
      items.push({
        id: t.id,
        name: t.name,
        type: "task",
        parentMilestoneName: m?.name ?? "",
        milestonePosition: m?.position ?? 999,
        position: t.position,
        status: t.status,
        dueDate: t.due_date ?? m?.due_date ?? null,
        milestoneId: t.milestone_id,
        taskId: t.id,
      });
    }

    // Sort by due date, then milestone position, then task position
    items.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const cmp = a.dueDate.localeCompare(b.dueDate);
        if (cmp !== 0) return cmp;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;
      if (a.milestonePosition !== b.milestonePosition) return a.milestonePosition - b.milestonePosition;
      return a.position - b.position;
    });

    return items;
  }, [myMilestones, allTasks, milestones, milestonesWithAnyTasks]);

  const urgentItem = workItems[0] ?? null;
  const otherItems = workItems.slice(1);

  const urgentMilestone = urgentItem
    ? milestones.find(m => m.id === urgentItem.milestoneId)
    : null;
  const urgentMilestoneNumber = urgentMilestone
    ? urgentMilestone.position
    : 0;

  const isLoading = milestonesLoading || tasksLoading;

  if (!currentProjectId || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-mono text-[13px] text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    );
  }

  const statusDot: Record<string, string> = {
    pending: "bg-muted-foreground",
    in_progress: "bg-foreground",
    overdue: "bg-destructive",
    in_review: "bg-accent",
    complete: "bg-success",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-10">
          <button onClick={() => navigate("/")} className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            ← all projects
          </button>
          <p className="font-mono text-[20px] tracking-tight text-foreground mt-4">
            {project?.name?.toLowerCase()}
          </p>
        </div>

        {!urgentItem ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="font-sans text-[16px] text-muted-foreground text-center">
              no tasks assigned yet — ask your PM for the project code
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 mt-8 flex-1">
              <p className="font-mono text-[80px] leading-none tracking-tight text-foreground">
                {urgentMilestoneNumber}
              </p>
              <p className="font-sans text-[20px] text-foreground mt-2">
                {urgentItem.name}
              </p>
              <p className="font-mono text-[12px] text-muted-foreground mt-1">
                {urgentItem.type === "task"
                  ? urgentItem.parentMilestoneName?.toLowerCase()
                  : "milestone"}
              </p>

              {otherItems.length > 0 && (
                <div className="mt-10">
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-3">also outstanding</p>
                  <div className="space-y-1">
                    {otherItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() =>
                          item.type === "milestone"
                            ? navigate(`/project/milestone/${item.milestoneId}`)
                            : navigate(`/project/task/${item.taskId}`)
                        }
                        className="w-full flex items-center justify-between py-2 border-b border-border text-left"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[item.status] ?? "bg-muted-foreground"}`} />
                          <span className="font-sans text-[14px] text-foreground truncate">{item.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                          {item.type === "task" ? item.parentMilestoneName?.toLowerCase() : "milestone"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="fixed bottom-16 left-0 right-0 px-6 bg-background"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: '12px' }}
            >
              <button
                onClick={() => {
                  if (urgentItem.type === "milestone") {
                    // Mode A: submit evidence directly against milestone
                    navigate(
                      `/project/camera?milestoneId=${urgentItem.milestoneId}&item=${encodeURIComponent(urgentItem.name)}`
                    );
                  } else {
                    // Mode B: submit evidence against task
                    navigate(
                      `/project/camera?milestoneId=${urgentItem.milestoneId}&item=${encodeURIComponent(urgentItem.name)}&taskId=${urgentItem.taskId}&taskName=${encodeURIComponent(urgentItem.name)}`
                    );
                  }
                }}
                className="w-full py-4 bg-foreground text-background font-sans text-[16px] text-center"
              >
                submit evidence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Cancel confirm input ─────────────── */

function CancelConfirmInput({
  projectName,
  onConfirm,
  onCancel,
  cancelling,
}: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const [input, setInput] = useState("");
  const matches = input.trim().toLowerCase() === projectName.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder={projectName}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full bg-transparent border-b border-border font-mono text-[13px] text-foreground py-2 outline-none"
      />
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2 font-mono text-[12px] text-muted-foreground border border-border">go back</button>
        <button onClick={onConfirm} disabled={!matches || cancelling} className="flex-1 py-2 font-mono text-[12px] text-destructive border border-destructive disabled:opacity-30">
          {cancelling ? "cancelling…" : "confirm cancel"}
        </button>
      </div>
    </div>
  );
}
