"use client";
import { useState, useEffect } from "react";
import { driverApi, DriverEarningsFull } from "@/lib/api";
import { Star, TrendingUp, Zap, Trophy, ChevronRight } from "lucide-react";

type Period = "today" | "week" | "month";

export default function DriverEarningsPage() {
  const [data, setData] = useState<DriverEarningsFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    driverApi.earnings().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-5 space-y-4 pt-10">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const current = data[period];
  const PERIODS: { key: Period; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "week",  label: "الأسبوع" },
    { key: "month", label: "الشهر" },
  ];

  return (
    <div className="px-4 pt-10 pb-6 space-y-4">

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-white font-black text-2xl">الأرباح</h1>
        <p className="text-white/40 text-sm mt-0.5">إجمالي {data.total_earnings.toLocaleString()} ر.ي</p>
      </div>

      {/* Badges row */}
      <div className="flex gap-2 flex-wrap">
        {data.is_peak && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)" }}>
            <Zap size={12} className="text-yellow-400" />
            <span className="text-yellow-400 text-xs font-black">وقت الذروة — ×1.2</span>
          </div>
        )}
        {data.rating_bonus && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Star size={12} className="text-green-400 fill-green-400" />
            <span className="text-green-400 text-xs font-black">{data.rating_bonus.label} +{data.rating_bonus.pct}%</span>
          </div>
        )}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.25)" }}>
          <TrendingUp size={18} className="text-vox-purple mb-2" />
          <p className="text-white font-black text-2xl">{data.total_deliveries}</p>
          <p className="text-white/40 text-xs mt-0.5">إجمالي التوصيلات</p>
        </div>
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Star size={18} className="text-yellow-400 fill-yellow-400 mb-2" />
          <p className="text-white font-black text-2xl">{data.rating.toFixed(1)}</p>
          <p className="text-white/40 text-xs mt-0.5">التقييم</p>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 p-1 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={period === p.key
              ? { background: "rgba(109,40,255,0.3)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.5)" }
              : { color: "rgba(255,255,255,0.3)" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Period stats */}
      <div className="rounded-2xl p-6 text-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-white/40 text-sm mb-2">الأرباح</p>
        <p className="text-white font-black text-4xl mb-1">{current.earnings.toLocaleString()}</p>
        <p className="text-white/30 text-sm">ريال يمني</p>
        <div className="flex items-center justify-center gap-3 mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-center">
            <p className="text-white font-black text-lg">{current.orders}</p>
            <p className="text-white/40 text-[10px]">توصيلة</p>
          </div>
          {current.orders > 0 && (
            <>
              <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.1)" }} />
              <div className="text-center">
                <p className="text-white font-black text-lg">{Math.round(current.earnings / current.orders).toLocaleString()}</p>
                <p className="text-white/40 text-[10px]">متوسط</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Incentives */}
      {period === "today" && data.incentives.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-yellow-400" />
            <p className="text-white/70 text-sm font-bold">تحديات اليوم</p>
          </div>
          <div className="space-y-2">
            {data.incentives.map(inc => (
              <div key={inc.label} className="rounded-2xl p-4"
                style={{
                  background: inc.achieved ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${inc.achieved ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">{inc.label}</p>
                  <div className="flex items-center gap-1">
                    {inc.achieved && <span className="text-green-400 text-xs">✓ محقق</span>}
                    <span className="text-vox-purple font-black text-sm">+{inc.bonus.toLocaleString()} ر.ي</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (inc.progress / inc.target) * 100)}%`,
                      background: inc.achieved ? "#22C55E" : "linear-gradient(90deg,#6D28FF,#A855F7)",
                    }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white/30 text-[10px]">{inc.progress} / {inc.target} توصيلة</p>
                  {!inc.achieved && (
                    <p className="text-white/40 text-[10px]">{inc.remaining} متبقٍ</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet shortcut */}
      <a href="/driver/wallet"
        className="flex items-center justify-between px-4 py-3 rounded-2xl"
        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div>
          <p className="text-green-400 text-xs font-black mb-0.5">المحفظة</p>
          <p className="text-white font-bold">{data.total_earnings.toLocaleString()} ر.ي</p>
        </div>
        <ChevronRight size={16} className="text-green-400/60" />
      </a>
    </div>
  );
}
