import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATION_EVENT_TYPES,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/useNotifications";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { data: prefs = [], isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  const get = (eventType: string) => {
    const p = prefs.find((x) => x.event_type === eventType);
    return { in_app: p?.in_app ?? true, email: p?.email ?? true };
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <div className="px-6 pt-20 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-card flex items-center justify-center"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div>
            <p className="t-eyebrow">settings</p>
            <p className="font-sans text-[26px] tracking-[-0.02em] text-foreground lowercase">
              notifications
            </p>
          </div>
        </div>

        <div className="px-6 pb-24 flex-1">
          <p className="font-sans text-[14px] text-muted-foreground mb-5">
            Choose how you want to be notified. In-app shows in your inbox; email is delivered to your inbox.
          </p>

          {isLoading ? (
            <p className="font-mono text-[13px] text-muted-foreground animate-pulse">loading…</p>
          ) : (
            <div className="bg-card rounded-3xl overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
                <span className="t-eyebrow flex-1">event</span>
                <span className="t-eyebrow w-16 text-center">in-app</span>
                <span className="t-eyebrow w-16 text-center">email</span>
              </div>
              {NOTIFICATION_EVENT_TYPES.map((ev, i) => {
                const v = get(ev.type);
                return (
                  <div
                    key={ev.type}
                    className={`px-5 py-4 flex items-center gap-3 ${
                      i !== NOTIFICATION_EVENT_TYPES.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[14px] font-medium text-foreground">{ev.label}</p>
                      <p className="font-sans text-[12px] text-muted-foreground">{ev.description}</p>
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={v.in_app}
                        onCheckedChange={(checked) =>
                          update.mutate({ event_type: ev.type, in_app: checked, email: v.email })
                        }
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={v.email}
                        onCheckedChange={(checked) =>
                          update.mutate({ event_type: ev.type, in_app: v.in_app, email: checked })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
