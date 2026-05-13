"use client";
import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, Tag, Image,
  LogOut, Menu, X, ChevronLeft, ShieldOff,
  ShoppingCart, Users, Package,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

const NAV = [
  { href: "/admin",           label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/merchants", label: "المتاجر",     icon: Store            },
  { href: "/admin/products",  label: "المنتجات",    icon: Package          },
  { href: "/admin/orders",    label: "الطلبات",     icon: ShoppingCart     },
  { href: "/admin/users",     label: "العملاء",     icon: Users            },
  { href: "/admin/deals",     label: "العروض",      icon: Tag              },
  { href: "/admin/banners",   label: "البنرات",     icon: Image            },
];

/* ── Sidebar content (shared between desktop + mobile drawer) ─── */
function SidebarContent({
  pathname, onClose, onLogout, user,
}: {
  pathname: string;
  onClose?: () => void;
  onLogout: () => void;
  user: { full_name: string; role: string };
}) {
  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(10,10,18,0.98)" }}>

      {/* Logo + close btn */}
      <div className="flex items-center justify-between px-5 py-5"
           style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-white font-black text-lg leading-tight">فوكسورا</p>
          <p className="text-white/25 text-[10px] tracking-[3px] uppercase mt-0.5">Admin Panel</p>
        </div>
        {onClose && (
          <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
               style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
            {user.full_name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
            <p className="text-white/30 text-xs">{user.role === "super_admin" ? "سوبر أدمن" : "مدير"}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "text-vox-purple"
                  : "text-white/45 hover:text-white hover:bg-white/5"
              }`}
              style={active ? {
                background: "rgba(109,40,255,0.12)",
                border: "1px solid rgba(109,40,255,0.25)",
              } : {}}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {active && <ChevronLeft size={14} className="text-vox-purple/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Back to app + Logout */}
      <div className="px-3 pb-6 pt-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/35 hover:text-white/60 hover:bg-white/5 transition-all">
          <ChevronLeft size={17} />
          <span>العودة للتطبيق</span>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut size={17} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main layout ─────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Close drawer on route change */
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  /* Auth guard */
  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, user, router]);

  /* Loading */
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "#07070d" }}>
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* Role guard */
  if (!user || !ADMIN_ROLES.has(user.role)) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: "#07070d" }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
             style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <ShieldOff size={36} className="text-red-400" />
        </div>
        <h1 className="text-white font-black text-2xl">صلاحية مرفوضة</h1>
        <p className="text-white/40 text-sm max-w-xs">هذه الصفحة مخصصة للمدراء فقط.</p>
        {user && (
          <p className="text-white/20 text-xs">
            الحساب: <span className="text-white/40">{user.full_name}</span> — صلاحية: <span className="text-white/40">{user.role}</span>
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button onClick={logout}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
            تسجيل الخروج
          </button>
          <Link href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:bg-white/5 transition-colors">
            الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => { logout(); };

  return (
    <div className="flex min-h-screen w-full" dir="rtl" style={{ background: "#07070d" }}>

      {/* ── Desktop sidebar (≥ lg) ──────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 sticky top-0 h-screen overflow-hidden"
             style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <SidebarContent pathname={pathname} onLogout={handleLogout} user={user} />
      </aside>

      {/* ── Mobile drawer overlay ───────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="absolute inset-y-0 right-0 w-72 max-w-[85vw] shadow-2xl"
            style={{ zIndex: 50 }}
          >
            <SidebarContent
              pathname={pathname}
              onClose={() => setDrawerOpen(false)}
              onLogout={handleLogout}
              user={user}
            />
          </div>
        </div>
      )}

      {/* ── Main area ───────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 py-3 sticky top-0 z-30 flex-shrink-0"
          style={{
            background: "rgba(10,10,18,0.97)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Right: hamburger (mobile) + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-white font-bold text-sm sm:text-base">فوكسورا</p>
              <p className="text-white/25 text-[10px] tracking-widest uppercase hidden sm:block">Admin Panel</p>
            </div>
          </div>

          {/* Left: user chip */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-white/60 text-xs font-semibold">{user.full_name}</p>
              <p className="text-white/25 text-[10px]">{user.role === "super_admin" ? "سوبر أدمن" : "مدير"}</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}
            >
              {user.full_name[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
