"use client";
import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VOXAORA Error]", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-glow-purple opacity-50 pointer-events-none" />

      <div className="text-center fade-in">
        <div className="text-6xl mb-6">⚡</div>
        <h2 className="text-white font-black text-xl mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-vox-muted text-sm mb-8 leading-relaxed">
          نعتذر عن هذا الانقطاع.<br />
          فريقنا يعمل على الحل.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-vox-purple rounded-2xl px-6 py-3 text-white font-bold text-sm transition-all active:scale-95"
          >
            <RotateCcw size={15} />
            حاول مجدداً
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 border border-vox-border text-vox-muted rounded-2xl px-6 py-3 text-sm hover:border-vox-purple/40 transition-colors"
          >
            <Home size={15} />
            الرئيسية
          </Link>
        </div>

        {error.digest && (
          <p className="text-vox-border text-xs mt-8" dir="ltr">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
