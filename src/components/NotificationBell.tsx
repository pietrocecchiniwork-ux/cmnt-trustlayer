import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useRealtimeNotifications,
  type Notification,
} from "@/hooks/useNotifications";

const HIDDEN_ROUTES = ["/auth", "/forgot-password", "/reset-password", "/unsubscribe"];

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useRealtimeNotifications();
  const { data: notifications = [] } = useNotifications(10);
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const isHidden = HIDDEN_ROUTES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  if (isHidden) return null;

  const onClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
    else navigate("/inbox");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Notifications"
          className="fixed top-3 right-16 z-50 w-10 h-10 rounded-full bg-card flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-transform active:scale-95"
        >
          <Bell size={18} strokeWidth={1.75} className="text-foreground" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full font-mono text-[10px] font-medium flex items-center justify-center"
              style={{ backgroundColor: "#FF4500", color: "#0a0a0a" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] max-w-[100vw] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-sans text-[18px] tracking-[-0.01em] lowercase">
              notifications
            </SheetTitle>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-[0.06em]"
              >
                mark all read
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-10 text-center font-sans text-[14px] text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onClick(n)}
                className="w-full text-left px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex gap-3"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.read_at ? "bg-transparent" : ""
                  }`}
                  style={!n.read_at ? { backgroundColor: "#FF4500" } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[14px] font-medium text-foreground truncate">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="font-sans text-[13px] text-muted-foreground truncate">{n.body}</p>
                  )}
                  <p className="font-mono text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-[0.06em]">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => { setOpen(false); navigate("/inbox"); }}
            className="font-sans text-[13px] text-foreground hover:text-foreground/70"
          >
            View all
          </button>
          <button
            onClick={() => { setOpen(false); navigate("/settings/notifications"); }}
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-[0.06em]"
          >
            settings
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
