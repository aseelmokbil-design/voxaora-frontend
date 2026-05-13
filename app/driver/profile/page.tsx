"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { driverApi, DriverProfile } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Car, Phone, Star, MapPin, LogOut } from "lucide-react";

export default function DriverProfilePage() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    driverApi.me()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); router.replace("/auth/login"); };

  if (loading) {
    return (
      <div className="p-5 pt-10 space-y-4">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-8 text-center">
        <p className="text-white/40 text-sm">لم يتم العثور على ملف السائق</p>
        <button onClick={handleLogout}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-red-400 border border-red-400/30">
          تسجيل الخروج
        </button>
      </div>
    );
  }

  const VEHICLE_LABELS: Record<string, string> = {
    motorcycle: "دراجة نارية", car: "سيارة", bicycle: "دراجة هوائية", other: "أخرى",
  };

  return (
    <div className="px-4 pt-10 pb-8">

      {/* Profile card */}
      <div className="rounded-3xl p-6 mb-5 text-center"
        style={{ background: "linear-gradient(135deg,rgba(109,40,255,0.2),rgba(168,85,247,0.1))", border: "1px solid rgba(109,40,255,0.3)" }}>
        <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center font-black text-white text-3xl"
          style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)" }}>
          {profile.full_name[0]}
        </div>
        <h2 className="text-white font-black text-xl mb-1">{profile.full_name}</h2>
        <p className="text-white/50 text-sm">{profile.phone}</p>
        <div className="flex items-center justify-center gap-4 mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-center">
            <p className="text-white font-black text-lg">{profile.total_deliveries}</p>
            <p className="text-white/40 text-[10px]">توصيلة</p>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <p className="text-white font-black text-lg">{profile.rating.toFixed(1)}</p>
            </div>
            <p className="text-white/40 text-[10px]">التقييم</p>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <p className="text-white font-black text-lg">{profile.total_earnings.toLocaleString()}</p>
            <p className="text-white/40 text-[10px]">ر.ي أرباح</p>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-2 mb-6">
        <InfoRow icon={<Car size={16} />} label="المركبة"
          value={`${VEHICLE_LABELS[profile.vehicle_type] ?? profile.vehicle_type}${profile.vehicle_plate ? ` • ${profile.vehicle_plate}` : ""}`} />
        {profile.vehicle_model && (
          <InfoRow icon={<Car size={16} />} label="الموديل" value={profile.vehicle_model} />
        )}
        {profile.city && (
          <InfoRow icon={<MapPin size={16} />} label="المدينة" value={profile.city} />
        )}
        <InfoRow icon={<Phone size={16} />} label="الهاتف" value={profile.phone} />

        {/* Verification badge */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-white/50 text-sm">التحقق</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${profile.is_verified ? "text-green-400" : "text-yellow-400"}`}
            style={{ background: profile.is_verified ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)" }}>
            {profile.is_verified ? "✓ موثق" : "⏳ قيد المراجعة"}
          </span>
        </div>
      </div>

      {/* Documents link */}
      <a href="/driver/documents"
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-white/70 text-sm font-semibold">المستندات والوثائق</span>
        <span className="text-white/30 text-xs">رفع / تحديث ←</span>
      </a>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-400 font-bold transition-all"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <LogOut size={16} />
        تسجيل الخروج
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="text-white/50 text-sm flex items-center gap-2">
        <span className="text-white/30">{icon}</span>
        {label}
      </span>
      <span className="text-white/80 text-sm font-semibold">{value}</span>
    </div>
  );
}
