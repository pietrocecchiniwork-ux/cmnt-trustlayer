import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/DemoProjectContext";
import { useCurrentUser } from "@/hooks/useSupabaseProject";
import { toast } from "sonner";

interface ProjectDocument {
  id: string;
  title: string;
  kind: string;
  file_path: string;
  mime_type: string | null;
  byte_size: number | null;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
  uploaded_by: string | null;
}

const KIND_OPTIONS = ["spec", "contract", "drawing_note", "standard", "sop", "other"];

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function guessKind(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes("spec")) return "spec";
  if (f.includes("contract") || f.includes("jct")) return "contract";
  if (f.includes("drawing")) return "drawing_note";
  if (f.includes("nhbc") || f.includes("standard") || f.includes("part-l")) return "standard";
  if (f.includes("sop") || f.includes("method")) return "sop";
  return "other";
}

export default function ProjectKnowledge() {
  const navigate = useNavigate();
  const { currentProjectId } = useProjectContext();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["project-documents", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", currentProjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectDocument[];
    },
    enabled: !!currentProjectId,
    refetchInterval: (q) => {
      const d = q.state.data as ProjectDocument[] | undefined;
      return d?.some((x) => x.status === "processing") ? 3000 : false;
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      await supabase.storage.from("project-knowledge").remove([doc.file_path]);
      const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents", currentProjectId] });
      toast.success("Document removed");
    },
    onError: (e) => toast.error(`Delete failed: ${(e as Error).message}`),
  });

  const updateKind = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: string }) => {
      const { error } = await supabase.from("project_documents").update({ kind }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-documents", currentProjectId] }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProjectId || !currentUser) return;
    e.target.value = "";
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const docId = crypto.randomUUID();
      const filePath = `${currentProjectId}/${docId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("project-knowledge")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("project_documents").insert({
        id: docId,
        project_id: currentProjectId,
        uploaded_by: currentUser.id,
        title: file.name,
        kind: guessKind(file.name),
        file_path: filePath,
        mime_type: file.type || null,
        byte_size: file.size,
        status: "processing",
      });
      if (insErr) throw insErr;

      queryClient.invalidateQueries({ queryKey: ["project-documents", currentProjectId] });

      // Fire-and-forget ingest
      supabase.functions.invoke("ingest-document", { body: { document_id: docId } }).then(({ error }) => {
        if (error) console.error("ingest error:", error);
        queryClient.invalidateQueries({ queryKey: ["project-documents", currentProjectId] });
      });

      toast.success("Document uploaded — Cemento is learning from it");
    } catch (err) {
      console.error("upload failed:", err);
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const statusDot = (status: ProjectDocument["status"]) => {
    if (status === "ready") return <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success,142_40%_36%))] inline-block" />;
    if (status === "failed") return <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse inline-block" />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="font-mono text-[13px] text-muted-foreground mb-8"
      >
        ← back
      </button>

      <h1 className="font-sans text-[22px] text-foreground mb-2">project knowledge</h1>
      <p className="font-mono text-[11px] text-muted-foreground mb-6">
        Upload specs, contracts, drawings, standards, SOPs. Cemento AI uses them when analysing photos and contracts on this project.
      </p>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full h-32 border border-dashed border-border flex flex-col items-center justify-center gap-2 mb-8 disabled:opacity-50"
      >
        <p className="font-mono text-[13px] text-foreground">
          {uploading ? "uploading..." : "drop file or click to upload"}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">pdf, docx, image, txt</p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFile}
      />

      {isLoading && <p className="font-mono text-[12px] text-muted-foreground">loading...</p>}

      {!isLoading && docs.length === 0 && (
        <p className="font-mono text-[12px] text-muted-foreground text-center mt-12">
          no documents yet — Cemento learns from whatever you upload here.
        </p>
      )}

      <div className="flex flex-col">
        {docs.map((d) => (
          <div key={d.id} className="py-4 border-b border-border flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {statusDot(d.status)}
                <p className="font-sans text-[14px] text-foreground truncate">{d.title}</p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <select
                  value={d.kind}
                  onChange={(e) => updateKind.mutate({ id: d.id, kind: e.target.value })}
                  className="bg-transparent font-mono text-[11px] text-muted-foreground border-0 outline-none cursor-pointer"
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(d.byte_size)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
              {d.status === "failed" && d.error && (
                <p className="font-mono text-[10px] text-destructive mt-1 truncate">{d.error}</p>
              )}
            </div>
            <button
              onClick={() => {
                if (confirm(`Delete "${d.title}"?`)) deleteDoc.mutate(d);
              }}
              className="font-mono text-[11px] text-muted-foreground hover:text-destructive"
              aria-label="delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
