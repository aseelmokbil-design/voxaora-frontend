"use client";
import { useState, useEffect } from "react";
import { merchantApi, Merchant } from "@/lib/api";
import MerchantCard from "@/components/MerchantCard";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { Search, X, Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import NotificationBell from "@/components/NotificationBell";

const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.1910;
const PAGE_SIZE = 50;

const FEATURED = [
  { id: "restaurant", label: "المطاعم",    sub: "أشهى الأكلات",   emoji: "🍔" },
  { id: "mandi",      label: "أرز ومندي",  sub: "يمني أصيل",      emoji: "🍛" },
  { id: "fastfood",   label: "وجبات سريعة",sub: "طازج وسريع",     emoji: "🍟" },
  { id: "coffee",     label: "قهوة ومشروبات", sub: "حلو ومنعش",   emoji: "☕" },
  { id: "bakery",     label: "مخبوزات",    sub: "طازج يومياً",     emoji: "🍞" },
];

const GRID_CATS = [
  { id: "restaurant", label: "المطاعم",        count: "~600", emoji: "🍔" },
  { id: "fastfood",   label: "وجبات سريعة",    count: "~120", emoji: "🍟" },
  { id: "mandi",      label: "أرز ومندي",      count: "~80",  emoji: "🍛" },
  { id: "coffee",     label: "قهوة",           count: "~40",  emoji: "☕" },
  { id: "breakfast",  label: "فطور وعسل",      count: "~50",  emoji: "🍯" },
  { id: "bakery",     label: "مخبوزات",        count: "~30",  emoji: "🍞" },
  { id: "meat",       label: "ملحمة وأسماك",   count: "~25",  emoji: "🥩" },
  { id: "drinks",     label: "مشروبات",        count: "~20",  emoji: "🥤" },
  { id: "healthy",    label: "صحي ودايت",      count: "~15",  emoji: "🥗" },
  { id: "popular",    label: "مأكولات شعبية",  count: "~20",  emoji: "🍲" },
  { id: "grocery",    label: "سوبر ماركت",     count: "~10",  emoji: "🛒" },
  { id: "other",      label: "متاجر أخرى",     count: "~30",  emoji: "🛍️" },
];

export default function ExplorePage() {
  const { user } = useAuth();
  const { count } = useCart();
  const [mounted, setMounted] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | undefined>();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Load merchants on mount and whenever filter changes
  useEffect(() => {
    setLoading(true);
    merchantApi
      .search(DEFAULT_LAT, DEFAULT_LNG, activeCategory, debouncedQ || undefined, PAGE_SIZE)
      .then(r => {
        setMerchants(r.merchants);
        setHasMore(r.merchants.length === PAGE_SIZE);
      })
      .catch(() => { setMerchants([]); setHasMore(false); })
      .finally(() => setLoading(false));
  }, [activeCategory, debouncedQ]);

  const loadMore = () => {
    setLoadingMore(true);
    merchantApi
      .search(DEFAULT_LAT, DEFAULT_LNG, activeCategory, debouncedQ || undefined, PAGE_SIZE + merchants.length)
      .then(r => {
        setMerchants(r.merchants);
        setHasMore(r.merchants.length > merchants.length && r.merchants.length % PAGE_SIZE === 0);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const isFiltering = !!debouncedQ || !!activeCategory;

  const clearFilters = () => { setQuery(""); setActiveCategory(undefined); };

  return (
    <div className="pb-28 bg-[#060610] min-h-dvh">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(6,6,16,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <Link href={user ? "/profile" : "/auth/login"}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-vox-purple/80 to-vox-blue/80 flex items-center justify-center text-white text-sm font-black border border-white/10">
            {user?.full_name?.[0] ?? "?"}
          </Link>
          <div className="text-center leading-tight">
            <div className="text-base font-black text-white">فوكسورا</div>
            <div className="text-[10px] font-bold tracking-widest"
                 style={{ background: "linear-gradient(135deg, #A855F7, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              VOXAORA
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
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

        {/* Search bar */}
        <div className="mt-3 relative flex items-center gap-2">
          <button className="w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)", boxShadow: "0 0 16px rgba(109,40,255,0.5)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن أي صنف أو متجر..."
              className="w-full rounded-2xl px-4 py-3 text-white placeholder-vox-muted focus:outline-none text-right text-sm pr-4 pl-9"
              style={{ background: "rgba(20,20,35,0.9)", border: "1px solid rgba(109,40,255,0.2)" }}
              dir="rtl"
            />
            {query && (
              <button onClick={() => setQuery("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-vox-muted" />
              </button>
            )}
          </div>
          <div className="flex-shrink-0 text-4xl leading-none" style={{ filter: "drop-shadow(0 0 8px rgba(109,40,255,0.8))" }}>
            🤖
          </div>
        </div>
      </div>

      <div className="px-4">

        {/* ── Featured horizontal scroll (always visible) ── */}
        {!isFiltering && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 mt-4 mb-5" style={{ scrollbarWidth: "none" }} dir="rtl">
            {FEATURED.map((f, i) => (
              <button key={f.id}
                onClick={() => setActiveCategory(f.id)}
                className="flex-shrink-0 flex flex-col items-center justify-between rounded-3xl p-3 transition-all"
                style={{
                  width: 96, minHeight: 112,
                  background: i === 0
                    ? "linear-gradient(135deg, rgba(109,40,255,0.5), rgba(80,20,180,0.6))"
                    : "rgba(18,18,32,0.95)",
                  border: i === 0
                    ? "1.5px solid rgba(168,85,247,0.8)"
                    : "1.5px solid rgba(109,40,255,0.2)",
                  boxShadow: i === 0 ? "0 0 20px rgba(109,40,255,0.4)" : "none",
                }}>
                <div className="text-4xl mb-1">{f.emoji}</div>
                <div>
                  <p className="text-white font-black text-xs text-center leading-tight">{f.label}</p>
                  <p className="text-white/50 text-[9px] text-center leading-tight mt-0.5">{f.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Category grid (collapsed when filtering) ────── */}
        {!isFiltering && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-vox-muted text-xs">اختر تصنيفاً للتصفية</p>
              <h3 className="text-white font-black text-base">كل التصنيفات</h3>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {GRID_CATS.map(c => (
                <button key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className="flex flex-col items-center gap-2">
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center text-2xl relative"
                       style={{
                         background: "rgba(15,10,35,0.9)",
                         border: "1px solid rgba(109,40,255,0.25)",
                         boxShadow: "0 0 12px rgba(109,40,255,0.1), inset 0 0 20px rgba(109,40,255,0.05)",
                       }}>
                    {c.emoji}
                    <div className="absolute inset-0 rounded-2xl"
                         style={{ boxShadow: "inset 0 0 8px rgba(109,40,255,0.15)" }} />
                  </div>
                  <p className="text-white text-[10px] font-bold text-center leading-tight line-clamp-1">{c.label}</p>
                  <p className="text-vox-muted text-[9px] -mt-1">{c.count}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Merchants list ───────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          {isFiltering ? (
            <>
              <button onClick={clearFilters} className="text-vox-purple text-xs font-semibold">إلغاء</button>
              <p className="text-white font-bold text-sm">
                {activeCategory
                  ? GRID_CATS.find(c => c.id === activeCategory)?.label ?? activeCategory
                  : `نتائج "${debouncedQ}"`}
              </p>
            </>
          ) : (
            <>
              <p className="text-vox-muted text-xs">{merchants.length > 0 ? `${merchants.length} متجر` : ""}</p>
              <h3 className="text-white font-black text-base">المتاجر القريبة</h3>
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-white font-semibold mb-1">لا توجد نتائج</p>
            <p className="text-vox-muted text-sm">جرّب كلمة بحث مختلفة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {merchants.map(m => <MerchantCard key={m.id} merchant={m} />)}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-2xl text-white text-sm font-bold mt-2"
                style={{ background: "rgba(109,40,255,0.2)", border: "1px solid rgba(109,40,255,0.3)" }}>
                {loadingMore ? "جاري التحميل..." : "تحميل المزيد"}
              </button>
            )}
          </div>
        )}

        {/* Promo banner */}
        <div className="rounded-3xl p-4 flex items-center justify-between mt-6 mb-4"
             style={{
               background: "linear-gradient(135deg, rgba(109,40,255,0.3), rgba(80,20,180,0.4))",
               border: "1px solid rgba(109,40,255,0.4)",
             }}>
          <Link href="/deals"
            className="flex-shrink-0 rounded-2xl px-4 py-2.5 text-white text-xs font-black"
            style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)", boxShadow: "0 0 16px rgba(109,40,255,0.5)" }}>
            عرض العروض
          </Link>
          <div className="text-right flex-1 px-3">
            <p className="text-white font-black text-sm">تسوق أكثر، وفر أكثر 💜</p>
            <p className="text-white/60 text-[11px] mt-0.5">عروض حصرية وخصومات تصل إلى 60%</p>
          </div>
          <div className="text-3xl flex-shrink-0" style={{ filter: "drop-shadow(0 0 8px rgba(109,40,255,0.8))" }}>🤖</div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
