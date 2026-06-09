import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Citation = {
  kind: "milestone" | "task" | "activity";
  label: string;
  href?: string;
  subtitle?: string;
};

export type CitationMap = Record<string, Citation>;

const TOKEN_RE = /\[\[(m|t|a):([^\]]+)\]\]/g;

const KIND_LABEL: Record<Citation["kind"], string> = {
  milestone: "Milestone",
  task: "Task",
  activity: "Activity",
};

export function RenderedAnswer({
  text,
  citations,
}: {
  text: string;
  citations: CitationMap;
}) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(TOKEN_RE);

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const id = `${match[1]}:${match[2]}`;
    const cite = citations[id];
    nodes.push(<CitationChip key={`c-${key++}`} id={id} cite={cite} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <span className="whitespace-pre-wrap leading-relaxed">{nodes}</span>;
}

function CitationChip({ id, cite }: { id: string; cite?: Citation }) {
  if (!cite) {
    // Unknown reference — show a faded marker
    return (
      <sup className="mx-0.5 text-[10px] text-gray-400 font-mono">[?]</sup>
    );
  }

  const chip = (
    <span
      className={`inline-flex items-center gap-1 align-baseline mx-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono leading-none transition-colors ${
        cite.kind === "milestone"
          ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
          : cite.kind === "task"
            ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <span className="opacity-60">{cite.kind[0].toUpperCase()}</span>
      <span className="truncate max-w-[160px]">{cite.label}</span>
    </span>
  );

  const wrapped = cite.href ? (
    <Link to={cite.href} className="no-underline">
      {chip}
    </Link>
  ) : (
    chip
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{wrapped}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="font-medium">{KIND_LABEL[cite.kind]}: {cite.label}</div>
          {cite.subtitle && <div className="text-gray-400 mt-0.5">{cite.subtitle}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
