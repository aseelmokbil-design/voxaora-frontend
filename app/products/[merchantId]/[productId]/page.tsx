"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Star, Clock, Flame, ShoppingCart,
  Plus, Minus, Zap, Shield, MapPin, ChevronLeft,
} from "lucide-react";
import { merchantApi, ProductDetail, Product, Merchant } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️", grocery: "🛒", pharmacy: "💊", coffee: "☕",
  bakery: "🥐", dessert: "🍰", healthy: "🥗", burger: "🍔",
};

const guessImage = (name: string, category = ""): string => {
  const n = (name + " " + category).toLowerCase();
  if (n.includes("برجر") || n.includes("burger"))                       return "/products/burger.png";
  if (n.includes("بيتزا") || n.includes("pizza"))                       return "/products/pizza.png";
  if (n.includes("مندي") || n.includes("mandi"))                        return "/products/mandi.png";
  if (n.includes("سوشي") || n.includes("sushi"))                        return "/products/sushi.png";
  if (n.includes("زنجر") || n.includes("zinger"))                       return "/products/zinger.png";
  if (n.includes("عائلي") || n.includes("family"))                      return "/products/broast-family.png";
  if (n.includes("بروست") || n.includes("بروستد") || n.includes("broast")) return "/products/broast-8pcs.png";
  if (n.includes("تركي") || n.includes("فحم"))                         return "/products/turkish-chicken.png";
  if (n.includes("كولسلو") || n.includes("سلطة"))                      return "/products/coleslaw.png";
  if (n.includes("شيبس") || n.includes("بطاطس"))                       return "/products/chips.png";
  if (n.includes("بيبسي") || n.includes("pepsi"))                       return "/products/pepsi.png";
  if (n.includes("عصير") || n.includes("برتقال"))                       return "/products/orange-juice.png";
  if (n.includes("أمريكانو") || n.includes("americano"))                return "/products/americano.png";
  if (n.includes("كابتشينو") || n.includes("cappuccino"))               return "/products/cappuccino.png";
  if (n.includes("كولد برو") || n.includes("cold brew"))                return "/products/cold-brew.png";
  if (n.includes("ماتشا") || n.includes("matcha"))                      return "/products/matcha-latte.png";
  if (n.includes("ماكياتو") || n.includes("macchiato"))                 return "/products/caramel-macchiato.png";
  if (n.includes("فلات وايت") || n.includes("flat white"))              return "/products/flat-white.png";
  if (n.includes("لاتيه") || n.includes("latte"))                       return "/products/latte-caramel.png";
  if (n.includes("كرواسون") || n.includes("croissant"))                 return "/products/croissant.png";
  if (n.includes("كيك") || n.includes("cake") || n.includes("شوكولا")) return "/products/chocolate-cake.png";
  if (n.includes("دجاج") || n.includes("chicken"))                      return "/products/broast-8pcs.png";
  if (n.includes("قهوة") || n.includes("coffee"))                       return "/products/americano.png";
  return "";
};

