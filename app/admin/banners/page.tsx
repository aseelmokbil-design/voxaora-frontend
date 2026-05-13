"use client";
import { useEffect, useState } from "react";
import { adminApi, AdminBanner } from "@/lib/api";
import { ImageIcon, Plus, Trash2, Edit3, X, Save } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import ImageUploader from "@/components/admin/ImageUploader";

type BannerForm = Partial<AdminBanner>;

const EMPTY: BannerForm = {
  title_ar: "", subtitle_ar: "", image_url: "", link_url: "",
  placement: "home", is_active: true, sort_order: 0, bg_color: "",
};

export default function BannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [placementFilter, setPlacementFilter] = useState("");

  const load = () => {
    setLoading(true);
    adminApi.banners(placementFilter || undefined).then(setBanners).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [placementFilter]);

  const openNew = () => { setForm(EMPTY); setShowForm(true); };
  const openEdit = (b: AdminBanner) => { setForm({ ...b }); setShowForm(true); };

  const save = async () => {
    if (!form.image_url) { toast("صورة البنر مطلوبة", "error"); return; }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await adminApi.updateBanner(form.id, form);
        setBanners(prev => prev.map(b => b.id === form.id ? updated : b));
      } else {
        const created = await adminApi.createBanner(form as AdminBanner & { image_url: string });
        setBanners(prev => [created, ...prev]);
      }
      toast(form.id ? "تم التحديث ✓" : "تم إضافة البنر ✓", "success");
      setShowForm(false);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("حذف البنر؟")) return;
    try {
      await adminApi.deleteBanner(id);
      setBanners(prev => prev.filter(b => b.id !== id));
      toast("تم الحذف", "info");
    } catch {}
  };

  const F = (field: keyof BannerForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const PLACEMENT_LABEL: Record<string, string> = { home: "الرئيسية", merchant: "صفحة متجر" };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
          <Plus size={15} /> بنر جديد
        </button>
        <div className="text-right">
          <h1 className="text-white font-black text-2xl sm:text-3xl mb-1">البنرات الإعلانية</h1>
          <p className="text-white/35 text-sm">{banners.length} بنر مضاف</p>
        </div>
      </div>

      {/* Placement filter */}
      <div className="flex gap-2 mb-4">
        {["", "home", "merchant"].map(p => (
          <button key={p} onClick={() => setPlacementFilter(p)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              placementFilter === p ? "bg-vox-purple border-vox-purple text-white" : "border-white/10 text-white/40"
            }`}>
            {p === "" ? "الكل" : PLACEMENT_LABEL[p] || p}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 space-y-4"
               style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              <h2 className="text-white font-black text-lg">{form.id ? "تعديل البنر" : "بنر جديد"}</h2>
            </div>

            <ImageUploader value={form.image_url || ""} onChange={v => F("image_url", v)} label="صورة البنر *" aspect="wide" />

            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">العنوان (عربي)</label>
                <input value={form.title_ar || ""} onChange={e => F("title_ar", e.target.value)} dir="rtl"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
              </div>
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">النص الفرعي</label>
                <input value={form.subtitle_ar || ""} onChange={e => F("subtitle_ar", e.target.value)} dir="rtl"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
              </div>
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">رابط الضغط</label>
                <input value={form.link_url || ""} onChange={e => F("link_url", e.target.value)} dir="ltr" placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
              </div>
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">لون الخلفية (اختياري)</label>
                <input value={form.bg_color || ""} onChange={e => F("bg_color", e.target.value)} dir="ltr" placeholder="#6c3bef"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">المكان</label>
                  <select value={form.placement || "home"} onChange={e => F("placement", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50">
                    <option value="home">الرئيسية</option>
                    <option value="merchant">صفحة متجر</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">الترتيب</label>
                  <input type="number" value={form.sort_order ?? 0} onChange={e => F("sort_order", +e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">تاريخ البدء</label>
                  <input type="datetime-local" value={form.valid_from ? form.valid_from.slice(0, 16) : ""}
                    onChange={e => F("valid_from", e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-vox-purple/50" />
                </div>
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">تاريخ الانتهاء</label>
                  <input type="datetime-local" value={form.valid_until ? form.valid_until.slice(0, 16) : ""}
                    onChange={e => F("valid_until", e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-vox-purple/50" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
                <button onClick={() => F("is_active", !form.is_active)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.is_active ? "bg-green-500" : "bg-white/20"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.is_active ? "right-0.5" : "left-0.5"}`} />
                </button>
                <span className="text-white text-sm font-semibold">{form.is_active ? "نشط" : "غير نشط"}</span>
              </div>
            </div>

            <button onClick={save} disabled={saving}
              className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-3.5 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> حفظ</>}
            </button>
          </div>
        </div>
      )}

      {/* Banners list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map(b => (
            <div key={b.id} className="glass-card rounded-2xl overflow-hidden">
              {/* Preview */}
              <div className="relative h-28 w-full" style={b.bg_color ? { background: b.bg_color } : {}}>
                {b.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <ImageIcon size={28} className="text-white/20" />
                  </div>
                )}
                {b.title_ar && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                    <div>
                      <p className="text-white font-bold text-sm">{b.title_ar}</p>
                      {b.subtitle_ar && <p className="text-white/70 text-xs">{b.subtitle_ar}</p>}
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    b.is_active ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-gray-400 bg-gray-400/10 border-gray-400/20"
                  }`}>{b.is_active ? "نشط" : "غير نشط"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-vox-purple bg-vox-purple/10 border-vox-purple/20">
                    {PLACEMENT_LABEL[b.placement] || b.placement}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex gap-1.5">
                  <button onClick={() => deleteBanner(b.id)}
                    className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                  <button onClick={() => openEdit(b)}
                    className="w-8 h-8 rounded-xl bg-vox-purple/20 flex items-center justify-center hover:bg-vox-purple/40 transition-colors">
                    <Edit3 size={14} className="text-vox-purple" />
                  </button>
                </div>
                <p className="text-white/40 text-xs">{b.placement === "home" ? "🏠 الرئيسية" : "🏪 متجر"} · ترتيب {b.sort_order}</p>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <ImageIcon size={40} className="mx-auto mb-3" />
              <p className="mb-4">لا توجد بنرات</p>
              <button onClick={openNew}
                className="bg-vox-purple text-white text-sm font-bold px-5 py-2.5 rounded-xl">
                + إضافة بنر
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
