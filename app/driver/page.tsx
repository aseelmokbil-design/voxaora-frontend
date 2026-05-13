"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { driverApi, DriverProfile, DriverAvailableOrder, DriverCurrentOrder } from "@/lib/api";
import { useDriverWS } from "@/hooks/useDriverWS";
import { useToast } from "@/context/ToastContext";
import { MapPin, Package, ChevronLeft, Star, Wifi, WifiOff, Clock, Zap } from "lucide-react";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vox_token");
}

export default function DriverHomePage() {
  const { toast } = useToast();
  const router = useRouter();

  const [profile, setProfile]           = useState<DriverProfile | null>(null);
  const [available, setAvailable]        = useState<DriverAvailableOrder[]>([]);
  const [currentOrder, setCurrentOrder]  = useState<DriverCurrentOrder | null>(null);
  const [loading, setLoading]            = useState(true);
  const [toggling, setToggling]          = useState(false);
  const [acceptingId, setAcceptingId]    = useState<string | null>(null);
  const [token, setToken]                = useState<string | null>(null);
  const newOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => { setToken(getToken()); }, []);

  const loadAll = useCallback(async () => {
    try {
      const [prof, cur] = await Promise.all([driverApi.me(), driverApi.currentOrder()]);
      setProfile(prof);
      setCurrentOrder(cur.order);
      if (prof.status === "available" && !cur.order) {
        const avail = await driverApi.availableOrders();
        setAvailable(avail.orders);
        newOrderIds.current = new Set(avail.orders.map(o => o.id));
      } else {
        setAvailable([]);
      }
    } catch { /* profile may not exist */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Handle new order via WebSocket
  const handleNewOrder = useCallback((order: DriverAvailableOrder) => {
    if (newOrderIds.current.has(order.id)) return;
    newOrderIds.current.add(order.id);
    setAvailable(prev => [order, ...prev]);
    toast("طلب جديد وارد! 🛵", "success");
  }, [toast]);

  const handleOrderTaken = useCallback((orderId: string) => {
    newOrderIds.current.delete(orderId);
    setAvailable(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const isOnline = profile?.status === "available";
  const isBusy   = profile?.status === "busy";

  useDriverWS({
    token,
    enabled: !!(isOnline && !currentOrder && token),
    onNewOrder: handleNewOrder,
    onOrderTaken: handleOrderTaken,
  });

  const toggleStatus = async () => {
    if (!profile) return;
    setToggling(true);
    const next = isOnline ? "offline" : "available";
    try {
      await driverApi.setStatus(next as "available" | "offline");
      setProfile(p => p ? { ...p, status: next } : p);
      if (next === "offline") {
        setAvailable([]);
        newOrderIds.current.clear();
      } else {
        const avail = await driverApi.availableOrders();
        setAvailable(avail.orders);
        newOrderIds.current = new Set(avail.orders.map(o => o.id));
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل تغيير الحالة", "error");
    } finally { setToggling(false); }
  };

  const acceptOrder = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      await driverApi.accept(orderId);
      toast("تم قبول الطلب", "success");
      router.push(`/driver/order/${orderId}`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل قبول الطلب", "error");
      setAcceptingId(null);
    }
  };

  const rejectOrder = async (orderId: string) => {
    await driverApi.reject(orderId);
    newOrderIds.current.delete(orderId);
    setAvailable(prev => prev.filter(o => o.id !== orderId));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="skeleton h-36 rounded-3xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-8 text-center">
        <p className="text-5xl">🏍️</p>
        <h2 className="text-white font-black text-xl">لا يوجد ملف سائق</h2>
        <p className="text-white/40 text-sm">تواصل مع الإدارة لإنشاء حساب السائق</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">

      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-10 pb-8"
        style={{ background: isOnline || isBusy ? "linear-gradient(135deg,#6D28FF,#A855F7)" : "rgba(18,18,30,1)" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs mb-1">مرحباً،</p>
            <h1 className="text-white font-black text-2xl leading-tight">{profile.full_name}</h1>
            <div className="flex items-center gap-1 mt-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-white/70 text-xs font-bold">{profile.rating.toFixed(1)}</span>
              <span className="text-white/40 text-xs">• {profile.total_deliveries} توصيلة</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.25)" }}>
              {isOnline ? <Wifi size={13} className="text-green-400" /> :
               isBusy   ? <Package size={13} className="text-yellow-400" /> :
                          <WifiOff size={13} className="text-white/40" />}
              <span className="text-xs font-bold text-white">
                {isOnline ? "متصل" : isBusy ? "مشغول" : "غير متصل"}
              </span>
            </div>
            {isOnline && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.2)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-white/60">WebSocket نشط</span>
              </div>
            )}
          </div>
        </div>

        {!isBusy && (
          <button onClick={toggleStatus} disabled={toggling}
            className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-60"
            style={isOnline
              ? { background: "rgba(0,0,0,0.25)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)" }
              : { background: "rgba(109,40,255,0.9)", color: "#fff", border: "2px solid rgba(109,40,255,0.5)" }}>
            {toggling ? "جاري..." : isOnline ? "إيقاف الاتصال" : "بدء العمل"}
          </button>
        )}
      </div>

      {/* Active order banner */}
      {currentOrder && (
        <div className="mx-4 -mt-4 rounded-2xl p-4 z-10"
          style={{ background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.4)" }}>
          <p className="text-yellow-400 text-xs font-black mb-2">⚡ طلب نشط</p>
          <p className="text-white font-bold text-base mb-0.5">#{currentOrder.order_number}</p>
          <p className="text-white/60 text-xs mb-3">{currentOrder.merchant_name}</p>
          <button onClick={() => router.push(`/driver/order/${currentOrder.id}`)}
            className="w-full py-2.5 rounded-xl font-black text-sm text-white"
            style={{ background: "rgba(245,158,11,0.3)", border: "1px solid rgba(245,158,11,0.5)" }}>
            متابعة الطلب ←
          </button>
        </div>
      )}

      {/* Available orders */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {isOnline && !currentOrder && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-sm font-bold">الطلبات المتاحة</p>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30 text-xs">{available.length} طلب</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400/70 text-[10px]">مباشر</span>
              </div>
            </div>

            {available.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Package size={28} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">لا توجد طلبات حالياً</p>
                <p className="text-white/20 text-xs">ستصلك إشعارات فورية عبر WebSocket</p>
              </div>
            ) : (
              available.map(order => (
                <OrderCard key={order.id} order={order}
                  accepting={acceptingId === order.id}
                  onAccept={() => acceptOrder(order.id)}
                  onReject={() => rejectOrder(order.id)} />
              ))
            )}
          </>
        )}

        {!isOnline && !isBusy && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <WifiOff size={40} className="text-white/10" />
            <p className="text-white/30 text-sm">أنت غير متصل</p>
            <p className="text-white/20 text-xs">اضغط "بدء العمل" لاستقبال الطلبات</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, accepting, onAccept, onReject }: {
  order: DriverAvailableOrder & { is_peak?: boolean };
  accepting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const addr = order.delivery_address as Record<string, string> | null;

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-white font-black text-base">#{order.order_number}</p>
            {order.is_peak && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: "rgba(245,158,11,0.2)", color: "#FBBF24" }}>
                <Zap size={9} />ذروة
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Package size={11} className="text-white/40" />
            <p className="text-white/50 text-xs">{order.merchant_name} · {order.items_count} عناصر</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-vox-purple font-black text-lg">{order.driver_earnings.toLocaleString()} ر.ي</p>
          <p className="text-white/30 text-[10px]">أرباحك</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#A855F7" }} />
          <p className="text-white/60 text-xs">{order.merchant_address}</p>
        </div>
        {addr?.full_address && (
          <div className="flex items-start gap-2">
            <MapPin size={11} className="text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-white/60 text-xs">{addr.full_address}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Clock size={11} className="text-white/30" />
        <p className="text-white/30 text-[10px]">
          {order.created_at ? new Date(order.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : ""}
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onReject}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          رفض
        </button>
        <button onClick={onAccept} disabled={accepting}
          className="flex-[2] py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 active:scale-95"
          style={{ background: "rgba(109,40,255,0.8)", color: "#fff" }}>
          {accepting ? "جاري القبول..." : "قبول الطلب"}
        </button>
      </div>
    </div>
  );
}
