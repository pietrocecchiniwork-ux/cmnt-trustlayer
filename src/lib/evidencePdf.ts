import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Milestone {
  id: string;
  name: string;
  status: string;
  position: number;
  due_date: string | null;
  payment_value: number | null;
  approved_at: string | null;
}

interface EvidenceRow {
  id: string;
  milestone_id: string;
  photo_url: string | null;
  note: string | null;
  submitted_at: string;
  ai_tags: unknown;
}

interface Project {
  name: string;
  address: string | null;
  project_code: string | null;
}

interface MemberLite {
  user_id: string | null;
  name: string;
  role: string;
}

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function tagsToString(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return Object.entries(raw as Record<string, unknown>)
    .filter(([k]) => k !== "ai_comment" && k !== "milestone_match")
    .map(([, v]) => String(v).replace(/_/g, " "))
    .join(" · ");
}

export async function generateEvidencePackPdf(opts: {
  project: Project;
  milestones: Milestone[];
  evidence: EvidenceRow[];
  pmMember?: MemberLite | null;
}): Promise<Blob> {
  const { project, milestones, evidence, pmMember } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Evidence Pack", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(project.name, margin, y);
  y += 14;
  if (project.address) {
    doc.setTextColor(110);
    doc.text(project.address, margin, y);
    doc.setTextColor(0);
    y += 14;
  }

  doc.setFontSize(9);
  doc.setTextColor(110);
  const meta = [
    project.project_code ? `Ref: ${project.project_code}` : null,
    `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    `Milestones: ${milestones.length}`,
    `Evidence items: ${evidence.length}`,
  ].filter(Boolean).join("  ·  ");
  doc.text(meta, margin, y);
  doc.setTextColor(0);
  y += 22;

  // Summary table
  autoTable(doc, {
    startY: y,
    head: [["#", "Milestone", "Status", "Due", "Value (£)"]],
    body: milestones.map(m => [
      String(m.position).padStart(2, "0"),
      m.name,
      m.status,
      m.due_date ?? "—",
      m.payment_value != null ? Number(m.payment_value).toLocaleString() : "—",
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4, lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [240, 240, 238], textColor: 30, lineWidth: 0.5 },
    margin: { left: margin, right: margin },
  });
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 24;

  // Per-milestone sections
  for (const m of milestones) {
    const items = evidence.filter(e => e.milestone_id === m.id);
    if (items.length === 0) continue;

    if (y > pageH - 200) { doc.addPage(); y = margin; }

    doc.setDrawColor(30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${String(m.position).padStart(2, "0")} · ${m.name}`, margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    const subline = [
      `Status: ${m.status}`,
      m.due_date ? `Due: ${m.due_date}` : null,
      m.approved_at ? `Approved: ${format(new Date(m.approved_at), "dd MMM yyyy")}` : null,
      m.payment_value != null ? `£${Number(m.payment_value).toLocaleString()}` : null,
    ].filter(Boolean).join("  ·  ");
    doc.text(subline, margin, y);
    doc.setTextColor(0);
    y += 18;

    for (const ev of items) {
      const blockH = 100;
      if (y + blockH > pageH - margin) { doc.addPage(); y = margin; }

      const thumbW = 90;
      const thumbH = 90;
      let imageDrawn = false;
      if (ev.photo_url) {
        const img = await loadImageAsDataUrl(ev.photo_url);
        if (img) {
          try {
            const ratio = img.w / img.h || 1;
            let drawW = thumbW, drawH = thumbH;
            if (ratio > 1) drawH = thumbW / ratio;
            else drawW = thumbH * ratio;
            doc.addImage(img.dataUrl, "JPEG", margin, y, drawW, drawH, undefined, "FAST");
            imageDrawn = true;
          } catch {
            // fallthrough
          }
        }
      }
      if (!imageDrawn) {
        doc.setDrawColor(200);
        doc.rect(margin, y, thumbW, thumbH);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text("no photo", margin + 8, y + thumbH / 2);
        doc.setTextColor(0);
      }

      const tx = margin + thumbW + 14;
      const tw = pageW - tx - margin;
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(format(new Date(ev.submitted_at), "dd MMM yyyy · HH:mm"), tx, y + 12);
      doc.setTextColor(0);

      const tags = tagsToString(ev.ai_tags);
      let ty = y + 28;
      if (tags) {
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(tags, tw);
        doc.text(lines, tx, ty);
        ty += lines.length * 11 + 4;
      }
      if (ev.note) {
        doc.setFontSize(9);
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(`"${ev.note}"`, tw);
        doc.text(lines, tx, ty);
        doc.setTextColor(0);
      }
      doc.setFontSize(8);
      doc.setTextColor(160);
      doc.text(`#${ev.id.slice(0, 8)}`, tx, y + thumbH);
      doc.setTextColor(0);

      y += thumbH + 14;
    }
    y += 6;
  }

  // Sign-off page
  doc.addPage();
  let sy = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Sign-off", margin, sy);
  sy += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `This pack was compiled on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")} from verified evidence submitted via cmnt.`,
    margin, sy, { maxWidth: pageW - margin * 2 }
  );
  doc.setTextColor(0);
  sy += 36;

  doc.setDrawColor(30);
  doc.line(margin, sy + 30, margin + 240, sy + 30);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Project Manager", margin, sy + 44);
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(pmMember?.name ?? "—", margin, sy + 22);

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`cmnt · ${project.name}`, margin, pageH - 18);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 18, { align: "right" });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
