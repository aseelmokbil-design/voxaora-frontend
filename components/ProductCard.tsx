"use client";
import { Product } from "@/lib/api";
import { Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";

/* Map product name keywords → local fallback image */
const guessImage = (name: string, category = ""): string => {
  const n = (name + " " + category).toLowerCase();
  if (n.includes("برجر") || n.includes("burger"))                 return "/products/burger.png";
  if (n.includes("بيتزا") || n.includes("pizza"))                 return "/products/pizza.png";
  if (n.includes("مندي") || n.includes("mandi"))                  return "/products/mandi.png";
  if (n.includes("سوشي") || n.includes("sushi"))                  return "/products/sushi.png";
  if (n.includes("زنجر") || n.includes("zinger"))                 return "/products/zinger.png";
  if (n.includes("بروست") || n.includes("بروستد") || n.includes("broast")) return "/products/broast-8pcs.png";
  if (n.includes("عائلي") || n.includes("family"))                return "/products/broast-family.png";
  if (n.includes("تركي") || n.includes("فحم"))                   return "/products/turkish-chicken.png";
  if (n.includes("كولسلو") || n.includes("سلطة"))                return "/products/coleslaw.png";
  if (n.includes("شيبس") || n.includes("بطاطس"))                 return "/products/chips.png";
  if (n.includes("بيبسي") || n.includes("pepsi"))                 return "/products/pepsi.png";
  if (n.includes("عصير") || n.includes("برتقال"))                 return "/products/orange-juice.png";
  if (n.includes("أمريكانو") || n.includes("americano"))          return "/products/americano.png";
  if (n.includes("كابتشينو") || n.includes("cappuccino"))         return "/products/cappuccino.png";
  if (n.includes("كولد برو") || n.includes("cold brew"))          return "/products/cold-brew.png";
  if (n.includes("ماتشا") || n.includes("matcha"))                return "/products/matcha-latte.png";
  if (n.includes("ماكياتو") || n.includes("macchiato"))           return "/products/caramel-macchiato.png";
  if (n.includes("فلات وايت") || n.includes("flat white"))        return "/products/flat-white.png";
  if (n.includes("لاتيه") || n.includes("latte"))                 return "/products/latte-caramel.png";
  if (n.includes("كرواسون") || n.includes("croissant"))           return "/products/croissant.png";
  if (n.includes("كيك") || n.includes("cake") || n.includes("شوكولا")) return "/products/chocolate-cake.png";
  if (n.includes("دجاج") || n.includes("chicken"))                return "/products/broast-8pcs.png";
  if (n.includes("coffee") || n.includes("قهوة"))                 return "/products/americano.png";
  return "";
};

interface Props {
  product: Product;
  merchantId: string;
  merchantName: string;
  category?: string;
}

export default function ProductCard({ product, merchantId, merchantName, category }: Props) {
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0;

  const imgSrc = product.image_url || guessImage(product.name_ar || product.name, category);

  return (
    <a
      href={`/products/${merchantId}/${product.id}`}
      className="block rounded-2xl overflow-hidden transition-all active:scale-95"
      style={{
        background: qty > 0 ? "rgba(109,40,255,0.08)" : "rgba(18,18,28,0.95)",
        border: `1px solid ${qty > 0 ? "rgba(109,40,255,0.4)" : "rgba(255,255,255,0.07)"}`,
        textDecoration: "none",
      }}
    >
      {/* Image */}
      <div className="relative w-full h-32 overflow-hidden"
           style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.1), rgba(6,182,212,0.06))" }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={product.name_ar || product.name}
               style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}

        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
            -{discountPct}%
          </div>
        )}

        {qty > 0 && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-vox-purple flex items-center justify-center">
            <span className="text-white text-[9px] font-black">{qty}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-white font-bold text-xs text-right line-clamp-2 leading-snug mb-1">
          {product.name_ar || product.name}
        </p>
        {(product.description_ar || product.description) && (
          <p className="text-white/40 text-[10px] text-right line-clamp-1 mb-1.5">
            {product.description_ar || product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          {/* Add/Qty button */}
          <div onClick={e => e.stopPropagation()}>
            {qty === 0 ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product, merchantId, merchantName); }}
                className="w-7 h-7 rounded-lg bg-vox-purple flex items-center justify-center active:scale-90 transition-all"
              >
                <Plus size={14} className="text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQty(product.id, qty - 1); }}
                  className="w-6 h-6 rounded-lg border border-vox-border flex items-center justify-center active:scale-90"
                >
                  <Minus size={10} className="text-white" />
                </button>
                <span className="text-white text-xs font-black w-4 text-center">{qty}</span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product, merchantId, merchantName); }}
                  className="w-6 h-6 rounded-lg bg-vox-purple flex items-center justify-center active:scale-90"
                >
                  <Plus size={10} className="text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-right">
            {hasDiscount && (
              <span className="text-white/30 text-[9px] line-through block leading-none">
                {product.original_price} ر.ي
              </span>
            )}
            <span className={`font-black text-sm ${hasDiscount ? "text-red-400" : "text-vox-purple"}`}>
              {product.price} ر.ي
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
