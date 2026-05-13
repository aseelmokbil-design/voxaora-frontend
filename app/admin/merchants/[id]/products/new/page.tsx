"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { adminApi, AdminCategory } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: merchantId } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  useEffect(() => {
    adminApi.categories(merchantId).then(setCategories).catch(() => {});
  }, [merchantId]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/admin/merchants/${merchantId}/products`} className="text-white/40 hover:text-white">
          <ChevronRight size={22} />
        </Link>
        <div className="text-right">
          <h1 className="text-white font-black text-xl">إضافة منتج جديد</h1>
        </div>
        <div className="w-6" />
      </div>
      <ProductForm
        merchantId={merchantId}
        categories={categories}
        onSaved={() => router.push(`/admin/merchants/${merchantId}/products`)}
      />
    </div>
  );
}
