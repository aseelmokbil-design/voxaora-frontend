"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { adminApi, AdminMerchantDetail, AdminCategory } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ChevronRight, Save, Package, Plus, Trash2, Check } from "lucide-react";
import Link from "next/link";
import ImageUploader from "@/components/admin/ImageUploader";
import { useToast } from "@/context/ToastContext";

const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

type HoursRow = { day: string; open: string; close: string; is_closed: boolean };

function defaultHours(): HoursRow[] {
  return DAYS.map(d => ({ day: d, open: "09:00", close: "23:00", is_closed: false }));
}

export default function MerchantEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [merchant, setMerchant] = useState<AdminMerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatNameAr, setNewCatNameAr] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descAr, setDescAr] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [prepTime, setPrepTime] = useState(20);
  const [isOpen, setIsOpen] = useState(true);
  const [hours, setHours] = useState<HoursRow[]>(defaultHours());

  useEffect(() => {
    Promise.all([adminApi.getMerchant(id), adminApi.categories(id)])
      .then(([m, cats]) => {
        setMerchant(m);
        setCategories(cats);
        setName(m.name);
        setNameAr(m.name_ar || "");
        setDescAr(m.description_ar || "");
        setPhone(m.phone || "");
        setLogoUrl(m.logo_url || "");
        setCoverUrl(m.cover_image_url || "");
        setDeliveryFee(m.delivery_fee);
        setMinOrder(m.min_order_amount);
        setPrepTime(m.avg_preparation_time);
        setIsOpen(m.is_open_now);
        if (m.operating_hours && Array.isArray(m.operating_hours)) {
          setHours(m.operating_hours as HoursRow[]);
        }
      })
      .catch(() => router.push("/admin/merchants"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateMerchant(id, {
        name, name_ar: nameAr, description_ar: descAr, phone,
        logo_url: logoUrl, cover_image_url: coverUrl,
        delivery_fee: deliveryFee, min_order_amount: minOrder,
        avg_preparation_time: prepTime, is_open_now: isOpen,
        operating_hours: hours,
      });
      toast("تم حفظ التغييرات ✓", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const cat = await adminApi.createCategory(id, { name: newCatName, name_ar: newCatNameAr });
      setCategories(prev => [...prev, cat]);
      setNewCatName(""); setNewCatNameAr("");
      toast("تم إضافة الفئة", "success");
    } catch {}
  };

  const deleteCategory = async (catId: string) => {
    if (!confirm("حذف الفئة؟")) return;
    try {
      await adminApi.deleteCategory(id, catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      toast("تم حذف الفئة", "info");
    } catch {}
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!merchant) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/admin/merchants")} className="text-white/40 hover:text-white">
          <ChevronRight size={22} />
        </button>
        <div className="text-right">
          <h1 className="text-white font-black text-xl">{merchant.name_ar || merchant.name}</h1>
          <p className="text-white/40 text-xs">{merchant.city}</p>
        </div>
      </div>

      {/* Images section */}
      <section className="glass-card p-5 rounded-2xl mb-4">
        <h2 className="text-white font-bold text-sm text-right mb-4">الصور</h2>
        <div className="flex gap-4 justify-end">
          <div>
            <ImageUploader value={logoUrl} onChange={setLogoUrl} label="الشعار" aspect="square" />
          </div>
          <div className="flex-1">
            <ImageUploader value={coverUrl} onChange={setCoverUrl} label="صورة الغلاف" aspect="wide" />
          </div>
        </div>
      </section>

      {/* Basic info */}
      <section className="glass-card p-5 rounded-2xl mb-4 space-y-3">
        <h2 className="text-white font-bold text-sm text-right mb-4">المعلومات الأساسية</h2>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الاسم (عربي)</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الاسم (إنجليزي)</label>
          <input value={name} onChange={e => setName(e.target.value)} dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الوصف (عربي)</label>
          <textarea value={descAr} onChange={e => setDescAr(e.target.value)} dir="rtl" rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 resize-none" />
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">رقم الهاتف</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
        </div>
      </section>

      {/* Delivery & timing */}
      <section className="glass-card p-5 rounded-2xl mb-4">
        <h2 className="text-white font-bold text-sm text-right mb-4">التوصيل والتوقيت</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">رسوم التوصيل</label>
            <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(+e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">الحد الأدنى</label>
            <input type="number" value={minOrder} onChange={e => setMinOrder(+e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">وقت التحضير (د)</label>
            <input type="number" value={prepTime} onChange={e => setPrepTime(+e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 p-3 bg-white/3 rounded-xl">
          <button
            onClick={() => setIsOpen(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${isOpen ? "bg-green-500" : "bg-white/20"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${isOpen ? "right-0.5" : "left-0.5"}`} />
          </button>
          <span className="text-white text-sm font-semibold">{isOpen ? "المتجر مفتوح الآن" : "المتجر مغلق الآن"}</span>
        </div>
      </section>

      {/* Operating hours */}
      <section className="glass-card p-5 rounded-2xl mb-4">
        <h2 className="text-white font-bold text-sm text-right mb-4">أوقات العمل</h2>
        <div className="space-y-2">
          {hours.map((row, i) => (
            <div key={row.day} className="flex items-center gap-2">
              <button
                onClick={() => setHours(prev => prev.map((r, j) => j === i ? { ...r, is_closed: !r.is_closed } : r))}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  !row.is_closed ? "bg-vox-purple border-vox-purple" : "border-white/20"
                }`}
              >
                {!row.is_closed && <Check size={11} className="text-white" />}
              </button>
              <span className="text-white/60 text-xs w-14 text-right flex-shrink-0">{row.day}</span>
              <input type="time" value={row.open} disabled={row.is_closed}
                onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, open: e.target.value } : r))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none disabled:opacity-30" />
              <span className="text-white/30 text-xs">–</span>
              <input type="time" value={row.close} disabled={row.is_closed}
                onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, close: e.target.value } : r))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none disabled:opacity-30" />
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="glass-card p-5 rounded-2xl mb-4">
        <h2 className="text-white font-bold text-sm text-right mb-4">فئات المنتجات</h2>
        <div className="space-y-2 mb-3">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5">
              <button onClick={() => deleteCategory(c.id)}
                className="text-red-400/50 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
              <span className="text-white text-sm">{c.name_ar || c.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={addCategory}
            className="bg-vox-purple rounded-xl px-4 py-2 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:opacity-90 transition-opacity">
            <Plus size={13} /> إضافة
          </button>
          <input value={newCatNameAr} onChange={e => setNewCatNameAr(e.target.value)} placeholder="الاسم بالعربي" dir="rtl"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="English name" dir="ltr"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
        </div>
      </section>

      {/* Products link */}
      <Link href={`/admin/merchants/${id}/products`}
        className="glass-card p-4 rounded-2xl flex items-center justify-between mb-4 hover:border-vox-purple/40 transition-all">
        <ChevronRight size={16} className="text-white/40" />
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">إدارة المنتجات</span>
          <Package size={18} className="text-vox-purple" />
        </div>
      </Link>

      {/* Save */}
      <button onClick={save} disabled={saving}
        className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-4 text-white font-bold text-base disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <><Save size={18} /> حفظ التغييرات</>
        )}
      </button>
    </div>
  );
}
