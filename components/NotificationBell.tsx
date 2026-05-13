"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { notificationApi, AppNotification } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

const TYPE_EMOJI: Record<string, string> = {
  order_confirmed: "✅", order_preparing: "👨‍🍳", order_ready: "📦",
  order_picked_up: "🛵", order_delivered: "🎉", order_cancelled: "❌",
  driver_assigned: "🚗", promo: "🎁", system: "🔔",
};

export default function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<AppNotification[]>([]);
  const [unread, setUnread]   = useState(0);
  const prevUnreadRef         = useRef(-1);   // -1 = not yet loaded
  const { toast }             = useToast();

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await notificationApi.list();
      // Only toast if we have a baseline and count grew
      if (prevUnreadRef.current >= 0 && data.unread_count > prevUnreadRef.current) {
        const newest = data.notifications.find(n => !n.is_read);
        if (newest) toast(newest.title, "info");
      }
      prevUnreadRef.current = data.unread_count;
      setNotifs(data.notifications);
      setUnread(data.unread_count);
    } catch {}
  }, [toast]);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    // Also refetch when tab becomes visible
    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifs(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [fetchNotifs]);

  const markAllRead = async () => {
    await notificationApi.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    prevUnreadRef.current = 0;
  };

  const markRead = async (id: string) => {
    await notificationApi.markRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); fetchNotifs(); }}
        className="relative p-2 rounded-xl hover:bg-vox-card/50 transition-colors"
      >
        <Bell size={22} className="text-vox-muted" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-vox-purple rounded-full text-[9px] text-white font-black flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[150]" onClick={() => setOpen(false)}>
          <div
            className="absolute top-16 left-3 right-3 max-h-[72vh] overflow-y-auto rounded-3xl border border-vox-border shadow-2xl fade-in"
            style={{ background: "rgba(10,10,15,0.98)", backdropFilter: "blur(24px)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-vox-border sticky top-0"
                 style={{ background: "rgba(10,10,15,0.98)" }}>
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-vox-muted text-xs hover:text-white transition-colors">
                <CheckCheck size={14} /> قراءة الكل
              </button>
              <h3 className="text-white font-bold text-sm">الإشعارات</h3>
              <button onClick={() => setOpen(false)} className="p-1">
                <X size={18} className="text-vox-muted" />
              </button>
            </div>

            {notifs.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-5xl mb-3">🔔</p>
                <p className="text-vox-muted text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              notifs.map((n, idx) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-right transition-colors hover:bg-vox-card/30 ${
                    idx < notifs.length - 1 ? "border-b border-vox-border/40" : ""
                  } ${n.is_read ? "opacity-55" : "bg-vox-purple/5"}`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${n.is_read ? "text-vox-muted" : "text-white"}`}>
                      {n.title}
                    </p>
                    <p className="text-vox-muted text-xs mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    <p className="text-vox-border text-[10px] mt-1">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
                        : ""}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-vox-purple flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
