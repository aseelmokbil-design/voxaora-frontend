"use client";
import { useEffect, useState } from "react";
import { adminApi, AdminDeal } from "@/lib/api";
import { Tag, Plus, Trash2, Edit3, X, Save, Clock } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import ImageUploader from "@/components/admin/ImageUploader";

type DealForm = Partial<AdminDeal> & { id?: string };

const EMPTY: DealForm = {
  title: "", title_ar: "", description: "", image_url: "",
  original_price: undefined, discounted_price: undefined, discount_pct: undefined,
  valid_from: "", valid_until: "", is_active: true, placement: "home", sort_order: 0,
};

export default function DealsPage() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DealForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.deals().then(setDeals).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setShowForm(true); };
  const openEdit = (d: AdminDeal) => { setForm({ ...d }); setShowForm(true); };

  const save = async () => {
    if (!form.title_ar && !form.title) { toast("العنوان مطلوب", "error"); return; }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await adminApi.updateDeal(form.id, form);
        setDeals(prev => prev.map(d => d.id === form.id ? updated : d));
      } else {
        const created = await adminApi.createDeal(form);
        setDeals(prev => [created, ...prev]);
      }
      toast(form.id ? "تم التحديث ✓" : "تم إضافة العرض ✓", "success");
      setShowForm(false);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("حذف العرض؟")) return;
    try {
      await adminApi.deleteDeal(id);
      setDeals(prev => prev.filter(d => d.id !== id));
      toast("تم الحذف", "info");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  const F = (field: keyof DealForm, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
          <Plus size={15} /> عرض جديد
        </button>
        <div className="text-right">
          <h1 className="text-white font-black text-2xl sm:text-3xl mb-1">العروض</h1>
          <p className="text-white/35 text-sm">{deals.length} عرض مضاف</p>
        </div>
      </div>

      {/* Form drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 space-y-4"
               style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              <h2 className="text-white font-black text-lg">{form.id ? "تعديل العرض" : "عرض جديد"}</h2>
            </div>

            <ImageUploader value={form.image_url || ""} onChange={v => F("image_url", v)} label="صورة العرض" />

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">العنوان (عربي) *</label>
                <input value={form.title_ar || ""} onChange={e => F("title_ar", e.target.value)} dir="rtl"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
              </div>
              <div>
                <label className="text-white/50 text-xs text-right block mb-1">الوصف</label>
                <textarea value={form.description || ""} onChange={e => F("description", e.target.value)} dir="rtl" rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">السعر الأصلي</label>
                  <input type="number" value={form.original_price ?? ""} onChange={e => F("original_price", e.target.value ? +e.target.value : undefined)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
                </div>
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">سعر الخصم</label>
                  <input type="number" value={form.discounted_price ?? ""} onChange={e => F("discounted_price", e.target.value ? +e.target.value : undefined)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
                </div>
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">نسبة الخصم %</label>
                  <input type="number" value={form.discount_pct ?? ""} onChange={e => F("discount_pct", e.target.value ? +e.target.value : undefined)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">المكان</label>
                  <select value={form.placement || "home"} onChange={e => F("placement", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50">
                    <option value="home">الرئيسية</option>
                    <option value="merchant">صفحة المتجر</option>
                    <option value="featured">المميزة</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs text-right block mb-1">الترتيب</label>
                  <input type="number" value={form.sort_order ?? 0} onChange={e => F("sort_order", +e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
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

      {/* Deals list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map(d => (
            <div key={d.id} className="glass-card p-4 rounded-2xl flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                {d.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Tag size={22} className="text-white/20" />
                )}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="text-white font-bold text-sm line-clamp-1">{d.title_ar || d.title}</p>
                {d.discount_pct && (
                  <span className="inline-block text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
                    خصم {d.discount_pct}%
                  </span>
                )}
                <div className="flex items-center gap-2 justify-end mt-1">
                  {d.valid_until && (
                    <span className="text-white/30 text-[10px] flex items-center gap-1">
                      <Clock size={9} /> ينتهي {formatDate(d.valid_until)}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold ${d.is_active ? "text-green-400" : "text-gray-400"}`}>
                    {d.is_active ? "نشط" : "غير نشط"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(d)}
                  className="w-8 h-8 rounded-xl bg-vox-purple/20 flex items-center justify-center hover:bg-vox-purple/40 transition-colors">
                  <Edit3 size={14} className="text-vox-purple" />
                </button>
                <button onClick={() => deleteDeal(d.id)}
                  className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {deals.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <Tag size={40} className="mx-auto mb-3" />
              <p className="mb-4">لا توجد عروض</p>
              <button onClick={openNew}
                className="bg-vox-purple text-white text-sm font-bold px-5 py-2.5 rounded-xl">
                + إضافة أول عرض
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
