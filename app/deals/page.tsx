"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Heart, ShoppingBag, ShoppingCart, Zap, Plus, Star, Clock } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { dealApi, PublicDeal } from "@/lib/api";

/* ── Types ─────────────────────────────────────────── */
interface Deal {
  id: string;
  title: string;
  desc: string;
  img: string;
  currentPrice: number;
  oldPrice: number;
  discount: number;
  countdown: number;
  rating: number;
  eta: number;
  merchant_id?: string;
  product_id?: string;
}

/* ── Mock data ──────────────────────────────────────── */
const HERO_DEAL: Deal = {
  id: "hero",
  title: "وجبة التوفير العملاقة",
  desc: "برغر + بطاطس + مشروب",
  img: "/products/burger.png",
  currentPrice: 2800,
  oldPrice: 4500,
  discount: 35,
  countdown: 8073,
  rating: 4.9,
  eta: 32,
};

const DEALS: Deal[] = [
  { id: "1",  title: "مندي دجاج حنيذ",      desc: "دجاج + أرز + سلطة + صوص",    img: "/products/mandi.png",              currentPrice: 2450, oldPrice: 3500, discount: 30, countdown: 6312,  rating: 4.8, eta: 35 },
  { id: "2",  title: "بيتزا كبيرة",          desc: "بيتزا 12 قطعة",               img: "/products/pizza.png",              currentPrice: 3600, oldPrice: 4800, discount: 25, countdown: 11564, rating: 4.7, eta: 28 },
  { id: "3",  title: "دجاج بروست",           desc: "8 قطع + بطاطس + صوص",         img: "/products/broast-8pcs.png",        currentPrice: 3200, oldPrice: 5333, discount: 40, countdown: 20120, rating: 4.9, eta: 22 },
  { id: "4",  title: "سوشي مشكل",            desc: "20 قطعة + صوص",                img: "/products/sushi.png",              currentPrice: 4900, oldPrice: 5765, discount: 15, countdown: 8418,  rating: 4.6, eta: 40 },
  { id: "5",  title: "وجبة زنجر",            desc: "زنجر + بطاطس + مشروب",        img: "/products/zinger.png",             currentPrice: 1800, oldPrice: 2400, discount: 25, countdown: 15300, rating: 4.7, eta: 20 },
  { id: "6",  title: "دجاج فحم تركي",        desc: "دجاج مع التوابع",              img: "/products/turkish-chicken.png",    currentPrice: 5500, oldPrice: 7200, discount: 23, countdown: 18900, rating: 4.8, eta: 45 },
  { id: "7",  title: "باكيت عائلي بروست",    desc: "9 قطع + بطاطس + صوص",         img: "/products/broast-family.png",      currentPrice: 6800, oldPrice: 9000, discount: 25, countdown: 9900,  rating: 4.9, eta: 40 },
  { id: "8",  title: "سلطة كولسلو",          desc: "سلطة طازجة",                  img: "/products/coleslaw.png",           currentPrice:  450, oldPrice:  650, discount: 31, countdown: 7200,  rating: 4.5, eta: 15 },
  { id: "9",  title: "شيبس مقرمش",           desc: "حصة كبيرة",                   img: "/products/chips.png",              currentPrice:  380, oldPrice:  500, discount: 24, countdown: 5400,  rating: 4.4, eta: 10 },
  { id: "10", title: "بيبسي",                desc: "علبة 330ml",                  img: "/products/pepsi.png",              currentPrice:  200, oldPrice:  280, discount: 29, countdown: 3600,  rating: 4.3, eta: 10 },
  { id: "11", title: "عصير برتقال",           desc: "عصير طازج 500ml",             img: "/products/orange-juice.png",       currentPrice:  650, oldPrice:  900, discount: 28, countdown: 4200,  rating: 4.7, eta: 15 },
];

