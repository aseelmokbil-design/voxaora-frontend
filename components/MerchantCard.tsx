import Link from "next/link";
import { Merchant } from "@/lib/api";
import { Clock, Star, Truck, Zap } from "lucide-react";

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍔", grocery: "🛒", pharmacy: "💊", coffee: "☕",
  bakery: "🥐", dessert: "🍰", healthy: "🥗",
};

export default function MerchantCard({ merchant }: { merchant: Merchant }) {
  const emoji = CATEGORY_EMOJI[merchant.category] ?? "🏪";
  const isFast = (merchant.estimated_eta_minutes ?? merchant.avg_preparation_time) <= 20;
  const isFreeDelivery = merchant.delivery_fee === 0;

  return (
    <Link
      href={`/merchant/${merchant.id}`}
      className="glass-card block rounded-2xl overflow-hidden hover:border-vox-purple/40 active:scale-[0.98] transition-all duration-200"
    >
      {/* Cover */}
      <div className="relative h-32 overflow-hidden">
        {merchant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={merchant.cover_image_url} alt={merchant.name_ar || merchant.name}
               style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vox-purple/20 to-vox-blue/20 flex items-center justify-center">
            <span className="text-5xl">{emoji}</span>
          </div>
        )}

        {!merchant.is_open_now && (
          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
            <span className="text-red-400 font-bold text-sm border border-red-400/30 px-3 py-1 rounded-full bg-black/40">
              مغلق الآن
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1.5">
          {merchant.logo_url && (
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={merchant.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white text-xs font-bold">{merchant.rating?.toFixed(1)}</span>
          </div>
          {isFast && (
            <div className="bg-vox-purple/80 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
              <Zap size={9} className="text-white" />
              <span className="text-white text-[10px] font-bold">سريع</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {isFreeDelivery && (
              <span className="text-[10px] font-bold text-green-400 border border-green-400/30 px-1.5 py-0.5 rounded-full">
                توصيل مجاني
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-base leading-tight">
            {merchant.name_ar || merchant.name}
          </h3>
        </div>

        {(merchant.description_ar || merchant.description) && (
          <p className="text-vox-muted text-xs mb-2 line-clamp-1 text-right leading-relaxed">
            {merchant.description_ar || merchant.description}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 text-xs text-vox-muted">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {merchant.estimated_eta_minutes ?? merchant.avg_preparation_time} د
          </span>
          <span className="flex items-center gap-1">
            <Truck size={10} />
            {isFreeDelivery ? (
              <span className="text-green-400 font-semibold">مجاني</span>
            ) : (
              `${merchant.delivery_fee} ر.س`
            )}
          </span>
          {merchant.distance_km != null && (
            <span>{merchant.distance_km.toFixed(1)} كم</span>
          )}
        </div>
      </div>
    </Link>
  );
}
