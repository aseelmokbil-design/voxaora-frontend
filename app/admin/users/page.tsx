"use client";
import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminUser } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Search, RefreshCw, ChevronRight, ChevronLeft, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  customer: "عميل", merchant: "تاجر", driver: "سائق",
  admin: "مدير", super_admin: "سوبر أدمن",
};
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  customer:    { bg: "rgba(59,130,246,0.12)",   text: "#60A5FA" },
  merchant:    { bg: "rgba(16,185,129,0.12)",   text: "#34D399" },
  driver:      { bg: "rgba(6,182,212,0.12)",    text: "#22D3EE" },
  admin:       { bg: "rgba(139,92,246,0.12)",   text: "#A78BFA" },
  super_admin: { bg: "rgba(109,40,255,0.2)",    text: "#A855F7" },
};
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: "rgba(34,197,94,0.1)",  text: "#22C55E", dot: "#22C55E" },
  inactive:  { bg: "rgba(107,114,128,0.1)", text: "#9CA3AF", dot: "#6B7280" },
  suspended: { bg: "rgba(239,68,68,0.1)",  text: "#EF4444", dot: "#EF4444" },
};

const ROLES   = ["", "customer", "merchant", "driver", "admin"];
const PAGE_SIZE = 40;

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]     = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.users({
      search: search || undefined,
      role:   roleFilter   || undefined,
      status: statusFilter || undefined,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(r => { setUsers(r.users); setTotal(r.total); })
      .catch(() => toast("فشل تحميل المستخدمين", "error"))
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter, page, toast]);

  useEffect(() => { setPage(0); }, [search, roleFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const handleAction = async (userId: string, action: string) => {
    setActionId(userId);
    try {
      await adminApi.userAction(userId, action);
      toast("تم تحديث الحالة", "success");
      load();
    } catch {
      toast("فشل تحديث الحالة", "error");
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-2xl">إدارة العملاء</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} مستخدم إجمالاً</p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-white text-sm focus:outline-none placeholder-white/20"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none sm:w-36"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="">كل الأدوار</option>
          {ROLES.filter(r => r).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none sm:w-36"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users size={44} className="text-white/15 mb-3" />
          <p className="text-white/35 font-semibold">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const roleStyle   = ROLE_COLORS[u.role]   ?? { bg: "rgba(255,255,255,0.06)", text: "#fff" };
            const statusStyle = STATUS_COLORS[u.status] ?? { bg: "rgba(255,255,255,0.06)", text: "#9CA3AF", dot: "#6B7280" };
            const busy = actionId === u.id;

            return (
              <div key={u.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
                  {u.full_name?.[0] ?? "؟"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-bold text-sm truncate">{u.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{u.phone}{u.email ? ` • ${u.email}` : ""}</p>
                </div>

                {/* Role badge */}
                <div className="hidden sm:flex flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black"
                  style={{ background: roleStyle.bg, color: roleStyle.text }}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </div>

                {/* Status dot */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusStyle.dot }} />
                  <span className="hidden sm:inline text-xs" style={{ color: statusStyle.text }}>
                    {u.status === "active" ? "نشط" : u.status === "suspended" ? "موقوف" : "غير نشط"}
                  </span>
                </div>

                {/* Action */}
                {u.role !== "super_admin" && (
                  u.status === "active" ? (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(u.id, "suspend")}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {busy ? "..." : "إيقاف"}
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(u.id, "activate")}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.2)" }}>
                      {busy ? "..." : "تفعيل"}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight size={15} className="text-white" />
          </button>
          <span className="text-white/50 text-sm">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft size={15} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