const COFFEE_DEALS: Deal[] = [
  { id: "c1", title: "أمريكانو",             desc: "قهوة أمريكانو ساخنة",         img: "/products/americano.png",          currentPrice:  600, oldPrice:  800, discount: 25, countdown: 5400,  rating: 4.8, eta: 10 },
  { id: "c2", title: "آيس لاتيه كراميل",    desc: "لاتيه بارد بالكراميل",        img: "/products/iced-caramel-latte.png", currentPrice:  850, oldPrice: 1100, discount: 23, countdown: 7200,  rating: 4.9, eta: 12 },
  { id: "c3", title: "كابتشينو",             desc: "كابتشينو ناعم",               img: "/products/cappuccino.png",         currentPrice:  750, oldPrice: 1000, discount: 25, countdown: 6300,  rating: 4.7, eta: 10 },
  { id: "c4", title: "كولد برو",             desc: "قهوة باردة مركزة",            img: "/products/cold-brew.png",          currentPrice:  900, oldPrice: 1200, discount: 25, countdown: 8100,  rating: 4.8, eta: 10 },
  { id: "c5", title: "لاتيه كراميل",         desc: "لاتيه ساخن بالكراميل",        img: "/products/latte-caramel.png",      currentPrice:  800, oldPrice: 1050, discount: 24, countdown: 4500,  rating: 4.9, eta: 10 },
  { id: "c6", title: "ماتشا لاتيه",          desc: "لاتيه ماتشا بارد",            img: "/products/matcha-latte.png",       currentPrice:  950, oldPrice: 1200, discount: 21, countdown: 9000,  rating: 4.8, eta: 12 },
  { id: "c7", title: "ماكياتو كراميل",       desc: "ماكياتو بالكراميل",           img: "/products/caramel-macchiato.png",  currentPrice:  880, oldPrice: 1150, discount: 23, countdown: 6600,  rating: 4.7, eta: 10 },
  { id: "c8", title: "فلات وايت",            desc: "فلات وايت ناعم",              img: "/products/flat-white.png",         currentPrice:  720, oldPrice:  950, discount: 24, countdown: 5100,  rating: 4.8, eta: 10 },
];

const BAKERY_DEALS: Deal[] = [
  { id: "b1", title: "كرواسون بالزبدة",     desc: "كرواسون طازج يومياً",         img: "/products/croissant.png",          currentPrice:  550, oldPrice:  750, discount: 27, countdown: 3600,  rating: 4.8, eta: 8  },
  { id: "b2", title: "كيك شوكولاتة",        desc: "قطعة كيك بالشوكولاتة",        img: "/products/chocolate-cake.png",     currentPrice:  700, oldPrice:  950, discount: 26, countdown: 5400,  rating: 4.9, eta: 8  },
];

const STATS = [
  { label: "إجمالي التوفير اليوم", value: "1,700", unit: "ر.ي", icon: "💰", color: "#22C55E" },
  { label: "عرض منتج",             value: "12",     unit: "",    icon: "📦", color: "#A855F7" },
  { label: "استفادوا اليوم",       value: "8,452",  unit: "",    icon: "👥", color: "#06B6D4" },
];

const TABS = [
  { id: "recommended", label: "المختارة لك ⭐" },
  { id: "expiring",    label: "تنتهي قريباً ⏱" },
  { id: "popular",     label: "الأكثر طلبًا 🔥" },
  { id: "all",         label: "كل العروض ≡" },
];

