"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { adminApi, AdminProduct, AdminCategory } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";

export default function EditProductPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id: merchantId, pid } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.products(merchantId), adminApi.categories(merchantId)])
      .then(([products, cats]) => {
        const p = products.find(p => p.id === pid);
        if (!p) { router.push(`/admin/merchants/${merchantId}/products`); return; }
        setProduct(p);
        setCategories(cats);
      })
      .catch(() => router.push(`/admin/merchants/${merchantId}/products`))
      .finally(() => setLoading(false));
  }, [merchantId, pid, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!product) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/admin/merchants/${merchantId}/products`} className="text-white/40 hover:text-white">
          <ChevronRight size={22} />
        </Link>
        <div className="text-right">
          <h1 className="text-white font-black text-xl">تعديل المنتج</h1>
          <p className="text-white/40 text-xs">{product.name_ar || product.name}</p>
        </div>
        <div className="w-6" />
      </div>
      <ProductForm
        merchantId={merchantId}
        initial={product}
        categories={categories}
        onSaved={() => router.push(`/admin/merchants/${merchantId}/products`)}
      />
    </div>
  );
}
