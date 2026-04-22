import { useState } from "react";
import type { DateRange } from "@/lib/exportCsv";

interface Props {
  label?: string;
  onExport: (range: DateRange) => void;
  className?: string;
}

/**
 * Compact "export csv" trigger that opens an inline date-range picker
 * before invoking the export. Both dates are optional — leave blank for "all time".
 */
export function CsvExportButton({ label = "export csv", onExport, className }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={className ?? "font-mono text-[10px] text-muted-foreground underline underline-offset-4"}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-foreground/20 bg-background/60 rounded-sm min-w-[220px]">
      <p className="font-mono text-[10px] text-muted-foreground">date range (optional)</p>
      <label className="flex items-center justify-between gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">from</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-transparent border border-foreground/20 px-2 py-1 font-mono text-[11px]"
        />
      </label>
      <label className="flex items-center justify-between gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-transparent border border-foreground/20 px-2 py-1 font-mono text-[11px]"
        />
      </label>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => {
            onExport({ from: from || null, to: to || null });
            setOpen(false);
            setFrom("");
            setTo("");
          }}
          className="font-mono text-[11px] underline underline-offset-4"
        >
          download
        </button>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] text-muted-foreground"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
