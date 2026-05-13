"use client";
import { useState, useEffect, useCallback } from "react";
import { driverApi, DriverHistoryOrder } from "@/lib/api";
import { Package, ChevronRight, ChevronLeft } from "lucide-react";

const PAGE_SIZE = 20;

export default function DriverHistoryPage() {
  const [orders, setOrders] = useState<DriverHistoryOrder[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    driverApi.history(PAGE_SIZE, page * PAGE_SIZE)
      .then(r => { setOrders(r.orders); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-4 pt-10 pb-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-white font-black text-2xl">سجل التوصيلات</h1>
        <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} توصيلة مكتملة</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={40} className="text-white/10" />
          <p className="text-white/30 text-sm">لا توجد توصيلات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <Package size={18} className="text-green-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-white font-bold text-sm">#{o.order_number}</p>
                <p className="text-white/40 text-xs truncate">{o.merchant_name}</p>
              </div>

              {/* Earnings + date */}
              <div className="text-right flex-shrink-0">
                <p className="text-green-400 font-black text-sm">{o.driver_earnings.toLocaleString()} ر.ي</p>
                <p className="text-white/25 text-[10px]">
                  {o.delivered_at ? new Date(o.delivered_at).toLocaleDateString("ar") : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight size={15} className="text-white" />
          </button>
          <span className="text-white/50 text-sm">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft size={15} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
