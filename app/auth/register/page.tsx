"use client";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function RegisterPage() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "", full_name: "", preferred_language: "ar" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await authApi.register(form.phone, form.password, form.full_name, form.preferred_language);
      setAuth(data.access_token, data.user, data.refresh_token);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-glow-purple pointer-events-none" />

      <div className="pt-12 pb-8 relative z-10">
        <Link href="/auth/login" className="flex items-center gap-2 text-vox-muted mb-8 w-fit">
          <ChevronRight size={20} /><span className="text-sm">رجوع</span>
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vox-purple to-vox-blue flex items-center justify-center mx-auto mb-4 glow-purple">
            <span className="text-3xl font-black text-white">V</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">إنشاء حساب</h1>
          <p className="text-vox-muted text-sm">انضم إلى فوكسورا</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">الاسم الكامل</label>
            <input value={form.full_name} onChange={e => set("full_name", e.target.value)} required
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3.5 text-white placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors text-right"
              placeholder="محمد العتيبي" dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">رقم الهاتف</label>
            <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} required dir="ltr"
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3.5 text-white placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors text-left"
              placeholder="+966500000000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">كلمة المرور</label>
            <input type="password" value={form.password} onChange={e => set("password", e.target.value)} required
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3.5 text-white placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 text-right">اللغة المفضلة</label>
            <div className="flex gap-3">
              {[{ v: "ar", label: "العربية" }, { v: "en", label: "English" }].map(opt => (
                <button key={opt.v} type="button" onClick={() => set("preferred_language", opt.v)}
                  className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                    form.preferred_language === opt.v
                      ? "bg-vox-purple border-vox-purple text-white"
                      : "border-vox-border text-vox-muted hover:border-vox-purple/50"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-right">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-4 font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 glow-purple text-base">
            {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="text-center text-vox-muted text-sm mt-6">
          لديك حساب بالفعل؟{" "}
          <Link href="/auth/login" className="text-vox-purple hover:underline font-semibold">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
