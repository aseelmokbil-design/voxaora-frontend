"use client";
import { useState, useEffect } from "react";
import { intelligenceApi, LoyaltyData, StreakData } from "@/lib/api";
import { Copy, Flame, Star } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface Props { userId: string; }

export default function LoyaltyCard({ userId }: Props) {
  const [loyalty, setLoyalty]   = useState<LoyaltyData | null>(null);
  const [streaks, setStreaks]   = useState<StreakData | null>(null);
  const [loading, setLoading]   = useState(true);
  const { toast }               = useToast();

  const referralCode = `VOX-${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  useEffect(() => {
    Promise.all([
      intelligenceApi.loyalty().catch(() => null),
      intelligenceApi.streaks().catch(() => null),
    ]).then(([l, s]) => {
      setLoyalty(l);
      setStreaks(s);
      setLoading(false);
    });
  }, []);

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode).catch(() => {});
    toast("تم نسخ كود الإحالة 🎉", "success");
  };

  if (loading) {
    return <div className="h-36 rounded-3xl skeleton mb-4" />;
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Loyalty points */}
      {loyalty && (
        <div className="rounded-3xl border border-vox-purple/25 p-5 overflow-hidden relative"
             style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(6,182,212,0.05))" }}>
          {/* Background decoration */}
          <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-vox-purple/10 blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between mb-4">
            <div className="text-left">
              <span className="text-2xl">{loyalty.tier_emoji}</span>
              <p className="text-vox-muted text-xs mt-0.5">{loyalty.tier}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-white font-black text-2xl">{loyalty.points.toLocaleString("ar-SA")}</span>
              </div>
              <p className="text-vox-muted text-xs">نقطة مكتسبة</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-vox-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-vox-purple to-vox-cyan rounded-full transition-all duration-700"
              style={{ width: `${loyalty.progress_pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-vox-muted text-[10px]">{loyalty.points_to_next} نقطة للمستوى التالي</p>
            <p className="text-vox-muted text-[10px]">{loyalty.progress_pct}%</p>
          </div>
        </div>
      )}

      {/* Streak + Referral side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        {streaks && (
          <div className="glass-card p-4 rounded-2xl text-right">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <p className="text-white font-black text-2xl">{streaks.current_streak}</p>
              <Flame size={18} className={streaks.current_streak > 0 ? "text-orange-400" : "text-vox-border"} />
            </div>
            <p className="text-vox-muted text-xs">يوم متتالي 🔥</p>
            {streaks.longest_streak > 0 && (
              <p className="text-vox-border text-[10px] mt-1">الأفضل: {streaks.longest_streak} يوم</p>
            )}
          </div>
        )}

        {/* Referral */}
        <div className="glass-card p-4 rounded-2xl text-right">
          <p className="text-vox-muted text-xs mb-1.5">كود الإحالة</p>
          <p className="text-vox-purple font-black text-sm tracking-widest mb-2" dir="ltr">{referralCode}</p>
          <button
            onClick={copyReferral}
            className="flex items-center gap-1 text-xs text-vox-cyan border border-vox-cyan/30 px-2.5 py-1 rounded-lg hover:bg-vox-cyan/10 transition-colors"
          >
            <Copy size={11} /> نسخ
          </button>
        </div>
      </div>
    </div>
  );
}
