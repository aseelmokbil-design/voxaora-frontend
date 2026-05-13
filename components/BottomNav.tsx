"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, User, Mic } from "lucide-react";
import { useCart } from "@/context/CartContext";
import clsx from "clsx";

const LEFT_LINKS  = [
  { href: "/orders",   icon: ClipboardList, label: "طلباتي" },
  { href: "/profile",  icon: User,          label: "حسابي"  },
];
const RIGHT_LINKS = [
  { href: "/",         icon: Home,   label: "الرئيسية" },
  { href: "/explore",  icon: Search, label: "استكشف"   },
];

interface Props { onVoiceTap?: () => void; }

export default function BottomNav({ onVoiceTap }: Props) {
  const path  = usePathname();
  const { count } = useCart();

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) => {
    const active = path === href || (href !== "/" && path.startsWith(href));
    return (
      <Link href={href}
        className={clsx("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative",
          active ? "text-vox-purple" : "text-vox-muted")}>
        <Icon size={21} />
        <span className="text-[10px] font-medium">{label}</span>
        {active && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-vox-purple" />}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 right-0 left-0 z-50 max-w-[430px] mx-auto"
         style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(139,92,246,0.15)" }}>
      <div className="flex items-center justify-around pt-2 pb-3 px-2">

        {/* Right links */}
        {RIGHT_LINKS.map(l => <NavLink key={l.href} {...l} />)}

        {/* Center Voice button */}
        <div className="flex flex-col items-center -mt-6">
          <button
            onClick={onVoiceTap}
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #6D28FF, #A855F7)",
              boxShadow: "0 0 28px rgba(109,40,255,0.55), 0 -4px 16px rgba(109,40,255,0.2)",
            }}
          >
            <Mic size={26} className="text-white" />
            {/* pulse rings */}
            <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                  style={{ background: "rgba(109,40,255,0.5)" }} />
          </button>
          <span className="text-[10px] text-vox-muted mt-1.5 font-medium">صوتي</span>
        </div>

        {/* Left links */}
        {LEFT_LINKS.map(l => {
          const active = path === l.href || path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              className={clsx("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative",
                active ? "text-vox-purple" : "text-vox-muted")}>
              <div className="relative">
                <l.icon size={21} />
                {l.href === "/orders" && count > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-vox-purple text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{l.label}</span>
              {active && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-vox-purple" />}
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
