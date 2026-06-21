import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { COMPACT_TAXONOMY_PROMPT } from "../_shared/ontology-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, messages } = (await req.json()) as {
      projectId: string;
      messages: ChatMessage[];
    };

    if (!projectId || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "projectId and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply:
            "The assistant is not configured yet. LOVABLE_API_KEY is missing.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate user via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify membership & derive role
    const { data: membership } = await admin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a project member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const role = (membership.role ?? "contractor") as
      | "pm"
      | "contractor"
      | "trade"
      | "client";

    // Load scoped context
    const { data: project } = await admin.from("projects").select("*").eq("id", projectId).maybeSingle();
    const { data: milestones } = await admin
      .from("milestones")
      .select("id,name,description,status,due_date,assigned_to,payment_value")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });
    const milestoneIdsAll = (milestones ?? []).map((m: any) => m.id);
    const { data: tasks } = milestoneIdsAll.length
      ? await admin
          .from("tasks")
          .select("id,name,description,status,milestone_id,assigned_to,due_date,evidence_required")
          .in("milestone_id", milestoneIdsAll)
      : { data: [] as any[] };
    const { data: members } = await admin
      .from("project_members")
      .select("user_id,role,name,email,status")
      .eq("project_id", projectId);
    const { data: changes } = await admin
      .from("project_changes")
      .select("created_at,changed_by_name,change_type,entity_type,entity_name,note")
      .eq("project_id", projectId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(80);

    // Role-filter milestones/tasks
    const isContractor = role === "contractor" || role === "trade";
    const visibleMilestones = (milestones ?? []).filter((m: any) =>
      isContractor ? m.assigned_to === user.id : true,
    );
    const visibleMilestoneIds = new Set(visibleMilestones.map((m: any) => m.id));
    const visibleTasks = (tasks ?? []).filter((t: any) =>
      isContractor
        ? t.assigned_to === user.id || visibleMilestoneIds.has(t.milestone_id)
        : true,
    );

    // Compute blockers
    const today = startOfDayISO(new Date());
    const overdue = visibleMilestones.filter(
      (m: any) => m.due_date && m.due_date < today && m.status !== "completed",
    );

    const memberNameById = new Map<string, string>(
      (members ?? []).map((m: any) => [m.user_id, m.name || m.email || "Unknown"]),
    );

    const todayChanges = (changes ?? []).filter((c: any) => c.created_at >= today);

    const projectCtx = {
      project: project
        ? {
            name: project.name,
            address: project.address,
            start_date: project.start_date,
            end_date: project.end_date,
            total_budget: project.total_budget,
            payment_mode: project.payment_mode,
          }
        : null,
      role,
      current_user: {
        id: user.id,
        name: memberNameById.get(user.id) ?? user.email,
      },
      now: new Date().toISOString(),
      milestones: visibleMilestones.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        status: m.status,
        due_date: m.due_date,
        assignee: m.assigned_to ? memberNameById.get(m.assigned_to) ?? null : null,
        payment_value: m.payment_value,
      })),
      tasks: visibleTasks.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        milestone_id: t.milestone_id,
        assignee: t.assigned_to ? memberNameById.get(t.assigned_to) ?? null : null,
        due_date: t.due_date,
        evidence_required: t.evidence_required,
      })),
      team: (members ?? []).map((m: any) => ({
        name: m.name || m.email,
        role: m.role,
        status: m.status,
      })),
      activity_last_7_days: (changes ?? []).map((c: any) => ({
        at: c.created_at,
        actor: c.changed_by_name,
        type: c.change_type,
        entity_type: c.entity_type,
        entity: c.entity_name,
        note: c.note,
      })),
      activity_today: todayChanges,
      blockers: {
        overdue_milestones: overdue.map((m: any) => ({ name: m.name, due_date: m.due_date })),
      },
    };

    const systemPrompt = `You are the Project Assistant for a UK construction verification platform.
You answer questions about a single project for the signed-in user.

${COMPACT_TAXONOMY_PROMPT}

STRICT RULES:
- You are READ-ONLY. Never claim to have created, edited, sent, or scheduled anything.
- Only use facts present in the PROJECT CONTEXT JSON below. If something is not in the context, say you don't have that information rather than guessing.
- The viewer's role is "${role}". Respect their scope — do not invent data outside what you can see.
- Be concise. Prefer short paragraphs and bullet lists. Reference milestones and tasks by their exact name.
- For "what happened today" questions, use activity_today (or activity_last_7_days for a specific date).
- For "what's blocked / overdue" questions, use blockers and milestone/task statuses.
- For "explain this task/milestone" questions, summarise its description, whether evidence is required, assignee, due date, and current status.
- Answer in the language of the user's question.

CITATIONS — VERY IMPORTANT:
- Every time you mention a specific milestone, task, or activity from the context, append an inline citation token IMMEDIATELY after the name.
- Tokens MUST use these exact formats (no spaces inside the brackets):
  - For a milestone: [[m:<milestone_id>]]
  - For a task: [[t:<task_id>]]
  - For an activity entry: [[a:<index>]] where <index> is the 0-based index into activity_last_7_days.
- Use the real IDs from the PROJECT CONTEXT JSON. Never invent IDs. If you can't find an ID for something you want to cite, omit the token rather than guessing.
- Example: "The kitchen install [[m:0c1e...-...]] is overdue; new task 'Tiles' [[t:9b2a...-...]] was added today [[a:3]]."
- Do not list raw IDs anywhere else — they are only allowed inside [[...]] tokens.

PROJECT CONTEXT (JSON):
${JSON.stringify(projectCtx)}`;


    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI gateway error", res.status, errText);
      return new Response(
        JSON.stringify({ error: "AI request failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response.";

    // Build a citation map for tokens the model may have emitted
    const citations: Record<string, { kind: "milestone" | "task" | "activity"; label: string; href?: string; subtitle?: string }> = {};
    for (const m of projectCtx.milestones) {
      citations[`m:${m.id}`] = {
        kind: "milestone",
        label: m.name,
        subtitle: m.status,
        href: `/project/milestone/${m.id}`,
      };
    }
    for (const t of projectCtx.tasks) {
      citations[`t:${t.id}`] = {
        kind: "task",
        label: t.name,
        subtitle: t.status,
        href: `/project/task/${t.id}`,
      };
    }
    projectCtx.activity_last_7_days.forEach((a: any, i: number) => {
      citations[`a:${i}`] = {
        kind: "activity",
        label: `${a.actor ?? "Someone"} · ${a.type}${a.entity ? ` · ${a.entity}` : ""}`,
        subtitle: new Date(a.at).toLocaleString(),
        href: `/project/activity`,
      };
    });

    return new Response(JSON.stringify({ reply, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-assistant error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
