"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { orderApi, merchantApi, addressApi, couponApi, Address } from "@/lib/api";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Minus, Plus, Trash2, ChevronRight, ShoppingBag, MapPin, Tag, ChevronDown } from "lucide-react";
import Link from "next/link";

const PAYMENT_METHODS = [
  { v: "cash",    label: "💵", name: "كاش" },
  { v: "card",    label: "💳", name: "بطاقة" },
  { v: "stc_pay", label: "📱", name: "STC Pay" },
  { v: "apple_pay", label: "🍎", name: "Apple Pay" },
];

export default function CartPage() {
  const { items, merchantId, merchantName, removeItem, updateQty, total, clear } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [placing, setPlacing]       = useState(false);
  const [payMethod, setPayMethod]   = useState("cash");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [coupon, setCoupon]         = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [notes, setNotes]           = useState("");
  const [addresses, setAddresses]   = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const [taxAmount, setTaxAmount]   = useState(0);

  useEffect(() => {
    if (!merchantId) return;
    merchantApi.get(merchantId).then(m => {
      setDeliveryFee(m.delivery_fee);
      setTaxAmount(Math.round(total * 0.15 * 100) / 100);
    }).catch(() => {});
  }, [merchantId, total]);

  useEffect(() => {
    if (!user) return;
    addressApi.list().then(addrs => {
      setAddresses(addrs);
      const def = addrs.find(a => a.is_default);
      if (def) setSelectedAddr(def.id);
    }).catch(() => {});
  }, [user]);

  const grandTotal = total + deliveryFee + taxAmount - couponDiscount;

  const applyCoupon = async () => {
    if (!coupon.trim() || !user) return;
    setValidatingCoupon(true);
    try {
      const result = await couponApi.validate(coupon.trim(), total);
      setCouponApplied(true);
      setCouponDiscount(result.discount_amount);
      toast(result.message, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "كود الخصم غير صحيح", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const placeOrder = async () => {
    if (!user) { router.push("/auth/login"); return; }
    if (!merchantId) return;
    setPlacing(true);
    try {
      const order = await orderApi.create({
        merchant_id: merchantId,
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, notes: undefined })),
        payment_method: payMethod,
        order_type: "delivery",
        delivery_notes: notes || undefined,
        coupon_code: couponApplied ? coupon : undefined,
        is_voice_order: false,
      });
      clear();
      toast("تم تأكيد الطلب بنجاح ✓", "success");
      router.push(`/orders/${order.id}`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل تأكيد الطلب", "error");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="pb-24 flex flex-col items-center justify-center min-h-dvh px-6">
        <ShoppingBag size={64} className="text-vox-border mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">السلة فارغة</h2>
        <p className="text-vox-muted text-sm mb-6 text-center">أضف منتجات من أي متجر للبدء</p>
        <Link href="/explore" className="bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl px-8 py-3 text-white font-bold">
          استكشاف المتاجر
        </Link>
        <BottomNav />
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a.id === selectedAddr);

  return (
    <div className="pb-36">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3"
           style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}>
            <ChevronRight size={22} className="text-vox-muted" />
          </button>
          <h1 className="text-white font-black text-lg">سلة التسوق</h1>
          <button onClick={() => { clear(); toast("تم مسح السلة", "info"); }} className="text-red-400 text-xs font-semibold">مسح</button>
        </div>
        <p className="text-vox-muted text-xs text-right mt-1">{merchantName}</p>
      </div>

      {/* Items */}
      <div className="px-4 space-y-2 mb-4">
        {items.map(item => (
          <div key={item.product.id} className="glass-card p-3.5 flex items-center gap-3">
            {/* Product image */}
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-vox-card">
              {item.product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.product.image_url} alt={item.product.name_ar || item.product.name}
                     style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-vox-purple/10 to-vox-blue/10">🍽️</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-right">
              <p className="text-white font-semibold text-sm line-clamp-1">{item.product.name_ar || item.product.name}</p>
              <p className="text-vox-purple text-sm font-bold mt-0.5">
                {(item.product.price * item.quantity).toFixed(2)} ر.س
              </p>
              <p className="text-vox-muted text-xs">{item.product.price} ر.س × {item.quantity}</p>
            </div>

            {/* Qty controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => item.quantity === 1 ? removeItem(item.product.id) : updateQty(item.product.id, item.quantity - 1)}
                className="w-7 h-7 rounded-lg border border-vox-border flex items-center justify-center hover:border-red-500/50 transition-colors"
              >
                {item.quantity === 1 ? <Trash2 size={13} className="text-red-400" /> : <Minus size={13} className="text-white" />}
              </button>
              <span className="text-white font-bold text-sm w-5 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.product.id, item.quantity + 1)}
                className="w-7 h-7 rounded-lg bg-vox-purple flex items-center justify-center"
              >
                <Plus size={13} className="text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery address */}
      {addresses.length > 0 && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowAddrPicker(v => !v)}
            className="w-full glass-card p-4 flex items-center justify-between rounded-2xl"
          >
            <ChevronDown size={16} className={`text-vox-muted transition-transform ${showAddrPicker ? "rotate-180" : ""}`} />
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-white text-sm font-semibold">
                  {selectedAddress ? selectedAddress.label : "اختر عنوان التوصيل"}
                </p>
                {selectedAddress && (
                  <p className="text-vox-muted text-xs mt-0.5 line-clamp-1">{selectedAddress.full_address}</p>
                )}
              </div>
              <MapPin size={16} className="text-vox-purple flex-shrink-0" />
            </div>
          </button>
          {showAddrPicker && (
            <div className="mt-2 space-y-2">
              {addresses.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAddr(a.id); setShowAddrPicker(false); }}
                  className={`w-full p-3 rounded-xl border text-right transition-all ${
                    selectedAddr === a.id ? "border-vox-purple bg-vox-purple/10" : "border-vox-border bg-vox-card/50"
                  }`}
                >
                  <p className="text-white text-sm font-semibold">{a.label}</p>
                  <p className="text-vox-muted text-xs mt-0.5">{a.full_address}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delivery notes */}
      <div className="px-4 mb-4">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="ملاحظات للتوصيل (اختياري) — مثال: اتصل عند الوصول..."
          dir="rtl"
          rows={2}
          className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors resize-none"
        />
      </div>

      {/* Coupon */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={applyCoupon}
            disabled={couponApplied || !coupon.trim() || validatingCoupon}
            className="bg-vox-purple disabled:opacity-40 rounded-xl px-4 py-3 text-white text-sm font-bold flex-shrink-0 transition-opacity"
          >
            {validatingCoupon ? "..." : "تطبيق"}
          </button>
          <div className="flex-1 relative">
            <Tag size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-vox-muted pointer-events-none" />
            <input
              value={coupon}
              onChange={e => setCoupon(e.target.value.toUpperCase())}
              placeholder="كود الخصم"
              disabled={couponApplied}
              dir="ltr"
              className="w-full bg-vox-card border border-vox-border rounded-xl pr-9 pl-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors disabled:opacity-60 tracking-widest"
            />
          </div>
        </div>
        {couponApplied && (
          <p className="text-green-400 text-xs text-right mt-1.5 font-semibold">✓ تم تطبيق خصم 10%</p>
        )}
      </div>

      {/* Payment method */}
      <div className="px-4 mb-4">
        <h3 className="text-white font-bold text-sm text-right mb-2">طريقة الدفع</h3>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.v} onClick={() => setPayMethod(pm.v)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                payMethod === pm.v
                  ? "bg-vox-purple border-vox-purple text-white"
                  : "border-vox-border text-vox-muted hover:border-vox-purple/40"
              }`}>
              <span className="text-lg">{pm.label}</span>
              <span className="text-[10px]">{pm.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 mb-4">
        <div className="glass-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white">{total.toFixed(2)} ر.س</span>
            <span className="text-vox-muted">المنتجات ({items.reduce((s, i) => s + i.quantity, 0)})</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white">{deliveryFee.toFixed(2)} ر.س</span>
            <span className="text-vox-muted">التوصيل</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white">{taxAmount.toFixed(2)} ر.س</span>
            <span className="text-vox-muted">الضريبة 15%</span>
          </div>
          {couponApplied && couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-400">-{couponDiscount.toFixed(2)} ر.ي</span>
              <span className="text-vox-muted">كوبون خصم</span>
            </div>
          )}
          <div className="border-t border-vox-border pt-2 flex justify-between font-bold">
            <span className="text-vox-purple text-lg">{grandTotal.toFixed(2)} ر.س</span>
            <span className="text-white">الإجمالي</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-20 left-4 right-4 max-w-[430px] mx-auto z-50">
        <button
          onClick={placeOrder}
          disabled={placing}
          className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-4 font-bold text-white text-base glow-purple disabled:opacity-50 transition-opacity"
        >
          {placing ? "جارٍ تأكيد الطلب..." : `تأكيد الطلب · ${grandTotal.toFixed(2)} ر.س`}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
