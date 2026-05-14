"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import VoiceOrb from "@/components/VoiceOrb";
import BottomNav from "@/components/BottomNav";
import { merchantApi, intelligenceApi, statsApi, dealApi, Merchant, ReorderSuggestion, LiveStats, PublicDeal } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Clock, Star, ShoppingBag, Heart, ChevronLeft, Mic, User } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useCart } from "@/context/CartContext";

const CATEGORIES = [
  { id: "restaurant",  label: "المطاعم",      emoji: "🍔", bg: "rgba(239,68,68,0.18)",   color: "#EF4444" },
  { id: "grocery",     label: "سوبر ماركت",   emoji: "🛒", bg: "rgba(34,197,94,0.18)",   color: "#22C55E" },
  { id: "fastfood",    label: "وجبات سريعة",  emoji: "🍟", bg: "rgba(245,158,11,0.18)",  color: "#F59E0B" },
  { id: "coffee",      label: "مشروبات",      emoji: "☕", bg: "rgba(120,80,40,0.22)",   color: "#D97706" },
  { id: "dessert",     label: "حلويات",       emoji: "🍰", bg: "rgba(236,72,153,0.18)",  color: "#EC4899" },
  { id: "pharmacy",    label: "صيدلية",        emoji: "💊", bg: "rgba(59,130,246,0.18)",  color: "#3B82F6" },
  { id: "bakery",      label: "مخبز",          emoji: "🥐", bg: "rgba(249,115,22,0.18)", color: "#F97316" },
  { id: "all",         label: "كل الفئات",    emoji: "▤",  bg: "rgba(109,40,255,0.18)", color: "#A855F7" },
];

const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.1910;

const EMOJI_BG: Record<string, string> = {
  restaurant: "🍔", grocery: "🛒", pharmacy: "💊", coffee: "☕",
  bakery: "🥐", dessert: "🍰", healthy: "🥗", fastfood: "🍟",
};

const DEAL_PRODUCTS = [
  { name: "برغر سبيشل",        discount: 35, price: 2800, img: "/products/burger.png"           },
  { name: "دجاج بروست",        discount: 40, price: 3200, img: "/products/broast-8pcs.png"      },
  { name: "بيتزا كبيرة",       discount: 25, price: 3600, img: "/products/pizza.png"            },
  { name: "مندي دجاج",         discount: 30, price: 2450, img: "/products/mandi.png"            },
  { name: "وجبة زنجر",         discount: 20, price: 1800, img: "/products/zinger.png"           },
  { name: "كابتشينو",          discount: 15, price:  850, img: "/products/cappuccino.png"       },
  { name: "ماتشا لاتيه",       discount: 18, price:  950, img: "/products/matcha-latte.png"     },
  { name: "آيس لاتيه كراميل",  discount: 20, price:  900, img: "/products/iced-caramel-latte.png" },
  { name: "كرواسون بالزبدة",   discount: 22, price:  650, img: "/products/croissant.png"        },
  { name: "كيك شوكولاتة",      discount: 25, price:  780, img: "/products/chocolate-cake.png"   },
  { name: "سوشي مشكل",         discount: 15, price: 4900, img: "/products/sushi.png"            },
  { name: "دجاج تركي",         discount: 23, price: 5500, img: "/products/turkish-chicken.png"  },
];

