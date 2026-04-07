import { format } from "date-fns";

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPaymentCertificates(
  certificates: { id: string; amount: number; generated_at: string; payment_status: string | null; released_at: string | null; milestone_name?: string }[],
  projectName: string
) {
  const headers = ["Certificate ID", "Milestone", "Amount (£)", "Status", "Generated", "Released"];
  const rows = certificates.map(c => [
    c.id.slice(0, 8),
    escapeCsv(c.milestone_name ?? ""),
    String(c.amount),
    c.payment_status ?? "pending",
    format(new Date(c.generated_at), "dd/MM/yyyy"),
    c.released_at ? format(new Date(c.released_at), "dd/MM/yyyy") : "",
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_payments_${format(new Date(), "yyyyMMdd")}.csv`, csv);
}

export function exportAuditTrail(
  changes: { id: string; entity_type: string; entity_name: string | null; change_type: string; changed_by_name: string | null; created_at: string; note: string | null }[],
  projectName: string
) {
  const headers = ["Date", "Time", "Actor", "Type", "Entity", "Change", "Note"];
  const rows = changes.map(c => {
    const d = new Date(c.created_at);
    return [
      format(d, "dd/MM/yyyy"),
      format(d, "HH:mm"),
      escapeCsv(c.changed_by_name?.split("@")[0]?.replace(/\./g, " ") ?? "system"),
      c.entity_type,
      escapeCsv(c.entity_name ?? ""),
      c.change_type,
      escapeCsv(c.note ?? ""),
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_audit_${format(new Date(), "yyyyMMdd")}.csv`, csv);
}

export function exportEvidenceList(
  evidence: { id: string; milestone_name?: string; submitted_at: string; note: string | null; photo_url: string | null; ai_tags: unknown }[],
  projectName: string
) {
  const headers = ["Evidence ID", "Milestone", "Date", "Note", "Photo URL", "Tags"];
  const rows = evidence.map(e => {
    const tags = e.ai_tags && typeof e.ai_tags === "object"
      ? Object.entries(e.ai_tags as Record<string, unknown>)
          .filter(([k]) => k !== "ai_comment" && k !== "milestone_match")
          .map(([, v]) => String(v))
          .join("; ")
      : "";
    return [
      e.id.slice(0, 8),
      escapeCsv((e as any).milestone_name ?? ""),
      format(new Date(e.submitted_at), "dd/MM/yyyy HH:mm"),
      escapeCsv(e.note ?? ""),
      e.photo_url ?? "",
      escapeCsv(tags),
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_evidence_${format(new Date(), "yyyyMMdd")}.csv`, csv);
}
