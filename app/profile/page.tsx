"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import ImpactCard from "@/components/ImpactCard";
import { User, Phone, Globe, LogOut, ChevronLeft, ShoppingBag, Headphones } from "lucide-react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import LoyaltyCard from "@/components/LoyaltyCard";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: ShoppingBag, label: "طلباتي", href: "/orders" },
    { icon: Globe, label: "اللغة المفضلة", value: user.preferred_language === "ar" ? "العربية" : "English", href: null },
    { icon: Phone, label: "رقم الهاتف", value: user.phone, href: null },
  ];

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <NotificationBell />
          <h1 className="text-xl font-black text-white">حسابي</h1>
        </div>
      </div>

      <div className="px-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-vox-purple to-vox-blue flex items-center justify-center mb-4 glow-purple">
            <span className="text-white text-4xl font-black">{user.full_name?.[0] ?? "U"}</span>
          </div>
          <h2 className="text-white text-xl font-black">{user.full_name}</h2>
          <p className="text-vox-muted text-sm mt-1">{user.phone}</p>
          <span className="mt-2 text-xs bg-vox-purple/20 text-vox-purple px-3 py-1 rounded-full font-semibold">
            {user.role === "customer" ? "عميل ذكي" : user.role}
          </span>
        </div>

        {/* Impact card */}
        <ImpactCard />

        {/* Loyalty + Streak + Referral */}
        <LoyaltyCard userId={user.id} />

        {/* VOXAORA Plus teaser */}
        <div className="rounded-2xl p-4 border mb-4"
             style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.06))", borderColor: "rgba(139,92,246,0.3)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-vox-cyan font-bold border border-vox-cyan/40 px-2.5 py-0.5 rounded-full">قريباً</span>
            <div className="flex items-center gap-2.5 text-right">
              <div>
                <div className="text-white font-black text-sm">فوكسورا Plus ✦</div>
                <p className="text-vox-muted text-xs mt-0.5">عروض حصرية · أولوية التوصيل · مساعد VIP</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-vox-purple to-vox-cyan flex items-center justify-center flex-shrink-0">
                <Headphones size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="space-y-2">
          {menuItems.map(item => (
            item.href ? (
              <Link key={item.label} href={item.href}
                className="glass-card flex items-center justify-between p-4 rounded-2xl hover:border-vox-purple/40 transition-all">
                <ChevronLeft size={16} className="text-vox-muted" />
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">{item.label}</span>
                  <div className="w-9 h-9 rounded-xl bg-vox-purple/10 flex items-center justify-center">
                    <item.icon size={18} className="text-vox-purple" />
                  </div>
                </div>
              </Link>
            ) : (
              <div key={item.label} className="glass-card flex items-center justify-between p-4 rounded-2xl">
                <span className="text-vox-muted text-sm" dir="ltr">{item.value}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">{item.label}</span>
                  <div className="w-9 h-9 rounded-xl bg-vox-border flex items-center justify-center">
                    <item.icon size={18} className="text-vox-muted" />
                  </div>
                </div>
              </div>
            )
          ))}

          {/* App identity */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="text-center">
              <div className="leading-tight">
                <div className="text-2xl font-black text-white">فوكسورا</div>
                <div className="text-xs font-bold tracking-widest bg-gradient-to-r from-vox-purple to-vox-cyan bg-clip-text text-transparent">VOXAORA</div>
              </div>
              <p className="text-vox-muted text-xs mt-1">يعرفك، يختار الأفضل لك، يجعل حياتك أسهل.</p>
              <p className="text-vox-border text-xs mt-1">v1.0.0</p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 rounded-2xl py-4 font-semibold hover:bg-red-900/20 transition-colors">
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>

        {user.email && (
          <div className="mt-4 p-3 bg-vox-card/50 rounded-xl border border-vox-border/50">
            <p className="text-vox-muted text-xs text-center">{user.email}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
