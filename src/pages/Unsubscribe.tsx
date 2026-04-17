import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "validating" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "validating" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "Missing unsubscribe token." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data?.valid === true) setState({ kind: "valid" });
        else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid", message: data?.error ?? "Invalid token." });
      } catch (err) {
        setState({ kind: "invalid", message: "Could not validate the link." });
      }
    })();
  }, [token]);

  const onConfirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState({ kind: "done" });
      else if ((data as any)?.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: "Could not process unsubscribe." });
    } catch {
      setState({ kind: "error", message: "Could not process unsubscribe." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <p className="font-mono text-[11px] text-muted-foreground mb-6">cmnt</p>
        <h1 className="font-mono text-[24px] tracking-tight text-foreground mb-4">
          email preferences
        </h1>

        {state.kind === "validating" && (
          <p className="font-mono text-[13px] text-muted-foreground animate-pulse">checking link…</p>
        )}
        {state.kind === "valid" && (
          <>
            <p className="font-sans text-[14px] text-foreground mb-6">
              Click below to unsubscribe from these emails.
            </p>
            <Button variant="dark" size="full" onClick={onConfirm}>
              <span className="font-sans text-[16px]">confirm unsubscribe</span>
            </Button>
          </>
        )}
        {state.kind === "submitting" && (
          <p className="font-mono text-[13px] text-muted-foreground animate-pulse">unsubscribing…</p>
        )}
        {state.kind === "done" && (
          <p className="font-sans text-[14px] text-foreground">
            You have been unsubscribed. You will no longer receive these emails.
          </p>
        )}
        {state.kind === "already" && (
          <p className="font-sans text-[14px] text-foreground">
            This email address is already unsubscribed.
          </p>
        )}
        {state.kind === "invalid" && (
          <p className="font-sans text-[14px] text-destructive">{state.message}</p>
        )}
        {state.kind === "error" && (
          <p className="font-sans text-[14px] text-destructive">{state.message}</p>
        )}
      </div>
    </div>
  );
}
