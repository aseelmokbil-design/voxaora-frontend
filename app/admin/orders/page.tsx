"use client";
import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminOrder } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Search, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react";

const STATUSES = [
  { id: "",                  label: "الكل" },
  { id: "pending",           label: "معلق" },
  { id: "confirmed",         label: "مؤكد" },
  { id: "preparing",         label: "يُحضَّر" },
  { id: "ready_for_pickup",  label: "جاهز" },
  { id: "on_the_way",        label: "في الطريق" },
  { id: "delivered",         label: "تم التوصيل" },
  { id: "cancelled",         label: "ملغي" },
  { id: "rejected",          label: "مرفوض" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:          "rgba(245,158,11,0.15)",
  confirmed:        "rgba(59,130,246,0.15)",
  preparing:        "rgba(139,92,246,0.15)",
  ready_for_pickup: "rgba(16,185,129,0.15)",
  on_the_way:       "rgba(6,182,212,0.15)",
  delivered:        "rgba(34,197,94,0.15)",
  cancelled:        "rgba(239,68,68,0.15)",
  rejected:         "rgba(239,68,68,0.15)",
};
const STATUS_TEXT: Record<string, string> = {
  pending:          "#F59E0B",
  confirmed:        "#3B82F6",
  preparing:        "#8B5CF6",
  ready_for_pickup: "#10B981",
  on_the_way:       "#06B6D4",
  delivered:        "#22C55E",
  cancelled:        "#EF4444",
  rejected:         "#EF4444",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "معلق", confirmed: "مؤكد", preparing: "يُحضَّر",
  ready_for_pickup: "جاهز للاستلام", on_the_way: "في الطريق",
  delivered: "تم التوصيل", cancelled: "ملغي", rejected: "مرفوض",
};

const PAGE_SIZE = 30;

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [page, setPage] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.orders({ status: activeStatus || undefined, search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then(r => { setOrders(r.orders); setTotal(r.total); })
      .catch(() => toast("فشل تحميل الطلبات", "error"))
      .finally(() => setLoading(false));
  }, [activeStatus, search, page, toast]);

  useEffect(() => { setPage(0); }, [activeStatus, search]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, status);
      toast("تم تحديث الحالة", "success");
      load();
    } catch {
      toast("فشل تحديث الحالة", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-2xl">إدارة الطلبات</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} طلب إجمالاً</p>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث برقم الطلب..."
          className="w-full rounded-xl px-4 py-2.5 pr-9 text-white placeholder-white/25 text-sm focus:outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          dir="rtl" />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }} dir="rtl">
        {STATUSES.map(s => (
          <button key={s.id} onClick={() => setActiveStatus(s.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={activeStatus === s.id
              ? { background: "rgba(109,40,255,0.3)", border: "1px solid rgba(109,40,255,0.6)", color: "#A855F7" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-white/40">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id}
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

              {/* Row */}
              <button className="w-full flex items-center gap-3 px-4 py-3 text-right"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                {/* Status badge */}
                <div className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black"
                  style={{ background: STATUS_COLORS[order.status] ?? "rgba(255,255,255,0.08)", color: STATUS_TEXT[order.status] ?? "#fff" }}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </div>

                {/* Order info */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-bold text-sm truncate">#{order.order_number}</p>
                  <p className="text-white/40 text-xs truncate">{order.customer_name || order.customer_phone} • {order.merchant_name}</p>
                </div>

                {/* Amount */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-vox-purple font-black text-sm">{order.total_amount?.toLocaleString()} ر.ي</p>
                  <p className="text-white/25 text-[10px]">{order.created_at ? new Date(order.created_at).toLocaleDateString("ar") : ""}</p>
                </div>

                {/* Voice badge */}
                {order.is_voice_order && (
                  <div className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: "rgba(109,40,255,0.2)", color: "#A855F7" }}>🎙 صوتي</div>
                )}
              </button>

              {/* Expanded: status update */}
              {expandedId === order.id && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <p className="text-white/40 text-xs mb-2 text-right">تغيير الحالة:</p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {STATUSES.filter(s => s.id && s.id !== order.status).map(s => (
                      <button key={s.id}
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, s.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: STATUS_COLORS[s.id] ?? "rgba(255,255,255,0.08)", color: STATUS_TEXT[s.id] ?? "#fff", border: `1px solid ${STATUS_TEXT[s.id]}30` }}>
                        {updatingId === order.id ? "..." : s.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/20 text-[10px] mt-2 text-right">
                    العميل: {order.customer_phone} • الدفع: {order.payment_method ?? "—"}
                  </p>
                </div>
              )}
            </div>
          ))}
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
