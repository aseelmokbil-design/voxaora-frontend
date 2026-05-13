"use client";
import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminMerchant } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";
import { Store, Search, RefreshCw, CheckCircle, Ban, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  active:           { label: "نشط",               dot: "#22C55E" },
  inactive:         { label: "غير نشط",           dot: "#6B7280" },
  suspended:        { label: "موقوف",              dot: "#EF4444" },
  pending_approval: { label: "بانتظار الموافقة",  dot: "#FACC15" },
};

const CAT_EMOJI: Record<string, string> = {
  restaurant: "🍔", grocery: "🛒", pharmacy: "💊", coffee: "☕",
  bakery: "🥐", meat: "🥩", mandi: "🍖", fastfood: "🌮",
  breakfast: "🍳", drinks: "🧃", healthy: "🥗", popular: "⭐",
  electronics: "💻", services: "🔧", other: "🏪",
};

const PAGE_SIZE = 30;

export default function AdminMerchantsPage() {
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]           = useState(0);
  const [actionId, setActionId]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.merchants({
      status: statusFilter || undefined,
      search: search       || undefined,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(r => { setMerchants(r.merchants); setTotal(r.total); })
      .catch(() => toast("فشل تحميل المتاجر", "error"))
      .finally(() => setLoading(false));
  }, [statusFilter, search, page, toast]);

  useEffect(() => { setPage(0); }, [statusFilter, search]);
  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string) => {
    setActionId(id);
    try {
      await adminApi.merchantAction(id, action);
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
    <div className="max-w-4xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-2xl">إدارة المتاجر</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} متجر إجمالاً</p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المدينة..."
            dir="rtl"
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-white text-sm focus:outline-none placeholder-white/20"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none sm:w-44"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="pending_approval">بانتظار الموافقة</option>
          <option value="suspended">موقوف</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/25">
          <Store size={44} className="mb-3" />
          <p className="font-semibold">لا توجد متاجر</p>
        </div>
      ) : (
        <div className="space-y-2">
          {merchants.map(m => {
            const st   = STATUS_MAP[m.status] ?? { label: m.status, dot: "#6B7280" };
            const busy = actionId === m.id;

            return (
              <div key={m.id}
                className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all"
                style={{ background: "rgba(18,18,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>

                {/* Logo */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {m.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={m.logo_url} alt="" className="w-full h-full object-cover" />
                    : CAT_EMOJI[m.category] ?? "🏪"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-bold text-sm truncate">{m.name_ar || m.name}</p>
                  <p className="text-white/35 text-xs truncate">{m.city} · {m.total_orders.toLocaleString()} طلب</p>
                  <div className="flex items-center gap-1.5 justify-end mt-1">
                    <span className="text-[10px] font-bold" style={{ color: st.dot }}>{st.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.dot }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link href={`/admin/merchants/${m.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{ background: "rgba(109,40,255,0.15)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.25)" }}>
                    <span className="hidden sm:inline">تعديل</span>
                    <ChevronLeft size={12} />
                  </Link>

                  {m.status === "pending_approval" && (
                    <button onClick={() => handleAction(m.id, "approve")} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                      {busy ? <div className="w-3 h-3 border border-green-400/50 border-t-green-400 rounded-full animate-spin" /> : <CheckCircle size={12} />}
                      <span className="hidden sm:inline">موافقة</span>
                    </button>
                  )}
                  {m.status === "active" && (
                    <button onClick={() => handleAction(m.id, "suspend")} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {busy ? <div className="w-3 h-3 border border-red-400/50 border-t-red-400 rounded-full animate-spin" /> : <Ban size={12} />}
                      <span className="hidden sm:inline">إيقاف</span>
                    </button>
                  )}
                  {(m.status === "suspended" || m.status === "inactive") && (
                    <button onClick={() => handleAction(m.id, "approve")} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                      {busy ? <div className="w-3 h-3 border border-green-400/50 border-t-green-400 rounded-full animate-spin" /> : <RotateCcw size={12} />}
                      <span className="hidden sm:inline">تفعيل</span>
                    </button>
                  )}
                </div>
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
