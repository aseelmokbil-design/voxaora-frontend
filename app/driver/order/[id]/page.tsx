"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { driverApi, DriverCurrentOrder } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ArrowRight, MapPin, Phone, Package, CheckCircle, Navigation } from "lucide-react";

type LocalStep = "to_store" | "at_store" | "on_the_way" | "done";

function orderStatusToStep(status: string): LocalStep {
  if (status === "on_the_way") return "on_the_way";
  if (status === "delivered")  return "done";
  return "to_store";
}

export default function DriverOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<DriverCurrentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<LocalStep>("to_store");
  const [updating, setUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const r = await driverApi.currentOrder();
      if (r.order && r.order.id === id) {
        setOrder(r.order);
        setStep(prev => {
          const fromStatus = orderStatusToStep(r.order!.status);
          // If we already advanced to at_store locally, keep that
          if (prev === "at_store" && fromStatus === "to_store") return "at_store";
          return fromStatus;
        });
      } else {
        // Order no longer active — could be delivered
        router.replace("/driver");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const doStep = async (nextStep: "at_store" | "picked_up" | "delivered") => {
    if (!order) return;
    setUpdating(true);
    try {
      await driverApi.step(order.id, nextStep);
      if (nextStep === "at_store") {
        setStep("at_store");
        toast("وصلت إلى المتجر ✓", "success");
      } else if (nextStep === "picked_up") {
        setStep("on_the_way");
        setOrder(o => o ? { ...o, status: "on_the_way" } : o);
        toast("تم الاستلام — في الطريق", "success");
      } else {
        setStep("done");
        toast("تم التسليم بنجاح 🎉", "success");
        setTimeout(() => router.replace("/driver"), 2500);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل تحديث الحالة";
      toast(msg, "error");
    } finally {
      setUpdating(false);
    }
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <div className="skeleton h-12 w-24 rounded-xl" />
        <div className="skeleton h-48 rounded-3xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!order) return null;

  const addr = order.delivery_address as Record<string, string> | null;
  const isDone = step === "done";

  const STEPS: { key: LocalStep; label: string; icon: React.ReactNode }[] = [
    { key: "to_store",   label: "إلى المتجر",   icon: <Navigation size={14} /> },
    { key: "at_store",   label: "في المتجر",    icon: <Package size={14} />    },
    { key: "on_the_way", label: "التوصيل",      icon: <MapPin size={14} />     },
    { key: "done",       label: "مكتمل",        icon: <CheckCircle size={14} />},
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-dvh flex flex-col">

      {/* Header */}
      <div className="px-4 pt-10 pb-5"
        style={{ background: "rgba(10,10,20,1)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-4 transition-colors">
          <ArrowRight size={16} />
          رجوع
        </button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/50 text-xs mb-0.5">طلب رقم</p>
            <p className="text-white font-black text-2xl">#{order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-vox-purple font-black text-xl">{order.driver_earnings.toLocaleString()} ر.ي</p>
            <p className="text-white/30 text-[10px]">أرباحك</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-0 mt-5">
          {STEPS.map((s, i) => {
            const done    = i < stepIdx;
            const current = i === stepIdx;
            const future  = i > stepIdx;
            return (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{
                      background: done || current ? "rgba(109,40,255,0.8)" : "rgba(255,255,255,0.07)",
                      border: current ? "2px solid #A855F7" : "none",
                      color: done || current ? "#fff" : "rgba(255,255,255,0.25)",
                    }}>
                    {s.icon}
                  </div>
                  <p className="text-[9px] font-bold whitespace-nowrap"
                    style={{ color: current ? "#A855F7" : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-1 -mt-4"
                    style={{ background: i < stepIdx ? "rgba(109,40,255,0.6)" : "rgba(255,255,255,0.1)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">

        {/* Merchant card */}
        {(step === "to_store" || step === "at_store") && (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(109,40,255,0.08)", border: "1px solid rgba(109,40,255,0.25)" }}>
            <p className="text-vox-purple text-xs font-black">📍 عنوان المتجر</p>
            <p className="text-white font-bold text-base">{order.merchant_name}</p>
            {order.merchant_phone && (
              <a href={`tel:${order.merchant_phone}`}
                className="flex items-center gap-2 w-fit">
                <Phone size={13} className="text-white/50" />
                <span className="text-white/60 text-sm">{order.merchant_phone}</span>
              </a>
            )}
            <button
              onClick={() => openMaps(order.merchant_lat, order.merchant_lng, order.merchant_name)}
              className="flex items-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold justify-center transition-all active:scale-95"
              style={{ background: "rgba(109,40,255,0.2)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.3)" }}>
              <Navigation size={14} />
              فتح الخريطة
            </button>
          </div>
        )}

        {/* Customer card */}
        {(step === "on_the_way" || step === "done") && (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-green-400 text-xs font-black">🏠 عنوان العميل</p>
            <p className="text-white font-bold text-base">{order.customer_name}</p>
            {addr?.full_address && (
              <p className="text-white/60 text-sm">{addr.full_address}</p>
            )}
            <div className="flex gap-2">
              <a href={`tel:${order.customer_phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(34,197,94,0.15)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.3)" }}>
                <Phone size={14} />
                اتصال
              </a>
              {addr && (
                <button
                  onClick={() => openMaps(
                    parseFloat(String(addr.latitude || 0)),
                    parseFloat(String(addr.longitude || 0)),
                    order.customer_name,
                  )}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <Navigation size={14} />
                  خريطة
                </button>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        {order.items.length > 0 && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-white/50 text-xs font-bold mb-3">محتويات الطلب</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-white/70 text-sm">{item.name}</span>
                <span className="text-white/40 text-xs font-bold">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom action button */}
      {!isDone && (
        <div className="p-4 pb-8">
          {step === "to_store" && (
            <button onClick={() => doStep("at_store")} disabled={updating}
              className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)", color: "#fff" }}>
              {updating ? "جاري..." : "وصلت إلى المتجر"}
            </button>
          )}
          {step === "at_store" && (
            <button onClick={() => doStep("picked_up")} disabled={updating}
              className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)", color: "#fff" }}>
              {updating ? "جاري..." : "تم الاستلام — انطلق"}
            </button>
          )}
          {step === "on_the_way" && (
            <button onClick={() => doStep("delivered")} disabled={updating}
              className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#059669,#10B981)", color: "#fff" }}>
              {updating ? "جاري..." : "تم التسليم ✓"}
            </button>
          )}
        </div>
      )}

      {/* Done state */}
      {isDone && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <p className="text-white font-black text-2xl">تم التسليم!</p>
          <p className="text-white/40 text-sm">ربحت {order.driver_earnings.toLocaleString()} ر.ي</p>
          <p className="text-white/25 text-xs">يتم توجيهك للرئيسية...</p>
        </div>
      )}
    </div>
  );
}
