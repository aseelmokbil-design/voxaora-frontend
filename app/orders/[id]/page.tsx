"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { use } from "react";
import dynamic from "next/dynamic";
import { orderApi, intelligenceApi, Order, TrackingSnapshot } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Phone, Star, RefreshCw, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card" style={{ height: 300 }}>
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  ),
});

type TrackingData = TrackingSnapshot;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready_for_pickup", "picked_up", "delivered"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [reordering, setReordering] = useState(false);

  // Rating state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWs = useCallback(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("vox_token") ?? "";
    if (!t) return;

    const ws = new WebSocket(`${WS_BASE}/ws/orders/${id}?token=${encodeURIComponent(t)}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "tracking_update") {
          setTracking(msg as TrackingData);
          setOrder(prev => prev ? { ...prev, status: msg.status, estimated_delivery_time: msg.eta_minutes } : prev);
          if (["delivered", "cancelled", "rejected"].includes(msg.status)) ws.close();
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      wsRef.current = null;
      setOrder(prev => {
        if (prev && !["delivered", "cancelled", "rejected"].includes(prev.status)) {
          reconnectTimer.current = setTimeout(connectWs, 5000);
        }
        return prev;
      });
    };
  }, [id]);

  useEffect(() => {
    orderApi.get(id)
      .then(o => {
        setOrder(o);
        setRatingSubmitted(o.customer_rating != null);
        setLoading(false);
      })
      .catch(() => { router.push("/orders"); setLoading(false); });

    orderApi.tracking(id).then(setTracking).catch(() => {});
    connectWs();

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [id, router, connectWs]);

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    try {
      const result = await intelligenceApi.reorder(id);
      toast(`تم إعادة الطلب من ${result.merchant_name} ✓`, "success");
      router.push(`/orders/${result.order_id}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "تعذّر إعادة الطلب", "error");
    } finally {
      setReordering(false);
    }
  };

  const submitRating = async () => {
    if (!rating) return;
    setSubmittingRating(true);
    try {
      await orderApi.rate(id, rating, review || undefined);
      setRatingSubmitted(true);
      toast("شكراً على تقييمك! 🌟", "success");
    } catch {
      toast("تعذّر إرسال التقييم", "error");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!order) return null;

  const currentStatus = tracking?.status ?? order.status;
  const stepIdx = STATUS_STEPS.indexOf(currentStatus);
  const isDelivered = currentStatus === "delivered";

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <OrderStatusBadge status={currentStatus} />
          <div className="flex items-center gap-3">
            <h1 className="text-white font-black">#{order.order_number}</h1>
            <button onClick={() => router.back()}>
              <ChevronRight size={22} className="text-vox-muted" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Cancelled / Rejected */}
        {(currentStatus === "cancelled" || currentStatus === "rejected") && (
          <div className="rounded-3xl border border-red-500/20 p-6 text-center fade-in"
               style={{ background: "rgba(239,68,68,0.05)" }}>
            <div className="text-5xl mb-3">{currentStatus === "rejected" ? "🚫" : "❌"}</div>
            <h3 className="text-white font-black text-lg mb-2">
              {currentStatus === "rejected" ? "تم رفض الطلب" : "تم إلغاء الطلب"}
            </h3>
            <p className="text-vox-muted text-sm mb-5 leading-relaxed">
              {currentStatus === "rejected"
                ? "المتجر غير قادر على تلبية طلبك في الوقت الحالي."
                : "تم إلغاء طلبك بنجاح."}
            </p>
            <button
              onClick={handleReorder}
              disabled={reordering}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl px-6 py-3 text-white font-bold text-sm disabled:opacity-60"
            >
              <RefreshCw size={14} className={reordering ? "animate-spin" : ""} />
              {reordering ? "جاري..." : "اطلب مجدداً"}
            </button>
          </div>
        )}

        {/* Delivered celebration */}
        {isDelivered && (
          <div className="rounded-3xl border border-vox-purple/20 p-5 text-center fade-in"
               style={{ background: "rgba(124,58,237,0.05)" }}>
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-white font-bold">وصل طلبك! بالعافية</p>
          </div>
        )}

        {/* Live Map */}
        {currentStatus !== "cancelled" && currentStatus !== "rejected" && tracking && (
          <LiveMap data={tracking} />
        )}

        {/* Driver contact — visible when picked up / on the way / ready_for_pickup */}
        {["ready_for_pickup", "picked_up", "on_the_way"].includes(currentStatus) && order.merchant?.phone && (
          <div className="glass-card p-4">
            <p className="text-vox-muted text-xs text-right mb-3">تواصل</p>
            <div className="flex gap-3">
              <a
                href={`https://wa.me/${order.merchant.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 border border-green-500/30 text-green-400 rounded-2xl py-2.5 text-sm font-semibold hover:bg-green-900/20 transition-colors"
              >
                <MessageCircle size={15} />
                واتساب
              </a>
              <a
                href={`tel:${order.merchant.phone}`}
                className="flex-1 flex items-center justify-center gap-2 border border-vox-border text-white rounded-2xl py-2.5 text-sm font-semibold hover:border-vox-purple/40 transition-colors"
              >
                <Phone size={15} />
                اتصال
              </a>
            </div>
          </div>
        )}

        {/* Progress tracker */}
        {currentStatus !== "cancelled" && (
          <div className="glass-card p-5">
            <h2 className="text-white font-bold text-sm text-right mb-4">تتبع طلبك</h2>
            <div className="relative">
              <div className="absolute top-4 right-4 left-4 h-0.5 bg-vox-border" />
              <div
                className="absolute top-4 right-4 h-0.5 bg-gradient-to-l from-vox-purple to-vox-cyan transition-all duration-700"
                style={{ width: stepIdx >= 0 ? `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
              />
              <div className="flex justify-between relative z-10">
                {[
                  { s: "pending",   label: "استلام", emoji: "📋" },
                  { s: "confirmed", label: "تأكيد",  emoji: "✅" },
                  { s: "preparing", label: "تحضير",  emoji: "👨‍🍳" },
                  { s: "picked_up", label: "شحن",    emoji: "🛵" },
                  { s: "delivered", label: "وصل",    emoji: "🎉" },
                ].map((step) => {
                  const done = stepIdx >= STATUS_STEPS.indexOf(step.s);
                  return (
                    <div key={step.s} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-500 ${
                        done ? "border-vox-purple bg-vox-purple/20 scale-110" : "border-vox-border bg-vox-card"
                      }`}>
                        {step.emoji}
                      </div>
                      <span className={`text-[10px] ${done ? "text-vox-purple" : "text-vox-muted"}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {(tracking?.eta_minutes || order.estimated_delivery_time) && !isDelivered && (
              <p className="text-vox-cyan text-xs text-center mt-4">
                الوقت المتوقع: {tracking?.eta_minutes ?? order.estimated_delivery_time} دقيقة
              </p>
            )}
          </div>
        )}

        {/* Rating — for delivered orders */}
        {isDelivered && (
          <div className="glass-card p-5">
            <h3 className="text-white font-bold text-sm text-right mb-4">
              {ratingSubmitted ? "تقييمك" : "كيف كانت تجربتك؟"}
            </h3>
            {ratingSubmitted ? (
              <div className="text-center py-2">
                <div className="flex justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={22} className={s <= (order.customer_rating ?? rating) ? "text-yellow-400 fill-yellow-400" : "text-vox-border"} />
                  ))}
                </div>
                <p className="text-vox-muted text-xs">شكراً على تقييمك!</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-center gap-2 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star size={28} className={`transition-all ${s <= rating ? "text-yellow-400 fill-yellow-400 scale-110" : "text-vox-border"}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="أضف تعليقاً (اختياري)..."
                    dir="rtl"
                    rows={2}
                    className="w-full bg-vox-card/50 border border-vox-border rounded-2xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors resize-none mb-3"
                  />
                )}
                <button
                  onClick={submitRating}
                  disabled={!rating || submittingRating}
                  className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-3 text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                >
                  {submittingRating ? "جاري الإرسال..." : "إرسال التقييم"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Merchant */}
        {order.merchant && (
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {order.merchant.phone && (
                <a href={`tel:${order.merchant.phone}`}
                  className="w-9 h-9 rounded-xl border border-vox-border flex items-center justify-center">
                  <Phone size={16} className="text-vox-muted" />
                </a>
              )}
            </div>
            <div className="text-right">
              <p className="text-vox-muted text-xs">المتجر</p>
              <p className="text-white font-bold">{order.merchant.name_ar || order.merchant.name}</p>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="glass-card p-4">
          <h3 className="text-white font-bold text-sm text-right mb-3">المنتجات</h3>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-white text-sm">{item.total_price?.toFixed(2)} ر.س</span>
                <div className="text-right">
                  <p className="text-white text-sm">{item.product_name_ar || item.product_name}</p>
                  <p className="text-vox-muted text-xs">x{item.quantity} × {item.unit_price} ر.س</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white">{order.subtotal?.toFixed(2)} ر.س</span>
            <span className="text-vox-muted">المجموع الجزئي</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white">{order.delivery_fee?.toFixed(2)} ر.س</span>
            <span className="text-vox-muted">التوصيل</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-400">-{order.discount_amount?.toFixed(2)} ر.س</span>
              <span className="text-vox-muted">خصم</span>
            </div>
          )}
          <div className="border-t border-vox-border pt-2 flex justify-between font-bold">
            <span className="text-vox-purple text-lg">{order.total_amount?.toFixed(2)} ر.س</span>
            <span className="text-white">الإجمالي</span>
          </div>
        </div>

        {/* Reorder button for delivered */}
        {isDelivered && (
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-3.5 text-white font-bold text-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={reordering ? "animate-spin" : ""} />
            {reordering ? "جاري إعادة الطلب..." : "أعِد هذا الطلب"}
          </button>
        )}

        {/* Cancel */}
        {["pending", "confirmed"].includes(currentStatus) && (
          <button
            onClick={async () => {
              if (!confirm("هل أنت متأكد من إلغاء الطلب؟")) return;
              await orderApi.cancel(id);
              setOrder(o => o ? { ...o, status: "cancelled" } : o);
              wsRef.current?.close();
            }}
            className="w-full border border-red-500/30 text-red-400 rounded-2xl py-3 text-sm font-semibold hover:bg-red-900/20 transition-colors">
            إلغاء الطلب
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
