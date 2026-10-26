import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Camera, CheckCircle2, Circle, FileText, Layers, ListChecks, Search, Wallet } from "lucide-react";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useRole } from "@/contexts/RoleContext";
import { useCurrentUser, useMilestones, usePaymentCertificates, useProject, useProjectEvidence, useCreateChange, type Task } from "@/hooks/useSupabaseProject";
import { useRealtimeEvidence, useRealtimeMilestones } from "@/hooks/useRealtimeSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { toast } from "sonner";
import { homeDate, money, releasedPayments, visibleHomeMilestones } from "./home-model";

const statusTone: Record<string, string> = {
  complete: "bg-success/10 text-success", in_review: "bg-accent/10 text-accent",
  overdue: "bg-destructive/10 text-destructive", disputed: "bg-destructive/10 text-destructive",
  in_progress: "bg-accent/10 text-accent", pending: "bg-secondary text-muted-foreground",
};
const statusLabel = (status: string) => status.replace(/_/g, " ");
type Filter = "all" | "active" | "review" | "complete";

export function UnifiedProjectHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentProjectId } = useProjectContext();
  const { role } = useRole();
  const { data: user } = useCurrentUser();
  const projectQuery = useProject(currentProjectId ?? undefined);
  const milestoneQuery = useMilestones(currentProjectId ?? undefined);
  const evidenceQuery = useProjectEvidence(currentProjectId ?? undefined);
  const paymentQuery = usePaymentCertificates(currentProjectId ?? undefined);
  const project = projectQuery.data;
  const milestones = milestoneQuery.data ?? [];
  const evidence = evidenceQuery.data ?? [];
  const certificates = paymentQuery.data ?? [];
  const ids = milestones.map(m => m.id);
  const tasksQuery = useQuery({
    queryKey: ["home-tasks", currentProjectId, user?.id, ids],
    enabled: !!currentProjectId && !!user && ids.length > 0,
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase.from("tasks").select("*").in("milestone_id", ids).order("position");
      if (error) throw error;
      return data as Task[];
    },
  });
  const tasks = tasksQuery.data ?? [];
  useRealtimeMilestones(currentProjectId ?? undefined);
  useRealtimeEvidence(currentProjectId ?? undefined);
  useEffect(() => {
    if (!currentProjectId) return;
    const channel = supabase.channel(`home-records-${currentProjectId}`).on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
      void qc.invalidateQueries({ queryKey: ["home-tasks", currentProjectId] });
    }).on("postgres_changes", { event: "*", schema: "public", table: "payment_certificates" }, () => {
      void qc.invalidateQueries({ queryKey: ["payment-certificates", currentProjectId] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentProjectId, qc]);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const createChange = useCreateChange();
  useEffect(() => {
    setSelectedEvidenceId(null); setSelectedCertificateId(null); setExpanded([]); setFilter("all"); setSearch("");
  }, [currentProjectId, role]);

  const isWorker = role === "contractor" || role === "trade";
  const stages = visibleHomeMilestones(milestones, tasks, role, user?.id);
  const stageIds = new Set(stages.map(m => m.id));
  const visibleTasks = tasks.filter(t => stageIds.has(t.milestone_id) && (!isWorker || t.assigned_to === user?.id));
  const visibleEvidence = evidence.filter(e => stageIds.has(e.milestone_id));
  const visibleCertificates = certificates.filter(c => stageIds.has(c.milestone_id));
  const selectedEvidence = visibleEvidence.find(e => e.id === selectedEvidenceId);
  const selectedCertificate = visibleCertificates.find(c => c.id === selectedCertificateId);
  const awaiting = visibleCertificates.filter(c => c.payment_status === "awaiting_client_authorization");
  const review = stages.filter(m => m.status === "in_review");
  const complete = stages.filter(m => m.status === "complete").length;
  const released = releasedPayments(visibleCertificates);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = stages.filter(m => m.status !== "complete" && m.due_date && m.due_date < today);
  const urgentTask = [...visibleTasks].filter(t => t.status !== "complete").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.position - b.position)[0];
  const urgentStage = [...stages].filter(m => m.status !== "complete").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
  const action = role === "client" && awaiting.length
    ? { title: `${awaiting.length} payment${awaiting.length === 1 ? "" : "s"} awaiting your authorisation`, detail: `${money(awaiting.reduce((sum, c) => sum + c.amount, 0))} · verified stages`, label: "Review payment", run: () => setSelectedCertificateId(awaiting[0].id) }
    : role === "pm" && review.length
    ? { title: `${review.length} stage${review.length === 1 ? "" : "s"} ready for your review`, detail: "Evidence submitted · approval pending", label: "Review stage", run: () => reveal(review[0].id) }
    : isWorker && urgentTask
    ? { title: urgentTask.name, detail: `Your next task · ${homeDate(urgentTask.due_date)}`, label: "View task", run: () => reveal(urgentTask.milestone_id) }
    : urgentStage
    ? { title: urgentStage.name, detail: `${statusLabel(urgentStage.status)} · ${homeDate(urgentStage.due_date)}`, label: "View stage", run: () => reveal(urgentStage.id) }
    : { title: stages.length ? "All stages complete" : isWorker ? "No work assigned yet" : "Your project starts here", detail: stages.length ? "The latest records are below" : isWorker ? "Waiting for your project manager" : "No milestones added yet", label: role === "pm" ? "Upload contract" : "View project", run: () => role === "pm" ? navigate("/document-upload") : document.getElementById("project-stages")?.scrollIntoView({ behavior: "smooth" }) };

  function reveal(id: string) {
    setFilter("all"); setSearch(""); setExpanded(previous => previous.includes(id) ? previous : [...previous, id]);
    window.setTimeout(() => document.getElementById(`stage-${id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 80);
  }
  function inspectEvidence(id: string) {
    setSelectedEvidenceId(id);
    const item = visibleEvidence.find(e => e.id === id);
    if (!item || !currentProjectId || !user) return;
    createChange.mutate({ project_id: currentProjectId, entity_type: "evidence", entity_id: item.milestone_id, entity_name: item.milestone_name, change_type: "viewed", changed_by: user.id, changed_by_name: user.email ?? "user", new_value: { evidence_id: id, viewer_role: role } });
  }
  async function authorizePayment() {
    if (!selectedCertificate || !user || !currentProjectId || role !== "client") return;
    setAuthorizing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("payment_certificates").update({ payment_status: "authorized", released_at: now, released_by: user.id }).eq("id", selectedCertificate.id);
      if (error) throw error;
      const { error: logError } = await supabase.from("project_changes").insert({ project_id: currentProjectId, entity_type: "payment", entity_id: selectedCertificate.milestone_id, entity_name: selectedCertificate.milestone_name, change_type: "authorized", changed_by: user.id, changed_by_name: user.email, new_value: { amount: selectedCertificate.amount, milestone_name: selectedCertificate.milestone_name } });
      if (logError) toast.error("Payment authorised, but its activity record could not be saved.");
      try {
        const { data: members } = await supabase.from("project_members").select("name, email, role, user_id").eq("project_id", currentProjectId).eq("status", "active");
        const stage = milestones.find(m => m.id === selectedCertificate.milestone_id);
        for (const member of members ?? []) {
          if (!member.email || (member.role !== "pm" && member.user_id !== stage?.assigned_to)) continue;
          await sendTransactionalEmail({ templateName: "payment-authorized", recipientEmail: member.email, idempotencyKey: `payment-authorized-${selectedCertificate.id}-${member.email}`, templateData: { recipientName: member.name?.split(" ")[0] ?? null, milestoneName: selectedCertificate.milestone_name, projectName: project?.name ?? null, amount: selectedCertificate.amount, certificateRef: `CMT-${selectedCertificate.id.slice(0, 8).toUpperCase()}`, authorizedBy: user.email?.split("@")[0] ?? "client" } });
        }
      } catch { toast.warning("Payment authorised; an email notification could not be sent."); }
      await qc.invalidateQueries({ queryKey: ["payment-certificates"] });
      await qc.invalidateQueries({ queryKey: ["project-changes"] });
      setSelectedCertificateId(null);
      toast.success("Payment authorised");
    } catch { toast.error("Could not authorise payment"); } finally { setAuthorizing(false); }
  }

  const filteredStages = useMemo(() => stages.filter(m => {
    const matchesFilter = filter === "all" || (filter === "complete" ? m.status === "complete" : filter === "review" ? m.status === "in_review" : m.status !== "complete" && m.status !== "pending");
    const q = search.trim().toLowerCase();
    return matchesFilter && (!q || m.name.toLowerCase().includes(q) || visibleTasks.some(t => t.milestone_id === m.id && t.name.toLowerCase().includes(q)));
  }), [stages, filter, search, visibleTasks]);

  if (!currentProjectId) return <main className="max-w-5xl mx-auto px-6 pt-24"><h1 className="text-3xl">Select a project</h1><Button className="mt-6" onClick={() => navigate("/")}>All projects <ArrowRight /></Button></main>;
  if (projectQuery.isLoading || milestoneQuery.isLoading || tasksQuery.isLoading) return <main className="max-w-5xl mx-auto px-6 pt-24" aria-busy="true"><p className="font-mono text-muted-foreground">Loading project…</p><div className="mt-8 h-44 bg-muted rounded-3xl motion-safe:animate-pulse" /></main>;
  if (projectQuery.error || milestoneQuery.error || !project) return <main className="max-w-5xl mx-auto px-6 pt-24"><h1 className="text-2xl">Could not load this project</h1><Button className="mt-6" onClick={() => { void projectQuery.refetch(); void milestoneQuery.refetch(); }}>Try again</Button></main>;

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 space-y-8">
      <header className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-0"><p className="font-mono text-[11px] text-muted-foreground">PROJECT HOME · {role === "pm" ? "PROJECT MANAGER" : role.toUpperCase()}</p><h1 className="text-3xl sm:text-4xl font-medium mt-2 break-words">{project.name}</h1><p className="mt-2 text-sm text-muted-foreground">{project.address || project.project_code} {project.end_date && `· Due ${homeDate(project.end_date)}`}</p></div>
        {role === "pm" && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => navigate("/manual-milestone")}><Layers />Add milestone</Button><Button size="sm" onClick={() => navigate("/document-upload")}><FileText />Upload contract</Button></div>}
      </header>

      <section className="border-y border-hairline py-6 grid lg:grid-cols-[1.3fr_1fr] gap-8" aria-label="Project overview">
        <div><p className="font-mono text-[11px] text-accent">{stages.length && complete === stages.length ? "UP TO DATE" : "ACTION REQUIRED"}</p><h2 className="text-2xl font-medium mt-3 max-w-xl break-words">{action.title}</h2><p className="text-sm text-muted-foreground mt-2">{action.detail}</p><Button className="mt-5" onClick={action.run}>{action.label}<ArrowRight /></Button></div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 content-center">
          {[{ label: "Milestones complete", value: `${complete} / ${stages.length}`, icon: Layers }, { label: isWorker ? "Your open tasks" : "Open tasks", value: visibleTasks.filter(t => t.status !== "complete").length, icon: ListChecks }, { label: "Evidence submitted", value: evidenceQuery.error ? "Unavailable" : visibleEvidence.length, icon: Camera }, { label: "Payments released", value: paymentQuery.error ? "Unavailable" : money(released), icon: Wallet }].map(s => <div key={s.label}><div className="flex items-center gap-2 text-muted-foreground"><s.icon size={14}/><p className="font-mono text-[10px]">{s.label}</p></div><p className="font-mono text-xl mt-2 break-words">{s.value}</p></div>)}
        </div>
      </section>

      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground"><span className="text-accent">{review.length} in review</span><span className={overdue.length ? "text-destructive" : ""}>{overdue.length} overdue</span><span>{awaiting.length} payments awaiting authorisation</span>{!isWorker && <span>Budget {money(Number(project.total_budget ?? 0))}</span>}</div>

      <section id="project-stages" className="scroll-mt-20" aria-labelledby="stages-title">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5"><h2 id="stages-title" className="text-xl font-medium">{isWorker ? "Your milestones" : "Milestones"}<span className="font-mono text-sm text-muted-foreground ml-3">{stages.length}</span></h2><div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input aria-label="Search milestones and tasks" placeholder="Search milestones or tasks" className="pl-9 rounded-full border-hairline bg-card" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
        <div className="flex flex-wrap gap-2 mb-5" aria-label="Milestone filters">{(["all", "active", "review", "complete"] as Filter[]).map(f => <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All stages" : f === "review" ? "In review" : f === "complete" ? "Complete" : "Active"}</Button>)}</div>
        {tasksQuery.error && <p role="alert" className="mb-4 text-destructive text-sm">Tasks could not be loaded. <Button variant="link" size="sm" onClick={() => void tasksQuery.refetch()}>Retry</Button></p>}
        {filteredStages.length === 0 && <div className="py-12 border-y border-hairline text-center"><Layers className="mx-auto text-muted-foreground"/><h3 className="text-lg mt-3">{stages.length ? "No matching milestones" : "No milestones yet"}</h3>{role === "pm" && !stages.length && <div className="flex justify-center flex-wrap gap-3 mt-5"><Button onClick={() => navigate("/document-upload")}>Upload contract</Button><Button variant="outline" onClick={() => navigate("/template-select")}>Use a template</Button><Button variant="outline" onClick={() => navigate("/manual-milestone")}>Add manually</Button></div>}</div>}
        <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="space-y-3">
          {filteredStages.map(stage => {
            const stageTasks = visibleTasks.filter(t => t.milestone_id === stage.id);
            const stageEvidence = visibleEvidence.filter(e => e.milestone_id === stage.id);
            const stageCerts = visibleCertificates.filter(c => c.milestone_id === stage.id);
            const doneTasks = stageTasks.filter(t => t.status === "complete").length;
            return <AccordionItem key={stage.id} value={stage.id} id={`stage-${stage.id}`} className="bg-card rounded-3xl border-0 px-5 sm:px-6 scroll-mt-20">
              <AccordionTrigger className="gap-3 text-left hover:no-underline py-5"><div className="flex items-start gap-4 flex-1 min-w-0"><span className="font-mono text-xl text-muted-foreground w-9 shrink-0">{String(stage.position).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex items-center flex-wrap gap-2"><h3 className="text-base font-medium break-words">{stage.name}</h3><span className={`font-mono text-[10px] rounded-full px-2.5 py-1 ${statusTone[stage.status] ?? statusTone.pending}`}>{statusLabel(stage.status)}</span></div><p className="font-mono text-[10px] text-muted-foreground mt-2 break-words">{homeDate(stage.due_date)} · {stage.assigned_to_name || "Assignee not set"}</p><div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 font-mono text-[10px] text-muted-foreground"><span>{doneTasks}/{stageTasks.length} tasks</span><span>{stageEvidence.length} evidence</span><span>{money(Number(stage.payment_value ?? 0))} · {stageCerts.some(c => c.payment_status === "authorized") ? "authorised" : stageCerts.length ? "certificate issued" : "not released"}</span></div></div></div></AccordionTrigger>
              <AccordionContent className="pt-2 pb-6 border-t border-hairline">
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mt-4">
                  <div><h4 className="font-mono text-[11px] text-muted-foreground mb-3">{isWorker ? "YOUR TASKS" : "TASKS"}</h4>{!stageTasks.length && <p className="text-sm text-muted-foreground py-2">{isWorker ? "No individual tasks assigned to you." : "No individual tasks yet."}</p>}<div className="divide-y divide-hairline">{stageTasks.map(task => <div key={task.id} className="flex items-center gap-3 py-3"><span className={task.status === "complete" ? "text-success" : "text-muted-foreground"}>{task.status === "complete" ? <CheckCircle2 size={17}/> : <Circle size={17}/>}</span><div className="flex-1 min-w-0"><p className="text-sm break-words">{task.name}</p>{task.description && <p className="text-xs text-muted-foreground mt-1 break-words">{task.description}</p>}<p className="font-mono text-[10px] text-muted-foreground mt-1">{statusLabel(task.status)} · {homeDate(task.due_date)} {task.assigned_to_name && `· ${task.assigned_to_name}`}</p></div><Button variant="ghost" size="icon" title={`Open ${task.name}`} aria-label={`Open task ${task.name}`} onClick={() => navigate(`/project/task/${task.id}`)}><ArrowRight/></Button></div>)}</div></div>
                  <div><h4 className="font-mono text-[11px] text-muted-foreground mb-3">EVIDENCE</h4>{evidenceQuery.error ? <p className="text-sm text-destructive">Evidence unavailable <Button variant="link" size="sm" onClick={() => void evidenceQuery.refetch()}>Retry</Button></p> : evidenceQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading evidence…</p> : !stageEvidence.length ? <p className="text-sm text-muted-foreground py-2">No evidence submitted yet.</p> : <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{stageEvidence.map(item => <Button key={item.id} variant="ghost" className="p-0 h-auto aspect-square rounded-lg overflow-hidden relative bg-muted" aria-label={`Inspect evidence ${item.note || homeDate(item.submitted_at)}`} onClick={() => inspectEvidence(item.id)}>{item.photo_url ? <img src={item.photo_url} alt={item.note || "Site evidence"} loading="lazy" className="w-full h-full object-cover"/> : <FileText className="text-muted-foreground"/>}</Button>)}</div>}
                    <div className="mt-5 pt-4 border-t border-hairline"><h4 className="font-mono text-[11px] text-muted-foreground mb-2">PAYMENT</h4>{paymentQuery.error ? <p className="text-sm text-destructive">Payments unavailable <Button variant="link" size="sm" onClick={() => void paymentQuery.refetch()}>Retry</Button></p> : stageCerts.length ? stageCerts.map(cert => <div key={cert.id} className="flex items-center justify-between gap-3 py-2"><div><p className="font-mono text-sm">{money(cert.amount)}</p><p className={`font-mono text-[10px] mt-1 ${cert.payment_status === "authorized" ? "text-success" : "text-muted-foreground"}`}>{statusLabel(cert.payment_status ?? "pending")}</p></div><Button variant="outline" size="sm" onClick={() => setSelectedCertificateId(cert.id)}>{role === "client" && cert.payment_status === "awaiting_client_authorization" ? "Review" : "Certificate"}</Button></div>) : <p className="text-sm text-muted-foreground">{money(Number(stage.payment_value ?? 0))} · No certificate issued</p>}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-hairline"><Button variant="outline" size="sm" onClick={() => navigate(`/project/milestone/${stage.id}`)}>{role === "pm" && stage.status === "in_review" ? "Review & approve" : "Milestone details"}<ArrowRight/></Button>{isWorker && stage.status !== "complete" && <Button size="sm" onClick={() => navigate(stageTasks.length ? `/project/task/${stageTasks.find(t => t.status !== "complete")?.id ?? stageTasks[0].id}` : `/project/camera?milestoneId=${stage.id}&item=${encodeURIComponent(stage.name)}`)}><Camera/>Submit evidence</Button>}{role === "pm" && stage.status === "complete" && !stageCerts.length && <Button size="sm" onClick={() => navigate(`/project/payment-certificate/${stage.id}`)}>Create certificate</Button>}</div>
              </AccordionContent>
            </AccordionItem>;
          })}
        </Accordion>
      </section>

      {visibleEvidence.length > 0 && <section aria-labelledby="latest-evidence"><div className="flex justify-between items-baseline mb-4"><h2 id="latest-evidence" className="text-xl font-medium">Latest evidence</h2><span className="font-mono text-[10px] text-muted-foreground">{visibleEvidence.length} submissions</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{visibleEvidence.slice(0, 4).map(item => <Button key={item.id} variant="ghost" className="bg-card p-0 h-auto rounded-3xl overflow-hidden flex flex-col gap-0 items-stretch text-left whitespace-normal hover:bg-card" onClick={() => inspectEvidence(item.id)}>{item.photo_url ? <img src={item.photo_url} alt={item.note || "Site evidence"} className="aspect-[4/3] object-cover w-full" loading="lazy"/> : <div className="aspect-[4/3] bg-muted flex items-center justify-center"><FileText className="text-muted-foreground"/></div>}<div className="p-4"><p className="text-sm line-clamp-2">{item.milestone_name}</p><p className="font-mono text-[10px] text-muted-foreground mt-2">{homeDate(item.submitted_at)}</p></div></Button>)}</div></section>}

      <Dialog open={!!selectedEvidence} onOpenChange={open => !open && setSelectedEvidenceId(null)}><DialogContent className="max-w-3xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto rounded-3xl shadow-none border-hairline"><DialogTitle>Evidence · {selectedEvidence?.milestone_name}</DialogTitle><DialogDescription>{selectedEvidence ? homeDate(selectedEvidence.submitted_at) : ""}</DialogDescription>{selectedEvidence?.photo_url && <img src={selectedEvidence.photo_url} alt={selectedEvidence.note || "Site evidence"} className="w-full max-h-[50vh] object-contain rounded-lg"/>}{selectedEvidence?.note && <p className="text-sm whitespace-pre-wrap">{selectedEvidence.note}</p>}{selectedEvidence?.ai_tags && typeof selectedEvidence.ai_tags === "object" && <div className="flex gap-2 flex-wrap">{Object.entries(selectedEvidence.ai_tags).filter(([, value]) => typeof value === "string").map(([key, value]) => <span key={key} className="font-mono text-[10px] bg-secondary px-3 py-1.5 rounded-full break-words">{key.replace(/_/g, " ")}: {String(value)}</span>)}</div>}{selectedEvidence?.voice_note_url && <audio controls src={selectedEvidence.voice_note_url} className="w-full"/>}{selectedEvidence && <Button variant="outline" onClick={() => { const id = selectedEvidence.milestone_id; setSelectedEvidenceId(null); reveal(id); }}>View related milestone<ArrowRight/></Button>}</DialogContent></Dialog>
      <Dialog open={!!selectedCertificate} onOpenChange={open => !open && !authorizing && setSelectedCertificateId(null)}><DialogContent className="rounded-3xl shadow-none border-hairline w-[calc(100%-2rem)]"><DialogTitle>Payment certificate</DialogTitle><DialogDescription>{selectedCertificate?.milestone_name}</DialogDescription><p className="font-mono text-3xl sm:text-4xl break-words">{money(selectedCertificate?.amount ?? 0)}</p><p className="font-mono text-xs text-muted-foreground break-words">{statusLabel(selectedCertificate?.payment_status ?? "pending")}</p><dl className="text-sm space-y-3"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Issued</dt><dd>{homeDate(selectedCertificate?.generated_at)}</dd></div>{selectedCertificate?.released_at && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Authorised</dt><dd>{homeDate(selectedCertificate.released_at)}</dd></div>}<div><dt className="text-muted-foreground">Reference</dt><dd className="font-mono text-xs mt-1 break-all">{selectedCertificate?.id}</dd></div></dl>{selectedCertificate?.certificate_url && <Button asChild variant="outline"><a href={selectedCertificate.certificate_url} target="_blank" rel="noopener noreferrer">Open document<FileText/></a></Button>}{role === "client" && selectedCertificate?.payment_status === "awaiting_client_authorization" && <Button onClick={authorizePayment} disabled={authorizing}>{authorizing ? "Authorising…" : "Authorise payment"}<ArrowRight/></Button>}</DialogContent></Dialog>
    </main>
  );
}
