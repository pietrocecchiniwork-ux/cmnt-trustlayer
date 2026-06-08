import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useRealtimeNotifications,
  type Notification,
} from "@/hooks/useNotifications";

function groupKey(d: Date): string {
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  return "earlier";
}

export default function NotificationsInbox() {
  const navigate = useNavigate();
  useRealtimeNotifications();
  const { data: notifications = [], isLoading } = useNotifications(100);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = notifications.filter((n) => !n.read_at).length;

  const grouped: Record<string, Notification[]> = { today: [], yesterday: [], earlier: [] };
  for (const n of notifications) grouped[groupKey(new Date(n.created_at))].push(n);

  const onClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-20 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="w-9 h-9 rounded-full bg-card flex items-center justify-center"
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
            <div>
              <p className="t-eyebrow">inbox</p>
              <p className="font-sans text-[26px] tracking-[-0.02em] text-foreground lowercase">
                notifications
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-[0.06em]"
            >
              mark all read
            </button>
          )}
        </div>

        <div className="px-6 pb-24 flex-1 space-y-6">
          {isLoading ? (
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading…</p>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-sans text-[15px] text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            (["today", "yesterday", "earlier"] as const).map((g) =>
              grouped[g].length === 0 ? null : (
                <section key={g} className="space-y-2">
                  <p className="t-eyebrow">{g}</p>
                  <div className="bg-card rounded-3xl overflow-hidden">
                    {grouped[g].map((n, i) => (
                      <button
                        key={n.id}
                        onClick={() => onClick(n)}
                        className={`w-full text-left px-5 py-4 flex gap-3 hover:bg-gray-50 transition-colors ${
                          i !== grouped[g].length - 1 ? "border-b border-gray-100" : ""
                        }`}
                      >
                        <span
                          className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                          style={!n.read_at ? { backgroundColor: "#FF4500" } : { backgroundColor: "transparent" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-[14px] font-medium text-foreground">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="font-sans text-[13px] text-muted-foreground">{n.body}</p>
                          )}
                          <p className="font-mono text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-[0.06em]">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
