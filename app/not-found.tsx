import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-glow-purple pointer-events-none" />
      <div className="absolute inset-0 bg-glow-cyan opacity-30 pointer-events-none"
           style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 60%)" }} />

      {/* Orb */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-36 h-36 rounded-full bg-vox-purple/8 orb-ring" />
        <div className="absolute w-36 h-36 rounded-full bg-vox-purple/8 orb-ring orb-ring-2" />
        <div className="w-28 h-28 rounded-full border border-vox-purple/20 flex items-center justify-center relative z-10"
             style={{ background: "rgba(18,18,26,0.9)" }}>
          <span className="text-5xl">🔍</span>
        </div>
      </div>

      {/* Text */}
      <div className="text-center mb-10 fade-in">
        <p className="text-8xl font-black bg-gradient-to-r from-vox-purple via-vox-blue to-vox-cyan bg-clip-text text-transparent mb-4 leading-none">
          404
        </p>
        <h1 className="text-white text-xl font-black mb-3">الصفحة غير موجودة</h1>
        <p className="text-vox-muted text-sm leading-relaxed">
          لم نجد ما تبحث عنه.<br />
          لكن لا تقلق — نحن هنا.
        </p>
      </div>

      {/* CTA */}
      <Link href="/"
        className="flex items-center gap-2.5 bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl px-8 py-4 text-white font-bold text-base glow-purple scale-in">
        <Home size={18} />
        العودة للرئيسية
      </Link>

      {/* Brand */}
      <div className="absolute bottom-8 text-center">
        <div className="leading-tight">
          <div className="text-xl font-black text-white">فوكسورا</div>
          <div className="text-[10px] font-bold tracking-widest bg-gradient-to-r from-vox-purple to-vox-cyan bg-clip-text text-transparent">VOXAORA</div>
        </div>
        <p className="text-vox-border text-xs mt-1">يعرفك، يختار الأفضل لك</p>
      </div>
    </div>
  );
}
