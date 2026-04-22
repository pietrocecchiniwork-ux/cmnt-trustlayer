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

export interface DateRange {
  from?: string | null;
  to?: string | null;
}

function inRange(iso: string, range?: DateRange): boolean {
  if (!range?.from && !range?.to) return true;
  const t = new Date(iso).getTime();
  if (range.from && t < new Date(range.from).getTime()) return false;
  if (range.to && t > new Date(range.to + "T23:59:59").getTime()) return false;
  return true;
}

function rangeSuffix(range?: DateRange): string {
  if (!range?.from && !range?.to) return format(new Date(), "yyyyMMdd");
  const f = range?.from ? format(new Date(range.from), "yyyyMMdd") : "all";
  const t = range?.to ? format(new Date(range.to), "yyyyMMdd") : "all";
  return `${f}-${t}`;
}

export function exportPaymentCertificates(
  certificates: { id: string; amount: number; generated_at: string; payment_status: string | null; released_at: string | null; milestone_name?: string }[],
  projectName: string,
  range?: DateRange,
) {
  const filtered = certificates.filter(c => inRange(c.generated_at, range));
  const headers = ["Certificate ID", "Milestone", "Amount (£)", "Status", "Generated", "Released"];
  const rows = filtered.map(c => [
    c.id.slice(0, 8),
    escapeCsv(c.milestone_name ?? ""),
    String(c.amount),
    c.payment_status ?? "pending",
    format(new Date(c.generated_at), "dd/MM/yyyy"),
    c.released_at ? format(new Date(c.released_at), "dd/MM/yyyy") : "",
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_payments_${rangeSuffix(range)}.csv`, csv);
}

export function exportAuditTrail(
  changes: { id: string; entity_type: string; entity_name: string | null; change_type: string; changed_by_name: string | null; created_at: string; note: string | null }[],
  projectName: string,
  range?: DateRange,
) {
  const filtered = changes.filter(c => inRange(c.created_at, range));
  const headers = ["Date", "Time", "Actor", "Type", "Entity", "Change", "Note"];
  const rows = filtered.map(c => {
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
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_audit_${rangeSuffix(range)}.csv`, csv);
}

export function exportEvidenceList(
  evidence: { id: string; milestone_name?: string; submitted_at: string; note: string | null; photo_url: string | null; ai_tags: unknown }[],
  projectName: string,
  range?: DateRange,
) {
  const filtered = evidence.filter(e => inRange(e.submitted_at, range));
  const headers = ["Evidence ID", "Milestone", "Date", "Note", "Photo URL", "Tags"];
  const rows = filtered.map(e => {
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
  downloadCsv(`${projectName.replace(/\s+/g, "_")}_evidence_${rangeSuffix(range)}.csv`, csv);
}
