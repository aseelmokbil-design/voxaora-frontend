"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { adminApi, AdminProduct, AdminCategory } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, Trash2, Edit3, Eye, EyeOff, Package } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const STATUS_LABEL: Record<string, string> = {
  available: "متاح", out_of_stock: "نفد", hidden: "مخفي",
};
const STATUS_COLOR: Record<string, string> = {
  available: "text-green-400", out_of_stock: "text-red-400", hidden: "text-gray-400",
};

export default function ProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.products(merchantId), adminApi.categories(merchantId)])
      .then(([p, c]) => { setProducts(p); setCategories(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [merchantId]);

  const deleteProduct = async (productId: string) => {
    if (!confirm("حذف المنتج؟")) return;
    try {
      await adminApi.deleteProduct(merchantId, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast("تم الحذف", "info");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل الحذف", "error");
    }
  };

  const toggleStatus = async (product: AdminProduct) => {
    const next = product.status === "available" ? "hidden" : "available";
    try {
      await adminApi.updateProduct(merchantId, product.id, { status: next });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: next } : p));
    } catch {}
  };

  const catName = (catId?: string) => {
    if (!catId) return "";
    return categories.find(c => c.id === catId)?.name_ar || "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href={`/admin/merchants/${merchantId}`} className="text-white/40 hover:text-white">
          <ChevronRight size={22} />
        </Link>
        <div className="text-right">
          <h1 className="text-white font-black text-xl">المنتجات</h1>
          <p className="text-white/40 text-xs">{products.length} منتج</p>
        </div>
        <Link href={`/admin/merchants/${merchantId}/products/new`}
          className="bg-vox-purple rounded-xl px-4 py-2 text-white text-sm font-bold flex items-center gap-1 hover:opacity-90 transition-opacity">
          <Plus size={15} /> إضافة
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className="glass-card p-3.5 rounded-2xl flex items-center gap-3">
              {/* Image */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Package size={22} className="text-white/20" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-right min-w-0">
                <p className="text-white font-semibold text-sm line-clamp-1">{p.name_ar || p.name}</p>
                <p className="text-vox-purple text-sm font-bold">{p.price.toFixed(2)} ر.س
                  {p.discounted_price && (
                    <span className="text-white/30 line-through text-xs mr-1">{p.discounted_price}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <span className={`text-[10px] font-semibold ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  {catName(p.category_id) && <span className="text-white/30 text-[10px]">{catName(p.category_id)}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleStatus(p)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  {p.status === "available" ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-white/30" />}
                </button>
                <Link href={`/admin/merchants/${merchantId}/products/${p.id}`}
                  className="w-8 h-8 rounded-lg bg-vox-purple/20 flex items-center justify-center hover:bg-vox-purple/40 transition-colors">
                  <Edit3 size={14} className="text-vox-purple" />
                </Link>
                <button onClick={() => deleteProduct(p.id)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <Package size={40} className="mx-auto mb-3" />
              <p className="mb-4">لا توجد منتجات</p>
              <Link href={`/admin/merchants/${merchantId}/products/new`}
                className="bg-vox-purple text-white text-sm font-bold px-5 py-2.5 rounded-xl inline-block">
                + إضافة أول منتج
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
