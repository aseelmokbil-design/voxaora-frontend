"use client";
import { useState } from "react";
import { AdminProduct, AdminCategory, adminApi } from "@/lib/api";
import { Save, Plus, X } from "lucide-react";
import ImageUploader from "./ImageUploader";
import { useToast } from "@/context/ToastContext";

interface Props {
  merchantId: string;
  initial?: Partial<AdminProduct>;
  categories: AdminCategory[];
  onSaved: (p: AdminProduct) => void;
}

export default function ProductForm({ merchantId, initial, categories, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.name || "");
  const [nameAr, setNameAr] = useState(initial?.name_ar || "");
  const [desc, setDesc] = useState(initial?.description || "");
  const [descAr, setDescAr] = useState(initial?.description_ar || "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [discounted, setDiscounted] = useState(String(initial?.discounted_price ?? ""));
  const [imageUrl, setImageUrl] = useState(initial?.image_url || "");
  const [extraImages, setExtraImages] = useState<string[]>(initial?.extra_images || []);
  const [status, setStatus] = useState(initial?.status || "available");
  const [prepTime, setPrepTime] = useState(String(initial?.preparation_time ?? 15));
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [extraImgUrl, setExtraImgUrl] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !price) { toast("الاسم والسعر مطلوبان", "error"); return; }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        name_ar: nameAr.trim() || undefined,
        description: desc.trim() || undefined,
        description_ar: descAr.trim() || undefined,
        price: parseFloat(price),
        discounted_price: discounted ? parseFloat(discounted) : undefined,
        image_url: imageUrl || undefined,
        extra_images: extraImages.length ? extraImages : undefined,
        status,
        preparation_time: parseInt(prepTime) || 15,
        calories: calories ? parseInt(calories) : undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        category_id: categoryId || undefined,
        sort_order: parseInt(sortOrder) || 0,
      };

      let result: AdminProduct;
      if (initial?.id) {
        result = await adminApi.updateProduct(merchantId, initial.id, data);
      } else {
        result = await adminApi.createProduct(merchantId, data as Parameters<typeof adminApi.createProduct>[1]);
      }
      toast(initial?.id ? "تم التحديث ✓" : "تم الإضافة ✓", "success");
      onSaved(result);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const addExtraImage = () => {
    if (extraImgUrl.trim()) {
      setExtraImages(prev => [...prev, extraImgUrl.trim()]);
      setExtraImgUrl("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <section className="glass-card p-5 rounded-2xl">
        <h3 className="text-white font-bold text-sm text-right mb-3">الصورة الرئيسية</h3>
        <ImageUploader value={imageUrl} onChange={setImageUrl} label="" aspect="wide" />

        {/* Extra images */}
        <div className="mt-4">
          <p className="text-white/50 text-xs text-right mb-2">صور إضافية</p>
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {extraImages.map((img, i) => (
              <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => setExtraImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addExtraImage}
              className="bg-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold flex-shrink-0 hover:bg-white/15 transition-colors">
              <Plus size={13} />
            </button>
            <input value={extraImgUrl} onChange={e => setExtraImgUrl(e.target.value)}
              placeholder="رابط صورة إضافية أو ارفع..."
              dir="ltr"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
          </div>
        </div>
      </section>

      {/* Names */}
      <section className="glass-card p-5 rounded-2xl space-y-3">
        <h3 className="text-white font-bold text-sm text-right mb-1">التسمية</h3>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الاسم بالعربي *</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الاسم بالإنجليزي *</label>
          <input value={name} onChange={e => setName(e.target.value)} dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50" />
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الوصف (عربي)</label>
          <textarea value={descAr} onChange={e => setDescAr(e.target.value)} dir="rtl" rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 resize-none" />
        </div>
      </section>

      {/* Pricing */}
      <section className="glass-card p-5 rounded-2xl space-y-3">
        <h3 className="text-white font-bold text-sm text-right mb-1">السعر والحالة</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">السعر (ر.س) *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">سعر بعد الخصم</label>
            <input type="number" value={discounted} onChange={e => setDiscounted(e.target.value)} placeholder="—"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center placeholder-white/20" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50">
              <option value="available">متاح</option>
              <option value="out_of_stock">نفد المخزون</option>
              <option value="hidden">مخفي</option>
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">الفئة</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50">
              <option value="">بدون فئة</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">وقت التحضير (د)</label>
            <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">السعرات</label>
            <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="—"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center placeholder-white/20" />
          </div>
          <div>
            <label className="text-white/50 text-xs text-right block mb-1">الترتيب</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 text-center" />
          </div>
        </div>
        <div>
          <label className="text-white/50 text-xs text-right block mb-1">الوسوم (مفصولة بفاصلة)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} dir="rtl" placeholder="مثال: حار, شعبي, نباتي"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-vox-purple/50 placeholder-white/20" />
        </div>
      </section>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-4 text-white font-bold text-base disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <><Save size={18} /> {initial?.id ? "حفظ التغييرات" : "إضافة المنتج"}</>
        )}
      </button>
    </div>
  );
}
