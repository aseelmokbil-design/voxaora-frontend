"use client";
import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, DollarSign, ClipboardList, User, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const DRIVER_ROLES = new Set(["driver", "admin", "super_admin"]);

const NAV = [
  { href: "/driver",          label: "الرئيسية",  icon: Home          },
  { href: "/driver/earnings", label: "الأرباح",   icon: DollarSign    },
  { href: "/driver/wallet",   label: "المحفظة",   icon: Wallet        },
  { href: "/driver/history",  label: "السجل",     icon: ClipboardList },
  { href: "/driver/profile",  label: "الملف",     icon: User          },
];

export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "#07070d" }}>
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !DRIVER_ROLES.has(user.role)) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: "#07070d" }}>
        <p className="text-5xl">🚫</p>
        <h1 className="text-white font-black text-2xl">غير مصرح</h1>
        <p className="text-white/40 text-sm">هذه الصفحة للسائقين فقط</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:bg-white/5 transition-colors">
          الرئيسية
        </Link>
      </div>
    );
  }

  const isOrderPage = pathname.startsWith("/driver/order/");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#07070d" }} dir="rtl">
      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom nav — hidden on order execution page */}
      {!isOrderPage && (
        <nav
          className="fixed bottom-0 inset-x-0 flex items-center justify-around px-2 py-2 z-40"
          style={{
            background: "rgba(8,8,18,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all"
                style={active ? { color: "#A855F7" } : { color: "rgba(255,255,255,0.3)" }}>
                <Icon size={20} />
                <span className="text-[10px] font-bold">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