export default function HomePage() {
  const { user } = useAuth();
  const { count } = useCart();
  const [mounted, setMounted] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [heroDot, setHeroDot] = useState(0);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [featuredDeals, setFeaturedDeals] = useState<PublicDeal[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
      () => {},
      { timeout: 3000 },
    );
  }, []);

  useEffect(() => {
    setFetching(true);
    const cat = activeCategory === "all" ? undefined : activeCategory;
    merchantApi.search(lat, lng, cat, searchQuery || undefined, 20)
      .then(r => setMerchants(r.merchants))
      .catch(() => setMerchants([]))
      .finally(() => setFetching(false));
  }, [lat, lng, activeCategory, searchQuery]);

  useEffect(() => {
    if (!user) return;
    intelligenceApi.reorderSuggestions().then(r => setReorderSuggestions(r.suggestions)).catch(() => {});
  }, [user]);

  useEffect(() => {
    statsApi.live().then(setLiveStats).catch(() => {});
  }, []);

  useEffect(() => {
    dealApi.list("home", 12).then(r => {
      if (r.deals.length > 0) setFeaturedDeals(r.deals);
    }).catch(() => {});
  }, []);

  const topMerchants = merchants.slice(0, 10);

  return (
    <div className="pb-28 bg-[#0A0A0F] min-h-dvh">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 pt-safe-top pt-4 pb-2"
           style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">

          {/* Left: profile */}
          <Link href={user ? "/profile" : "/auth/login"}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-vox-purple/80 to-vox-blue/80 flex items-center justify-center text-white text-sm font-black border border-white/10">
            {user ? (user.full_name?.[0] ?? <User size={16} />) : <User size={16} />}
          </Link>

          {/* Center: logo */}
          <div className="text-center leading-tight">
            <div className="text-base font-black text-white">فوكسورا</div>
            <div className="text-[10px] font-bold tracking-widest"
                 style={{ background: "linear-gradient(135deg, #A855F7, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              VOXAORA
            </div>
          </div>

          {/* Right: icons */}
          <div className="flex items-center gap-2">
            {/* AI robot badge */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: "rgba(109,40,255,0.2)", border: "1px solid rgba(109,40,255,0.35)" }}>
              🤖
            </div>
            <button className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Heart size={15} className="text-vox-muted" />
            </button>
            {mounted && (
              <Link href="/cart"
                className="relative w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <ShoppingBag size={15} className="text-vox-muted" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-vox-purple text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Location + delivery banner */}
        <div className="flex items-center justify-between mt-2.5 px-0.5">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-vox-cyan" />
            <span className="text-vox-muted text-[11px]">التوصيل خلال 30 - 45 دقيقة</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white text-[11px] font-semibold">صنعاء - شارع حدة</span>
            <MapPin size={11} className="text-vox-purple" />
          </div>
        </div>
      </div>

      <div className="px-4">

        {/* ── Search ───────────────────────────────────────── */}
        <div className="mt-3 mb-4">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
               style={{ background: "rgba(20,20,30,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Search size={16} className="text-vox-muted flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث أو اطلب طلبك"
              className="flex-1 bg-transparent text-white text-sm text-right placeholder:text-vox-muted outline-none"
              dir="rtl"
            />
          </div>
        </div>

        {/* ── Hero Voice Card (carousel style) ─────────────── */}
        <div className="rounded-3xl overflow-hidden mb-4 relative"
             style={{
               background: "linear-gradient(135deg, rgba(109,40,255,0.25) 0%, rgba(80,30,200,0.35) 50%, rgba(6,182,212,0.12) 100%)",
               border: "1px solid rgba(109,40,255,0.35)",
               minHeight: 148,
             }}>

          {/* Waveform decoration — right side */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-end gap-[2px] opacity-50" dir="ltr">
            {[14, 26, 18, 36, 24, 40, 20, 34, 28, 16, 30, 22].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full animate-pulse"
                   style={{
                     height: `${h}px`,
                     background: i % 3 === 0 ? "#A855F7" : i % 3 === 1 ? "#6D28FF" : "#06B6D4",
                     animationDelay: `${i * 0.08}s`,
                   }} />
            ))}
          </div>

          <div className="p-5 pr-20 relative z-10">
            <p className="text-white font-black text-xl leading-tight text-right mb-0.5">
              تحدث فقط ...
            </p>
            <p className="text-white/60 text-sm text-right mb-4 leading-snug">
              ودع <span className="text-vox-purple font-bold">فوكسورا</span> يطلب عنك
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVoice(true)}
                className="flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)", boxShadow: "0 0 20px rgba(109,40,255,0.5)" }}
              >
                <Mic size={16} />
                جرب الآن
              </button>
            </div>
          </div>

          {/* Pagination dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setHeroDot(i)}
                className="rounded-full transition-all"
                style={{
                  width: heroDot === i ? 18 : 5,
                  height: 5,
                  background: heroDot === i ? "#A855F7" : "rgba(255,255,255,0.25)",
                }} />
            ))}
          </div>
        </div>

        {/* VoiceOrb modal */}
        {showVoice && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
               style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
               onClick={() => setShowVoice(false)}>
            <div className="w-full max-w-[430px] rounded-t-3xl p-6"
                 style={{ background: "#0A0A0F", border: "1px solid rgba(109,40,255,0.3)" }}
                 onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowVoice(false)} className="text-vox-muted text-sm">إغلاق</button>
                <p className="text-white font-bold">المساعد الصوتي</p>
              </div>
              <VoiceOrb lat={lat} lng={lng} />
            </div>
          </div>
        )}

        {/* ── Categories ────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} dir="rtl">
            {CATEGORIES.map(c =>
              c.id === "all" ? (
                <Link key={c.id} href="/explore" className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all"
                       style={{ background: c.bg, border: `1.5px solid transparent` }}>
                    <span style={{ color: c.color, fontSize: 22 }}>≡</span>
                  </div>
                  <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {c.label}
                  </span>
                </Link>
              ) : (
                <button key={c.id}
                  onClick={() => setActiveCategory(activeCategory === c.id ? undefined : c.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all"
                       style={{
                         background: activeCategory === c.id ? c.bg.replace("0.18", "0.4") : c.bg,
                         border: `1.5px solid ${activeCategory === c.id ? c.color : "transparent"}`,
                         boxShadow: activeCategory === c.id ? `0 0 14px ${c.color}50` : "none",
                       }}>
                    {c.emoji}
                  </div>
                  <span className="text-[10px] font-semibold whitespace-nowrap"
                        style={{ color: activeCategory === c.id ? c.color : "rgba(255,255,255,0.5)" }}>
                    {c.label}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* ── العروض الحصرية ───────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <Link href="/deals" className="flex items-center gap-1 text-vox-purple text-xs font-semibold">
              عرض الكل <ChevronLeft size={12} />
            </Link>
            <h2 className="text-white font-bold text-sm">العروض الحصرية 🔥</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }} dir="rtl">
            {(featuredDeals.length > 0 ? featuredDeals : DEAL_PRODUCTS.map(p => ({ id: p.name, title: p.name, image_url: p.img, discounted_price: p.price, original_price: Math.round(p.price / (1 - p.discount / 100)), discount_pct: p.discount, countdown_seconds: 7200, placement: "home", sort_order: 0 } as PublicDeal))).map((p, i) => (
              <Link key={p.id ?? i}
                href={(p.merchant_id && p.product_id) ? `/products/${p.merchant_id}/${p.product_id}` : "/deals"}
                className="flex-shrink-0 w-40 rounded-2xl overflow-hidden active:scale-95 transition-transform"
                style={{ background: "rgba(18,18,28,0.95)", border: "1px solid rgba(255,255,255,0.07)", textDecoration: "none" }}>
                {/* Product image */}
                <div className="relative w-full h-28"
                     style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.12), rgba(6,182,212,0.07))" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url ?? "/products/burger.png"} alt={p.title} style={{ width:"100%", height:"100%", objectFit:"contain", padding:"8px" }} />
                  {p.discount_pct && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {p.discount_pct}%
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white text-xs font-bold text-right line-clamp-1 mb-1">{p.title}</p>
                  <div className="flex items-center justify-between">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-base font-black"
                         style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
                      +
                    </div>
                    <span className="text-vox-purple font-black text-xs">
                      {(p.discounted_price ?? 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Social Proof Bar ──────────────────────────────── */}
        {liveStats && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} dir="rtl">
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl"
                 style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold whitespace-nowrap">{liveStats.open_now} متجر مفتوح</span>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl"
                 style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)" }}>
              <span className="text-vox-purple text-xs font-bold whitespace-nowrap">🛍️ {liveStats.total_products.toLocaleString()} منتج</span>
            </div>
            {liveStats.orders_today > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl"
                   style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <span className="text-amber-400 text-xs font-bold whitespace-nowrap">🔥 {liveStats.orders_today} طلب اليوم</span>
              </div>
            )}
            {liveStats.top_categories[0] && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl"
                   style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <span className="text-vox-cyan text-xs font-bold whitespace-nowrap">⭐ {liveStats.top_categories[0].name}</span>
              </div>
            )}
          </div>
        )}

        {/* ── المطاعم الأكثر طلبًا ──────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <Link href="/explore" className="flex items-center gap-1 text-vox-purple text-xs font-semibold">
              عرض الكل <ChevronLeft size={12} />
            </Link>
            <h2 className="text-white font-bold text-sm">
              {activeCategory && activeCategory !== "all" || searchQuery ? "النتائج" : "🏆 المطاعم الأكثر طلبًا"}
            </h2>
          </div>

          {fetching ? (
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-shrink-0 w-32 rounded-2xl overflow-hidden"
                     style={{ background: "rgba(20,20,30,0.9)", height: 120 }}>
                  <div className="w-full h-16 skeleton" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-2.5 rounded skeleton w-3/4 ml-auto" />
                    <div className="h-2 rounded skeleton w-1/2 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : topMerchants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-vox-muted text-sm">لا توجد نتائج</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }} dir="rtl">
              {topMerchants.map(m => (
                <Link key={m.id} href={`/merchant/${m.id}`}
                  className="flex-shrink-0 w-36 rounded-2xl overflow-hidden active:scale-95 transition-transform"
                  style={{ background: "rgba(18,18,28,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* Logo */}
                  <div className="relative w-full h-20 overflow-hidden">
                    {m.logo_url ? (
                      <Image src={m.logo_url} alt={m.name_ar || m.name} fill className="object-cover" sizes="144px" />
                    ) : m.cover_image_url ? (
                      <Image src={m.cover_image_url} alt={m.name_ar || m.name} fill className="object-cover" sizes="144px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl"
                           style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.15), rgba(6,182,212,0.08))" }}>
                        {EMOJI_BG[m.category] ?? "🏪"}
                      </div>
                    )}
                    {!m.is_open_now && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-red-400 text-[10px] font-bold border border-red-400/40 px-2 py-0.5 rounded-full">مغلق</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-white text-xs font-bold text-right line-clamp-1 mb-1.5">{m.name_ar || m.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-0.5 text-vox-muted text-[10px]">
                        <Clock size={8} />
                        {m.estimated_eta_minutes ?? m.avg_preparation_time ?? 35}د
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-yellow-400 text-[10px] font-bold">{m.rating?.toFixed(1) ?? "4.5"}</span>
                        <Star size={9} className="text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
                    <p className="text-vox-muted text-[10px] text-right mt-1 truncate">
                      {m.category === "restaurant" ? "مطعم" : m.category === "grocery" ? "بقالة" : m.category === "coffee" ? "مشروبات" : m.category}
                      {liveStats?.hot_merchants?.[m.id] ? (
                        <span className="text-amber-400 font-semibold"> · 🔥 {liveStats.hot_merchants[m.id]}+ طلب</span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── اطلب مجدداً ───────────────────────────────────── */}
        {reorderSuggestions.length > 0 && (
          <div className="mb-5">
            <h2 className="text-white font-bold text-sm text-right mb-3">🔄 اطلب مجدداً</h2>
            <div className="space-y-2">
              {reorderSuggestions.slice(0, 2).map(s => (
                <Link key={s.order_id} href={`/orders/${s.order_id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "rgba(18,18,28,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-xl bg-vox-purple/10 flex items-center justify-center text-xl flex-shrink-0">
                    🔄
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-white text-sm font-bold">{s.merchant_name}</p>
                    <p className="text-vox-muted text-xs">{s.items_summary}</p>
                  </div>
                  <ChevronLeft size={14} className="text-vox-muted flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      <BottomNav onVoiceTap={() => setShowVoice(true)} />
    </div>
  );
}