/* ── Countdown component ────────────────────────────── */
function Countdown({ init, className }: { init: number; className?: string }) {
  const [s, setS] = useState(init);
  useEffect(() => {
    const t = setInterval(() => setS(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span className={className}>
      {String(h).padStart(2, "0")} : {String(m).padStart(2, "0")} : {String(sec).padStart(2, "0")}
    </span>
  );
}

/* ── DealSection component ──────────────────────────── */
function DealSection({ title, deals, onAdd }: { title: string; deals: Deal[]; onAdd: (d: Deal) => void }) {
  return (
    <div className="mb-5">
      <h2 className="text-white font-black text-base text-right mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }} dir="rtl">
        {deals.map(deal => {
          const href = (deal.merchant_id && deal.product_id)
            ? `/products/${deal.merchant_id}/${deal.product_id}`
            : deal.merchant_id ? `/merchant/${deal.merchant_id}` : "/explore";
          return (
            <Link key={deal.id} href={href}
              className="flex-shrink-0 w-44 rounded-3xl overflow-hidden active:scale-95 transition-transform"
              style={{ background: "rgba(12,8,30,0.98)", border: "1px solid rgba(109,40,255,0.25)", textDecoration: "none" }}>
              <div className="relative w-full h-28"
                   style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.1), rgba(6,182,212,0.06))" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={deal.img} alt={deal.title} style={{ width:"100%", height:"100%", objectFit:"contain", padding:"8px" }} />
                <div className="absolute top-2 right-2 rounded-full px-2 py-0.5"
                     style={{ background: "rgba(239,68,68,0.9)" }}>
                  <span className="text-white text-[10px] font-black">{deal.discount}%</span>
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5"
                     style={{ background: "rgba(0,0,0,0.75)" }}>
                  <Countdown init={deal.countdown} className="text-red-400 text-[9px] font-black tabular-nums" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-white text-xs font-black text-right mb-0.5 line-clamp-1">{deal.title}</p>
                <p className="text-white/40 text-[10px] text-right mb-2 line-clamp-1">{deal.desc}</p>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-0.5">
                    <Star size={8} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-white/50 text-[9px]">{deal.rating}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white/30 text-[9px] line-through">{deal.oldPrice.toLocaleString()}</span>
                    <div className="text-vox-purple font-black text-xs">{deal.currentPrice.toLocaleString()} ر.ي</div>
                  </div>
                </div>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(deal); }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-white text-[11px] font-black"
                  style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)" }}>
                  <Plus size={12} />
                  اطلب
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function _toDeal(d: PublicDeal): Deal {
  return {
    id: d.id,
    title: d.title,
    desc: d.description ?? "",
    img: d.image_url ?? "/products/burger.png",
    currentPrice: d.discounted_price ?? 0,
    oldPrice: d.original_price ?? 0,
    discount: d.discount_pct ?? 0,
    countdown: d.countdown_seconds,
    rating: 4.7,
    eta: 30,
    merchant_id: d.merchant_id,
    product_id: d.product_id,
  };
}

/* ── Page ───────────────────────────────────────────── */
export default function DealsPage() {
  const { user } = useAuth();
  const { count, addItem, items } = useCart();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("recommended");
  const [showVoice, setShowVoice] = useState(false);
  const [apiDeals, setApiDeals] = useState<Deal[] | null>(null);
  const [heroDeal, setHeroDeal] = useState<Deal>(HERO_DEAL);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    dealApi.list(undefined, 50).then(r => {
      if (r.deals.length > 0) {
        const converted = r.deals.map(_toDeal);
        setHeroDeal(converted[0]);
        setApiDeals(converted.slice(1));
      }
    }).catch(() => {});
  }, []);

  const handleAdd = (deal: Deal) => {
    addItem(
      { id: deal.id, name: deal.title, name_ar: deal.title, price: deal.currentPrice / 100, original_price: deal.oldPrice / 100, rating: deal.rating, preparation_time: deal.eta },
      "deals",
      "فوكسورا العروض",
    );
    toast(`أُضيف ${deal.title} للسلة ✓`, "success");
  };

  return (
    <div className="pb-28 min-h-dvh" style={{ background: "#060610" }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(6,6,16,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(109,40,255,0.12)" }}>
        <div className="flex items-center justify-between">
          <Link href={user ? "/profile" : "/auth/login"}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-vox-purple/80 to-vox-blue/80 flex items-center justify-center text-white text-sm font-black border border-white/10">
            {user?.full_name?.[0] ?? "؟"}
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
              <Link href="/cart" className="relative w-8 h-8 rounded-xl flex items-center justify-center"
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

        {/* Info bar */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
               style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)" }}>
            <span className="text-[10px] text-vox-muted">التوصيل خلال</span>
            <span className="text-[10px] font-bold text-vox-cyan">32 دقيقة</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
               style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)" }}>
            <span className="text-[10px] font-bold text-white">7:30 – 11:00</span>
            <Clock size={10} className="text-vox-purple" />
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
               style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)" }}>
            <span className="text-[10px] font-bold text-white">صنعاء</span>
            <span className="text-[10px]">📍</span>
          </div>
        </div>
      </div>

      <div className="px-4">

        {/* ── Hero section ────────────────────────────────── */}
        <div className="mt-4 mb-4 rounded-3xl p-4 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.2), rgba(80,20,180,0.3))", border: "1px solid rgba(109,40,255,0.35)" }}>
          {/* Robot + welcome */}
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl" style={{ filter: "drop-shadow(0 0 12px rgba(109,40,255,0.9))" }}>🤖</div>
            <div className="flex-1 rounded-2xl p-3 text-right"
                 style={{ background: "rgba(10,10,20,0.7)", border: "1px solid rgba(109,40,255,0.25)" }}>
              <p className="text-white text-xs font-bold leading-snug">
                {user ? `مرحباً ${user.full_name?.split(" ")[0] ?? ""}! ` : "مرحباً! "}
                اخترت لك أقوى العروض اليوم — وفّر أكثر! 💜
              </p>
            </div>
          </div>

          {/* Page title */}
          <div className="text-right mb-1">
            <h1 className="text-white font-black text-2xl">العروض القوية ⚡</h1>
            <p className="text-white/50 text-xs mt-0.5">أفضل العروض الحصرية المختارة لك</p>
          </div>
        </div>

        {/* ── Filter tabs ─────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-4" style={{ scrollbarWidth: "none" }} dir="rtl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all"
              style={activeTab === t.id
                ? { background: "linear-gradient(135deg, #6D28FF, #A855F7)", color: "#fff", boxShadow: "0 0 16px rgba(109,40,255,0.5)" }
                : { background: "rgba(20,20,35,0.9)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(109,40,255,0.2)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Featured hero deal card ──────────────────────── */}
        <div className="rounded-3xl overflow-hidden mb-5 relative"
             style={{ background: "rgba(12,8,30,0.98)", border: "1px solid rgba(109,40,255,0.4)", boxShadow: "0 0 40px rgba(109,40,255,0.2)" }}>

          {/* Badges row */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5 bg-vox-purple/20 border border-vox-purple/40 rounded-full px-3 py-1">
              <Zap size={10} className="text-yellow-400" />
              <span className="text-yellow-400 text-[10px] font-black">{heroDeal.discount}% تخفيض</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1"
                 style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
              <span className="text-red-400 text-[10px] font-black animate-pulse">⏱</span>
              <Countdown init={heroDeal.countdown} className="text-red-400 text-[11px] font-black tabular-nums" />
            </div>
          </div>

          {/* Food image — tappable → product detail */}
          <Link
            href={(heroDeal.merchant_id && heroDeal.product_id) ? `/products/${heroDeal.merchant_id}/${heroDeal.product_id}` : heroDeal.merchant_id ? `/merchant/${heroDeal.merchant_id}` : "/explore"}
            className="block mx-4 rounded-2xl overflow-hidden mb-3 relative active:scale-95 transition-transform"
            style={{ height: 160, background: "linear-gradient(135deg, rgba(109,40,255,0.1), rgba(6,182,212,0.07))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroDeal.img} alt={heroDeal.title} style={{ width:"100%", height:"100%", objectFit:"contain", padding:"8px" }} />
            {/* AI tag */}
            <div className="absolute top-2 left-2 flex gap-1.5">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(109,40,255,0.8)", color: "#fff" }}>موصى به</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(6,182,212,0.8)", color: "#fff" }}>مطابق لذوقك</span>
            </div>
          </Link>

          {/* Deal info */}
          <div className="px-4 pb-4">
            <h3 className="text-white font-black text-lg text-right mb-0.5">{heroDeal.title}</h3>
            <p className="text-white/50 text-xs text-right mb-3">{heroDeal.desc}</p>

            {/* Price row */}
            <div className="flex items-baseline gap-2 justify-end mb-1">
              <span className="text-white/40 text-sm line-through">{heroDeal.oldPrice.toLocaleString()} ر.ي</span>
              <span className="text-white font-black text-2xl">{heroDeal.currentPrice.toLocaleString()}</span>
              <span className="text-white/60 text-sm">ر.ي</span>
            </div>
            <p className="text-green-400 text-xs text-right font-bold mb-4">
              وفّرت {(heroDeal.oldPrice - heroDeal.currentPrice).toLocaleString()} ر.ي 🎉
            </p>

            {/* CTA */}
            <button onClick={() => handleAdd(heroDeal)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, #6D28FF, #A855F7)", boxShadow: "0 0 24px rgba(109,40,255,0.5)" }}>
              <ShoppingCart size={18} />
              اطلب العرض الآن
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center"
                 style={{ background: "rgba(15,12,30,0.95)", border: "1px solid rgba(109,40,255,0.18)" }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-black text-lg leading-none" style={{ color: s.color }}>
                {s.value}
                {s.unit && <span className="text-xs font-bold"> {s.unit}</span>}
              </div>
              <p className="text-white/40 text-[9px] mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Deals grid ──────────────────────────────────── */}
        <DealSection title="عروض تنتهي قريباً ⏱" deals={apiDeals ?? DEALS} onAdd={handleAdd} />
        {!apiDeals && <DealSection title="عروض الكافيه ☕" deals={COFFEE_DEALS} onAdd={handleAdd} />}
        {!apiDeals && <DealSection title="مخبوزات وحلويات 🥐" deals={BAKERY_DEALS} onAdd={handleAdd} />}

        {/* ── AI Recommendation banner ─────────────────────── */}
        <div className="rounded-3xl p-4 mb-4 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, rgba(109,40,255,0.25), rgba(80,20,180,0.35))", border: "1px solid rgba(109,40,255,0.4)" }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl flex-shrink-0" style={{ filter: "drop-shadow(0 0 10px rgba(109,40,255,0.9))" }}>🤖</div>
            <div className="flex-1 text-right">
              <p className="text-white font-black text-sm mb-1">فوكسورا الذكية AI</p>
              <p className="text-white/60 text-[11px] leading-relaxed">
                هذا العرض يوفر لك <span className="text-green-400 font-bold">1,700 ر.ي</span> ويصل خلال <span className="text-vox-cyan font-bold">32 دقيقة</span> ويطابق طلباتك السابقة بنسبة <span className="text-yellow-400 font-bold">92%</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      <BottomNav onVoiceTap={() => setShowVoice(true)} />
    </div>
  );
}