export default function ProductDetailPage() {
  const { merchantId, productId } = useParams<{ merchantId: string; productId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { items, addItem, updateQty } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const cartItem = items.find(i => i.product.id === productId);
  const qty = cartItem?.quantity ?? 0;

  useEffect(() => {
    Promise.all([
      merchantApi.product(merchantId, productId),
      merchantApi.get(merchantId),
    ])
      .then(([p, m]) => { setProduct(p); setMerchant(m); })
      .catch((e) => setError(e?.message ?? "تعذّر تحميل المنتج"))
      .finally(() => setLoading(false));
  }, [merchantId, productId]);

  const handleAdd = () => {
    if (!product || !merchant) return;
    addItem(product, merchantId, merchant.name_ar || merchant.name);
    toast(`أُضيف ${product.name_ar || product.name} للسلة ✓`, "success");
  };

  const handleQty = (delta: number) => {
    if (!product) return;
    const next = qty + delta;
    if (next <= 0) updateQty(product.id, 0);
    else if (qty === 0 && delta > 0) handleAdd();
    else updateQty(product.id, next);
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-red-400 text-center font-semibold">{error}</p>
        <button onClick={() => { window.location.href = `/merchant/${merchantId}`; }} className="text-vox-purple text-sm underline">رجوع</button>
      </div>
    );
  }

  if (!product) return null;

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.original_price!) * 100) : 0;
  const categoryEmoji = CATEGORY_EMOJI[merchant?.category ?? ""] ?? "🍽️";
  const imgSrc = (!imgError && product.image_url)
    ? product.image_url
    : guessImage(product.name_ar || product.name, merchant?.category ?? "");

  return (
    <div className="min-h-dvh pb-32 bg-[#0A0A0F]">

      {/* Hero */}
      <div className="relative w-full h-72 overflow-hidden"
           style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.15), rgba(6,182,212,0.08))" }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={product.name_ar || product.name}
               onError={() => setImgError(true)}
               style={{ width:"100%", height:"100%", objectFit:"contain", padding:"16px" }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl">
            {categoryEmoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0A0A0F]" />

        {/* Back button */}
        <button
          onClick={() => { window.location.href = `/merchant/${merchantId}`; }}
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(10,10,15,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ArrowRight size={18} className="text-white" />
        </button>

        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
            -{discountPct}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 -mt-4 relative z-10">

        {/* Info card */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(109,40,255,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Merchant link */}
          {merchant && (
            <Link
              href={`/merchant/${merchantId}`}
              className="flex items-center gap-1.5 mb-3 text-vox-muted text-xs hover:text-vox-cyan transition-colors w-fit mr-auto"
            >
              <ChevronLeft size={12} />
              <span>{merchant.name_ar || merchant.name}</span>
            </Link>
          )}

          {/* Name */}
          <h1 className="text-white font-black text-2xl leading-tight text-right mb-1">
            {product.name_ar || product.name}
          </h1>
          {product.name_ar && product.name && (
            <p className="text-vox-muted text-sm text-right mb-3">{product.name}</p>
          )}

          {/* Chips */}
          <div className="flex items-center gap-2 flex-wrap justify-end mb-4">
            {!!product.rating && product.rating > 0 && (
              <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
                <span className="text-yellow-400 text-xs font-bold">{product.rating.toFixed(1)}</span>
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
              </div>
            )}
            {!!product.preparation_time && (
              <div className="flex items-center gap-1 bg-vox-blue/10 border border-vox-blue/20 px-2.5 py-1 rounded-full">
                <span className="text-vox-cyan text-xs font-semibold">{product.preparation_time} دقيقة</span>
                <Clock size={10} className="text-vox-cyan" />
              </div>
            )}
            {!!product.calories && (
              <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                <span className="text-orange-400 text-xs font-semibold">{product.calories} سعرة</span>
                <Flame size={10} className="text-orange-400" />
              </div>
            )}
            {!!product.total_orders && product.total_orders > 0 && (
              <div className="flex items-center gap-1 bg-vox-purple/10 border border-vox-purple/20 px-2.5 py-1 rounded-full">
                <span className="text-vox-purple text-xs font-semibold">{product.total_orders}+ طلب</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 justify-end mb-5">
            {hasDiscount && (
              <span className="text-vox-muted text-base line-through">{product.original_price?.toFixed(2)} ر.س</span>
            )}
            <span className={`font-black text-3xl ${hasDiscount ? "text-red-400" : "text-white"}`}>
              {product.price.toFixed(2)}
              <span className="text-base font-semibold text-vox-muted mr-1">ر.س</span>
            </span>
          </div>

          {/* Add to cart + Qty */}
          <div className="flex items-center gap-3">
            <button
              onClick={qty === 0 ? handleAdd : undefined}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-black text-white text-base transition-all active:scale-95"
              style={{
                background: qty > 0
                  ? "linear-gradient(135deg, #059669, #10b981)"
                  : "linear-gradient(135deg, #6D28FF, #A855F7)",
                boxShadow: qty > 0
                  ? "0 0 24px rgba(16,185,129,0.35)"
                  : "0 0 24px rgba(109,40,255,0.35)",
              }}
            >
              <ShoppingCart size={18} />
              {qty > 0 ? `في السلة (${qty})` : "أضف للسلة"}
            </button>

            {/* Qty pill */}
            <div
              className="flex items-center gap-1 rounded-2xl px-1 py-1"
              style={{ background: "rgba(109,40,255,0.1)", border: "1px solid rgba(109,40,255,0.25)" }}
            >
              <button
                onClick={() => handleQty(-1)}
                disabled={qty === 0}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 hover:bg-vox-purple/20 transition-colors active:scale-90"
              >
                <Minus size={16} className="text-vox-purple" />
              </button>
              <span className="text-white font-black text-lg w-8 text-center">{qty}</span>
              <button
                onClick={() => handleQty(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-vox-purple/20 transition-colors active:scale-90"
              >
                <Plus size={16} className="text-vox-purple" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {(product.description_ar || product.description) && (
          <div className="glass-card rounded-2xl p-4 mb-4">
            <h3 className="text-white font-bold text-sm mb-2 text-right">الوصف</h3>
            <p className="text-vox-muted text-sm leading-relaxed text-right">
              {product.description_ar || product.description}
            </p>
          </div>
        )}

        {/* Tags */}
        {product.tags && (product.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end mb-4">
            {(product.tags as string[]).map(tag => (
              <span
                key={tag}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "rgba(109,40,255,0.12)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.25)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Trust */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { icon: Zap, label: "توصيل سريع", sub: `${merchant?.avg_preparation_time ?? 30} دقيقة`, color: "#FACC15" },
            { icon: Shield, label: "جودة مضمونة", sub: "معايير عالية", color: "#34D399" },
            { icon: MapPin, label: "تتبع مباشر", sub: "مسار حي", color: "#60A5FA" },
          ].map(({ icon: Icon, label, sub, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center"
              style={{ background: "rgba(20,20,30,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-white text-[11px] font-bold leading-tight">{label}</p>
              <p className="text-vox-muted text-[10px] leading-tight">{sub}</p>
            </div>
          ))}
        </div>

        {/* Related */}
        {product.related && product.related.length > 0 && (
          <div>
            <h3 className="text-white font-black text-base mb-3 text-right">منتجات أخرى</h3>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }} dir="rtl">
              {product.related.map(rel => (
                <RelatedCard
                  key={rel.id}
                  product={rel}
                  merchantId={merchantId}
                  categoryEmoji={categoryEmoji}
                  onAdd={() => {
                    if (merchant) {
                      addItem(rel, merchantId, merchant.name_ar || merchant.name);
                      toast(`أُضيف ${rel.name_ar || rel.name} للسلة ✓`, "success");
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {qty > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(109,40,255,0.2)" }}
        >
          <Link
            href="/cart"
            className="flex items-center justify-between w-full rounded-2xl px-5 py-4 font-black text-white"
            style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)", boxShadow: "0 0 28px rgba(109,40,255,0.4)" }}
          >
            <span className="text-sm">عرض السلة</span>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full">{qty}</span>
              <ShoppingCart size={18} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function RelatedCard({
  product, merchantId, categoryEmoji, onAdd,
}: {
  product: Product; merchantId: string; categoryEmoji: string; onAdd: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const { items } = useCart();
  const inCart = items.some(i => i.product.id === product.id);

  return (
    <Link
      href={`/products/${merchantId}/${product.id}`}
      className="flex-shrink-0 w-36 rounded-2xl overflow-hidden"
      style={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="relative w-full h-24 overflow-hidden"
           style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.1), rgba(6,182,212,0.06))" }}>
        {(() => {
          const src = (!imgErr && product.image_url)
            ? product.image_url
            : guessImage(product.name_ar || product.name, categoryEmoji);
          return src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={product.name_ar || product.name}
                 onError={() => setImgErr(true)}
                 style={{ width:"100%", height:"100%", objectFit:"contain", padding:"6px" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {categoryEmoji}
            </div>
          );
        })()}
        {inCart && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-vox-purple flex items-center justify-center">
            <ShoppingCart size={10} className="text-white" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-white text-xs font-bold line-clamp-2 text-right leading-snug mb-1.5">
          {product.name_ar || product.name}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => { e.preventDefault(); onAdd(); }}
            className="w-6 h-6 rounded-lg bg-vox-purple flex items-center justify-center"
          >
            <Plus size={12} className="text-white" />
          </button>
          <span className="text-vox-purple font-black text-xs">{product.price} ر.س</span>
        </div>
      </div>
    </Link>
  );
}
