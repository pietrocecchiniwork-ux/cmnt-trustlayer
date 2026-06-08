import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useSupabaseProject";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;
export type NotificationPref = Tables<"notification_preferences">;

export const NOTIFICATION_EVENT_TYPES: { type: string; label: string; description: string }[] = [
  { type: "project_invite", label: "Project invites", description: "Added to a new project or team" },
  { type: "task_assigned", label: "Task assignments", description: "A task is assigned to you" },
  { type: "milestone_submitted", label: "Milestone submitted", description: "A milestone is submitted for your review" },
  { type: "milestone_approved", label: "Milestone approved", description: "Your milestone has been approved" },
  { type: "milestone_rejected", label: "Milestone needs more evidence", description: "Your milestone was sent back" },
  { type: "evidence_submitted", label: "Evidence submitted", description: "New evidence on a project you manage" },
  { type: "payment_authorized", label: "Payment certificate ready", description: "A certificate needs your authorization" },
  { type: "payment_released", label: "Payment released", description: "A payment was released" },
];

export function useNotifications(limit = 50) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter((n) => !n.read_at).length;
}

export function useMarkRead() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

export function useRealtimeNotifications() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          toast(n.title, { description: n.body ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);
}

export function useNotificationPreferences() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as NotificationPref[];
    },
  });
}

export function useUpdateNotificationPreference() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  return useMutation({
    mutationFn: async (input: { event_type: string; in_app?: boolean; email?: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            event_type: input.event_type,
            in_app: input.in_app ?? true,
            email: input.email ?? true,
          },
          { onConflict: "user_id,event_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs", user?.id] }),
  });
}
