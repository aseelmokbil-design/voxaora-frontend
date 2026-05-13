"use client";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function LoginPage() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await authApi.login(phone, password);
      setAuth(data.access_token, data.user, data.refresh_token);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-safe relative overflow-hidden">
      <div className="absolute inset-0 bg-glow-purple pointer-events-none" />

      <div className="pt-12 pb-8 relative z-10">
        <Link href="/" className="flex items-center gap-2 text-vox-muted mb-8 w-fit">
          <ChevronRight size={20} />
          <span className="text-sm">رجوع</span>
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vox-purple to-vox-blue flex items-center justify-center mx-auto mb-4 glow-purple">
            <span className="text-3xl font-black text-white">V</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">مرحباً بك</h1>
          <p className="text-vox-muted text-sm">سجّل دخولك للمتابعة</p>
        </div>

        <form onSubmit={submit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">رقم الهاتف</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr"
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3.5 text-white placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors text-left"
              placeholder="+966500000000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">كلمة المرور</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3.5 text-white placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-right">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-4 font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 glow-purple text-base mt-2">
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p className="text-center text-vox-muted text-sm mt-6">
          ليس لديك حساب؟{" "}
          <Link href="/auth/register" className="text-vox-purple hover:underline font-semibold">
            إنشاء حساب
          </Link>
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-3 bg-vox-card/50 rounded-xl border border-vox-border/50">
            <p className="text-vox-muted text-xs text-center mb-1">بيانات تجريبية (dev only)</p>
            <button
              type="button"
              onClick={() => { setPhone("+966500000002"); setPassword("Test@12345"); }}
              className="text-vox-purple text-xs text-center w-full hover:underline"
              dir="ltr"
            >
              +966500000002 / Test@12345
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
