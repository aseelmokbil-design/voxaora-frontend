"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { merchantApi, Merchant, MenuCategory } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/context/CartContext";
import { ChevronRight, Star, Clock, Truck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MerchantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // منع bfcache من تقديم نسخة قديمة بعد الرجوع
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);
  const { count, total } = useCart();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([merchantApi.get(id), merchantApi.menu(id)])
      .then(([m, mnu]) => {
        setMerchant(m);
        setMenu(mnu.categories);
        if (mnu.categories.length > 0) setActiveCategory(mnu.categories[0].id ?? null);
      })
      .catch(() => router.push("/explore"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) return null;

  const filteredMenu = activeCategory
    ? menu.filter(c => c.id === activeCategory)
    : menu;

  return (
    <div className="pb-32">
      {/* Cover */}
      <div className="relative h-44">
        {merchant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.cover_image_url} alt={merchant.name_ar || merchant.name}
               style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vox-purple/30 to-vox-blue/30 flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={() => router.back()}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <ChevronRight size={20} className="text-white" />
        </button>
        {merchant.logo_url && (
          <div className="absolute bottom-3 right-4 w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={merchant.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-4 border-b border-vox-border">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <Star size={14} className="fill-yellow-400" />
            <span className="font-bold">{merchant.rating?.toFixed(1)}</span>
            <span className="text-vox-muted text-xs">({merchant.total_reviews})</span>
          </div>
          <div>
            <h1 className="text-white font-black text-xl text-right">{merchant.name_ar || merchant.name}</h1>
            <p className="text-vox-muted text-xs text-right">{merchant.category}</p>
          </div>
        </div>

        <div className="flex gap-4 justify-end mt-3">
          <div className="flex items-center gap-1 text-vox-muted text-xs">
            <Clock size={12} /> <span>{merchant.avg_preparation_time} دقيقة</span>
          </div>
          <div className="flex items-center gap-1 text-vox-muted text-xs">
            <Truck size={12} />
            <span>{merchant.delivery_fee === 0 ? "توصيل مجاني" : `${merchant.delivery_fee} ر.س`}</span>
          </div>
          <div className="text-xs text-vox-muted">
            الحد الأدنى: {merchant.min_order_amount} ر.س
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {menu.length > 1 && (
        <div className="px-4 py-3 sticky top-0 z-30"
             style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                !activeCategory ? "bg-vox-purple border-vox-purple text-white" : "border-vox-border text-vox-muted"}`}>
              الكل
            </button>
            {menu.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeCategory === c.id ? "bg-vox-purple border-vox-purple text-white" : "border-vox-border text-vox-muted"}`}>
                {c.name_ar || c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-4 space-y-6">
        {filteredMenu.map(cat => (
          cat.products.length > 0 && (
            <div key={cat.id}>
              <h2 className="text-white font-bold text-base text-right mb-3">{cat.name_ar || cat.name}</h2>
              <div className="grid grid-cols-2 gap-3">
                {cat.products.map(p => (
                  <ProductCard key={p.id} product={p} merchantId={id} merchantName={merchant.name_ar || merchant.name} category={merchant.category} />
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Cart CTA */}
      {count > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-[390px] mx-auto z-50">
          <Link href="/cart"
            className="flex items-center justify-between bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl px-5 py-4 glow-purple">
            <span className="text-white font-bold">{total.toFixed(2)} ر.س</span>
            <span className="text-white font-bold">عرض السلة ({count})</span>
            <ShoppingBag size={20} className="text-white" />
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
