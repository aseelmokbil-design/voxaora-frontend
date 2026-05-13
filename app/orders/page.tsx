"use client";
import { useEffect, useState, useCallback } from "react";
import { orderApi, intelligenceApi, Order } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronLeft, RefreshCw } from "lucide-react";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try { setOrders(await orderApi.list()); } catch {}
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    orderApi.list().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  // Refetch when tab becomes active
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") loadOrders(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadOrders]);

  const handleReorder = useCallback(async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReordering(orderId);
    try {
      const result = await intelligenceApi.reorder(orderId);
      toast(`تم إعادة الطلب من ${result.merchant_name} ✓`, "success");
      router.push(`/orders/${result.order_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر إعادة الطلب";
      toast(msg, "error");
    } finally {
      setReordering(null);
    }
  }, [router, toast]);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
        <h1 className="text-xl font-black text-white text-right">طلباتي</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 fade-in">
            <ClipboardList size={60} className="text-vox-border mb-4" />
            <p className="text-white font-bold text-lg mb-2">لا توجد طلبات بعد</p>
            <p className="text-vox-muted text-sm mb-6">ابدأ بطلب شيء لذيذ!</p>
            <Link href="/" className="bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl px-8 py-3 text-white font-bold">
              اطلب الآن
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mt-2 slide-up">
            {orders.map(order => {
              const isTerminal = ["delivered", "cancelled", "rejected"].includes(order.status);
              const canReorder = ["delivered"].includes(order.status);
              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="glass-card block p-4 rounded-2xl hover:border-vox-purple/40 transition-all active:scale-[0.99]">
                  <div className="flex items-start justify-between mb-2">
                    <ChevronLeft size={16} className="text-vox-muted mt-1" />
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        {order.merchant?.name_ar || order.merchant?.name || "متجر"}
                      </p>
                      <p className="text-vox-muted text-xs mt-0.5">#{order.order_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{order.total_amount?.toFixed(2)} ر.س</span>
                      {order.is_voice_order && (
                        <span className="text-xs bg-vox-purple/20 text-vox-purple px-2 py-0.5 rounded-full">🎙️ صوتي</span>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {canReorder && (
                        <button
                          onClick={(e) => handleReorder(order.id, e)}
                          disabled={reordering === order.id}
                          className="flex items-center gap-1 text-xs font-bold text-vox-purple border border-vox-purple/30 px-2.5 py-1 rounded-xl hover:bg-vox-purple/10 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={11} className={reordering === order.id ? "animate-spin" : ""} />
                          {reordering === order.id ? "جاري..." : "أعِد الطلب"}
                        </button>
                      )}
                    </div>
                    <p className="text-vox-muted text-xs text-right">
                      {order.items.length} منتج •{" "}
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("ar-SA") : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
