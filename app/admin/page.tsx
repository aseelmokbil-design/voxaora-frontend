"use client";
import { useEffect, useState } from "react";
import { adminApi, DashboardStats } from "@/lib/api";
import {
  Users, Store, ShoppingBag, TrendingUp, Clock,
  Tag, Image, AlertCircle, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

/* ── Stat card ───────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, colorClass, href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
  href?: string;
}) {
  const inner = (
    <div
      className="group flex flex-col gap-3 p-4 sm:p-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "rgba(18,18,30,0.9)",
        border: "1px solid rgba(139,92,246,0.12)",
      }}
    >
      {/* Top row: icon + arrow */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon size={18} className="text-white" />
        </div>
        {href && (
          <ArrowLeft size={14} className="text-white/20 group-hover:text-white/50 transition-colors mt-1" />
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-white font-black text-2xl sm:text-3xl leading-none mb-1">{value}</p>
        {sub && <p className="text-green-400 text-xs font-semibold">{sub}</p>}
      </div>

      {/* Label */}
      <p className="text-white/40 text-xs sm:text-sm leading-tight">{label}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block">{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

/* ── Quick action card ───────────────────────────────────────────────── */
function QuickAction({ href, emoji, label, desc }: {
  href: string; emoji: string; label: string; desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "rgba(18,18,30,0.9)",
        border: "1px solid rgba(139,92,246,0.12)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: "rgba(109,40,255,0.12)" }}
      >
        {emoji}
      </div>
      <div className="text-right flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{label}</p>
        <p className="text-white/35 text-xs truncate">{desc}</p>
      </div>
      <ArrowLeft size={14} className="text-white/20 flex-shrink-0" />
    </Link>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton rounded-2xl h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton rounded-2xl h-16" />
        ))}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.dashboard()
      .then(setStats)
      .catch(e => setError(e.message ?? "تعذّر تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "المدير";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <p className="text-white/40 text-sm mb-1">{greeting}، {firstName} 👋</p>
        <h1 className="text-white font-black text-2xl sm:text-3xl">لوحة التحكم</h1>
        <p className="text-white/30 text-xs sm:text-sm mt-1">نظرة شاملة على أداء المنصة</p>
      </div>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-6 text-red-400"
             style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? <Skeleton /> : stats && (
        <>
          {/* ── Divider label ──────────────────────────────── */}
          <p className="text-white/25 text-xs font-bold tracking-widest uppercase mb-3">الإحصائيات</p>

          {/* ── Stats grid ────────────────────────────────── */}
          {/* Mobile: 2 cols  |  lg: 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard
              icon={Users}
              label="إجمالي المستخدمين"
              value={stats.total_users.toLocaleString()}
              colorClass="bg-violet-500/20"
            />
            <StatCard
              icon={Store}
              label="المتاجر النشطة"
              value={stats.total_merchants.toLocaleString()}
              colorClass="bg-cyan-500/20"
              href="/admin/merchants"
            />
            <StatCard
              icon={ShoppingBag}
              label="إجمالي الطلبات"
              value={stats.total_orders.toLocaleString()}
              colorClass="bg-emerald-500/20"
            />
            <StatCard
              icon={TrendingUp}
              label="الإيراد الكلي"
              value={`${stats.total_revenue.toLocaleString()} ر.س`}
              colorClass="bg-yellow-500/20"
            />
            <StatCard
              icon={Clock}
              label="طلبات معلّقة"
              value={stats.pending_orders}
              sub={stats.pending_orders > 0 ? "تحتاج مراجعة" : undefined}
              colorClass="bg-orange-500/20"
            />
            <StatCard
              icon={AlertCircle}
              label="متاجر بانتظار الموافقة"
              value={stats.pending_merchants}
              sub={stats.pending_merchants > 0 ? "انتظار موافقتك" : undefined}
              colorClass="bg-red-500/20"
              href="/admin/merchants"
            />
            <StatCard
              icon={Tag}
              label="العروض النشطة"
              value={stats.active_deals}
              colorClass="bg-pink-500/20"
              href="/admin/deals"
            />
            <StatCard
              icon={Image}
              label="البنرات النشطة"
              value={stats.active_banners}
              colorClass="bg-blue-500/20"
              href="/admin/banners"
            />
          </div>

          {/* ── Quick actions ─────────────────────────────── */}
          <p className="text-white/25 text-xs font-bold tracking-widest uppercase mb-3">إجراءات سريعة</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction
              href="/admin/merchants"
              emoji="🏪"
              label="إدارة المتاجر"
              desc="عرض وتعديل وموافقة المتاجر"
            />
            <QuickAction
              href="/admin/deals"
              emoji="🏷️"
              label="إضافة عرض جديد"
              desc="إنشاء عروض وخصومات"
            />
            <QuickAction
              href="/admin/banners"
              emoji="🖼️"
              label="إدارة البنرات"
              desc="بنرات الصفحة الرئيسية"
            />
            <QuickAction
              href="/admin/merchants?status=pending_approval"
              emoji="✅"
              label={`موافقة المتاجر (${stats.pending_merchants})`}
              desc="متاجر جديدة تنتظر الموافقة"
            />
          </div>
        </>
      )}
    </div>
  );
}
