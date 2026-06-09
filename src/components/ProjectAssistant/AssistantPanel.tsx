import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { IconSend, IconSparkles } from "@tabler/icons-react";
import { RenderedAnswer, type CitationMap } from "./Citations";

type Msg = { role: "user" | "assistant"; content: string; citations?: CitationMap };

const SUGGESTED = [
  "What happened today?",
  "What's blocked or overdue?",
  "Explain my next task",
  "Where are we on progress?",
];

export function AssistantPanel({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ephemeral: clear when closed
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setLoading(false);
    } else {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("project-assistant", {
        body: { projectId, messages: next },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "No response.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry, something went wrong. ${e?.message ?? ""}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-gray-200">
          <SheetTitle className="flex items-center gap-2 text-base">
            <IconSparkles size={18} stroke={1.75} />
            Project assistant
          </SheetTitle>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gray-500">
            Ask anything about this project · read-only
          </p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Get a recap of today, understand a task, or surface what's stuck.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs text-gray-800 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-3xl rounded-tr-md bg-foreground text-background px-4 py-2.5 text-sm whitespace-pre-wrap"
                    : "max-w-[95%] text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-gray-500 animate-pulse">Thinking…</div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about this project…"
              rows={1}
              className="flex-1 resize-none min-h-[44px] max-h-32 rounded-2xl"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <IconSend size={18} stroke={1.75} />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
